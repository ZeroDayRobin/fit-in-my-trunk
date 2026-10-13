#!/usr/bin/env node
// Liest die Ergebnisse der Recherche-Workflows (journal.jsonl) aus und schreibt je Paket
// data/research/<id>.json. Danach: npm run data
//
// Aufruf: node scripts/research/extract-results.mjs [workflows-Verzeichnis …]
// Ohne Argument werden alle Workflow-Läufe unter ~/.claude/projects/ durchsucht.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "data/research");
const CHUNK_FILE = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/research/chunks.json"), "utf8"));
const CHUNKS = [...CHUNK_FILE.priority, ...CHUNK_FILE.full];
const BRAND_BY_ID = Object.fromEntries(CHUNKS.map((c) => [c.id, c.brand]));

function findJournals(dirs) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 6 || !fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name === "journal.jsonl" && p.includes(`${path.sep}workflows${path.sep}`)) out.push(p);
    }
  };
  for (const d of dirs) walk(d, 0);
  return out;
}

const dirs = process.argv.slice(2);
const journals = findJournals(dirs.length ? dirs : [path.join(os.homedir(), ".claude/projects")]);
const chunks = {};
for (const j of journals) {
  const lines = fs
    .readFileSync(j, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const labels = {};
  for (const l of lines) if (l.type === "started") labels[l.key] = l.label;
  for (const l of lines) {
    if (l.type !== "result" || !labels[l.key]) continue;
    const [kind, id] = labels[l.key].split(":");
    if (kind !== "collect" && kind !== "verify") continue;
    let r = l.result;
    if (typeof r === "string") {
      try {
        r = JSON.parse(r);
      } catch {
        continue;
      }
    }
    if (!r || (kind === "collect" && !Array.isArray(r.models))) continue;
    chunks[id] ??= { id, brand: BRAND_BY_ID[id] ?? r.models?.[0]?.brand ?? "" };
    chunks[id][kind === "collect" ? "data" : "verification"] = r;
  }
}

fs.mkdirSync(OUT, { recursive: true });
let written = 0;
for (const c of Object.values(chunks)) {
  const file = path.join(OUT, `${c.id}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  const data = c.data?.models?.length ? c.data : prev?.data;
  if (!data?.models?.length) continue;
  const verification = c.verification ?? prev?.verification ?? null;
  fs.writeFileSync(file, JSON.stringify({ id: c.id, brand: c.brand || prev?.brand, data, verification }, null, 1) + "\n");
  written++;
  const gens = data.models.reduce((s, m) => s + m.generations.length, 0);
  console.log(
    `${c.id}: ${data.models.length} Modelle, ${gens} Generationen, Prüfung: ${verification ? `${verification.corrections.length} Korrekturen` : "keine"}`,
  );
}
console.log(`${written} Pakete nach data/research/ geschrieben (aus ${journals.length} Workflow-Läufen).`);
