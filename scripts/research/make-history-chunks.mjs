#!/usr/bin/env node
// Erzeugt die Recherche-Pakete für Variante B: Vorgängergenerationen (Modelljahre 2005–2019)
// aller Modelle, die schon in data/vehicles/ stehen.
//
// Aufruf: node scripts/research/make-history-chunks.mjs  → scripts/research/chunks-history-2005.json

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const VEHICLES = path.join(ROOT, "data/vehicles");
const OUT = path.join(ROOT, "scripts/research/chunks-history-2005.json");
const YEAR_FROM = 2005;
const PER_CHUNK = 3;

// Modelle ohne gleichnamigen Vorgänger zwischen 2005 und 2019 (neue Baureihen, reine E-Autos).
// Andere Namen gelten nicht als Vorgänger, z. B. Golf Plus, Yeti, Rapid, GLK, ix35, Tiguan Allspace → Tayron.
const NO_PREDECESSOR = {
  volkswagen: [
    "ID.3",
    "ID.4",
    "ID.5",
    "ID.7",
    "ID.7 Tourer",
    "ID. Buzz",
    "ID. Buzz langer Radstand",
    "Taigo",
    "Tayron",
    "T-Cross",
    "T-Roc",
    "T-Roc Cabriolet",
    "Tiguan Allspace",
  ],
  "mercedes-benz": ["A-Klasse Limousine", "GLB", "GLC"],
  bmw: ["iX3", "2er Active Tourer"],
  skoda: ["Elroq", "Enyaq", "Enyaq Coupé", "Kamiq", "Karoq", "Kodiaq", "Scala"],
  audi: ["Q4 e-tron", "Q4 Sportback e-tron", "Q3 Sportback", "A5 Avant"],
  cupra: ["Born", "Formentor", "Tavascan", "Terramar"],
  seat: ["Arona", "Ateca"],
  opel: ["Frontera", "Crossland", "Grandland"],
  ford: ["Explorer", "Puma"],
  hyundai: ["Inster", "Ioniq 5", "Kona"],
  toyota: ["Corolla Cross", "Yaris Cross"],
};

const index = JSON.parse(fs.readFileSync(path.join(VEHICLES, "index.json"), "utf8"));
const chunks = [];
const skipped = [];
for (const b of index.brands) {
  if (!b.models.length) continue;
  const brand = JSON.parse(fs.readFileSync(path.join(VEHICLES, `${b.id}.json`), "utf8"));
  const todo = [];
  for (const m of brand.models) {
    const earliest = Math.min(...m.generations.map((g) => g.yearFrom));
    if (earliest <= YEAR_FROM || (NO_PREDECESSOR[b.id] ?? []).includes(m.name)) {
      skipped.push(`${b.name} ${m.name}`);
      continue;
    }
    todo.push({ name: m.name, existing: m.generations.map((g) => `${g.name} (${g.yearFrom}–${g.yearTo ?? "heute"})`) });
  }
  for (let i = 0; i < todo.length; i += PER_CHUNK) {
    const part = todo.slice(i, i + PER_CHUNK);
    chunks.push({
      id: `h-${b.id}-${i / PER_CHUNK + 1}`,
      brand: b.name,
      history: { yearFrom: YEAR_FROM, yearTo: 2019 },
      models: part.map((m) => m.name),
      existing: Object.fromEntries(part.map((m) => [m.name, m.existing])),
    });
  }
}

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      _comment: `Variante B: Vorgängergenerationen mit Modelljahren ${YEAR_FROM}–2019 für die vorhandenen Modelle. Erzeugt von scripts/research/make-history-chunks.mjs. Erledigt sind die Pakete, für die data/research/<id>.json existiert.`,
      skipped,
      chunks,
    },
    null,
    1,
  ) + "\n",
);
console.log(
  `${chunks.length} Pakete mit ${chunks.reduce((n, c) => n + c.models.length, 0)} Modellen, ${skipped.length} Modelle übersprungen`,
);
