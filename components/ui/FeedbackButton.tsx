"use client";

import { useEffect, useRef, useState } from "react";
import { useSim } from "@/lib/store";
import { cx, panel } from "./styles";

type Status = "idle" | "sending" | "sent" | "error";

const ERRORS: Record<string, string> = {
  not_configured: "Der Nachrichtenversand ist noch nicht eingerichtet.",
  rate_limited: "Zu viele Nachrichten – bitte versuche es später noch einmal.",
  invalid_email: "Bitte gib eine gültige E-Mail-Adresse an (oder lass das Feld leer).",
  message_too_short: "Bitte schreib eine etwas längere Nachricht.",
};

/** Schwebender Button unten rechts: Nachricht an den Entwickler senden */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cx(
          panel,
          "pointer-events-auto fixed bottom-[calc(224px+env(safe-area-inset-bottom))] right-4 z-10 flex min-h-11 items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-semibold text-neutral-800 transition hover:scale-[1.03] lg:bottom-6 lg:right-6 dark:text-neutral-100",
        )}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M4 5h16v11H8l-4 4z" />
          <path d="M8 9h8M8 12h5" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Nachricht an den Entwickler</span>
        <span className="sm:hidden">Feedback</span>
      </button>
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const info = useSim((s) => s.info);
  const items = useSim((s) => s.items.length);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [withContext, setWithContext] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textarea.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const context = info ? `${info.brand} ${info.model} ${info.variant} (MJ ${info.year}), ${items} Gepäckstücke` : "";

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, name, email, website, context: withContext ? context : "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "unknown");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(ERRORS[(err as Error).message] ?? "Die Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut.");
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/25 p-3 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
        className={cx(panel, "w-full max-w-md rounded-3xl bg-white/95 p-5 dark:bg-neutral-900/95")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="feedback-title" className="text-[16px] font-semibold text-neutral-900 dark:text-white">
              Nachricht an den Entwickler
            </h2>
            <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
              Fehler gefunden, Fahrzeug fehlt oder eine Idee? Schreib mir!
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {status === "sent" ? (
          <div className="mt-6 pb-2 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <p className="mt-3 text-[14px] font-semibold text-neutral-900 dark:text-white">Danke für deine Nachricht!</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white dark:bg-white dark:text-neutral-900"
            >
              Schließen
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="mt-4 space-y-2.5">
            <textarea
              ref={textarea}
              required
              minLength={3}
              maxLength={4000}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Deine Nachricht …"
              className="w-full resize-y rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Name (optional)"
                autoComplete="name"
                className="rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={200}
                placeholder="E-Mail für Antwort (optional)"
                autoComplete="email"
                className="rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100"
              />
            </div>
            {/* Honeypot gegen Spam-Bots – für Menschen unsichtbar */}
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              name="website"
            />
            {context && (
              <label className="flex items-center gap-2 text-[12px] text-neutral-600 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={withContext}
                  onChange={(e) => setWithContext(e.target.checked)}
                  className="h-4 w-4 accent-sky-500"
                />
                Aktuelles Fahrzeug mitsenden ({context})
              </label>
            )}
            {status === "error" && <p className="text-[12px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[10.5px] leading-snug text-neutral-400">Name und E-Mail werden nur zur Beantwortung verwendet.</p>
              <button
                type="submit"
                disabled={status === "sending" || message.trim().length < 3}
                className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              >
                {status === "sending" ? "Senden …" : "Senden"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
