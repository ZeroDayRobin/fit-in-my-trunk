// Nachricht an den Entwickler. Die Zieladresse bleibt serverseitig (Umgebungsvariablen), sie
// erscheint nie im Browser. Unterstützte Kanäle (mindestens einer muss konfiguriert sein):
//
//   E-Mail über Resend:  RESEND_API_KEY, FEEDBACK_EMAIL_TO, optional FEEDBACK_EMAIL_FROM
//   Webhook:             FEEDBACK_WEBHOOK_URL (Discord, Slack oder beliebiger JSON-Endpunkt)

const MAX_MESSAGE = 4000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>(); // einfache Drosselung je IP (pro Server-Instanz)

interface Payload {
  message?: unknown;
  name?: unknown;
  email?: unknown;
  website?: unknown; // Honeypot – Menschen lassen es leer
  context?: unknown;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Bots füllen das versteckte Feld aus → stillschweigend „erfolgreich“
  if (str(body.website, 200)) return Response.json({ ok: true });

  const message = str(body.message, MAX_MESSAGE);
  const name = str(body.name, 100);
  const email = str(body.email, 200);
  const context = str(body.context, 500);
  if (message.length < 3) return Response.json({ ok: false, error: "message_too_short" }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const text = [
    "Neue Nachricht über den Kofferraum-Simulator",
    "",
    message,
    "",
    `Name: ${name || "–"}`,
    `E-Mail: ${email || "–"}`,
    context ? `Kontext: ${context}` : "",
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .trim();

  const { RESEND_API_KEY, FEEDBACK_EMAIL_TO, FEEDBACK_EMAIL_FROM, FEEDBACK_WEBHOOK_URL } = process.env;
  const jobs: Promise<Response>[] = [];

  if (RESEND_API_KEY && FEEDBACK_EMAIL_TO) {
    jobs.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FEEDBACK_EMAIL_FROM || "Kofferraum-Simulator <onboarding@resend.dev>",
          to: FEEDBACK_EMAIL_TO.split(",").map((s) => s.trim()),
          subject: `Kofferraum-Simulator: Nachricht${name ? ` von ${name}` : ""}`,
          text,
          ...(email ? { reply_to: email } : {}),
        }),
      }),
    );
  }

  if (FEEDBACK_WEBHOOK_URL) {
    const discord = /discord(app)?\.com\/api\/webhooks/.test(FEEDBACK_WEBHOOK_URL);
    jobs.push(
      fetch(FEEDBACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discord ? { content: text.slice(0, 1990) } : { text }),
      }),
    );
  }

  if (!jobs.length) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  const results = await Promise.allSettled(jobs);
  const delivered = results.some((r) => r.status === "fulfilled" && r.value.ok);
  if (!delivered) {
    console.error(
      "Feedback konnte nicht zugestellt werden",
      results.map((r) => (r.status === "fulfilled" ? r.value.status : String(r.reason))),
    );
    return Response.json({ ok: false, error: "delivery_failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
