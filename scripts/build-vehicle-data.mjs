#!/usr/bin/env node
// Baut die Fahrzeugdatenbank der App aus den Rohdaten der Recherche.
//
//   data/research/*.json  (je Recherche-Paket: { id, brand, data, verification })
//     → Korrekturen der unabhängigen Gegenprüfung anwenden
//     → Plausibilität prüfen, IDs vergeben, sortieren
//     → data/vehicles/<marke>.json, data/vehicles/index.json, lib/vehicles/loaders.ts
//
// Aufruf: node scripts/build-vehicle-data.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RESEARCH = path.join(ROOT, "data/research");
const OUT = path.join(ROOT, "data/vehicles");
const LOADERS = path.join(ROOT, "lib/vehicles/loaders.ts");
const OLDEST_YEAR = 2020;

// KBA-Neuzulassungen 2025 (Pressemitteilung Nr. 01/2026). Seat und Cupra zählt das KBA gemeinsam.
const BRANDS = [
  { id: "volkswagen", name: "Volkswagen", kbaRank: 1, aliases: ["vw", "volkswagen"] },
  { id: "mercedes-benz", name: "Mercedes-Benz", kbaRank: 2, aliases: ["mercedes", "mercedes-benz", "mercedesbenz"] },
  { id: "bmw", name: "BMW", kbaRank: 3, aliases: ["bmw"] },
  { id: "skoda", name: "Škoda", kbaRank: 4, aliases: ["skoda", "škoda"] },
  { id: "audi", name: "Audi", kbaRank: 5, aliases: ["audi"] },
  { id: "seat", name: "Seat", kbaRank: 6, aliases: ["seat"] },
  { id: "cupra", name: "Cupra", kbaRank: 6, aliases: ["cupra"] },
  { id: "opel", name: "Opel", kbaRank: 7, aliases: ["opel"] },
  { id: "ford", name: "Ford", kbaRank: 8, aliases: ["ford"] },
  { id: "hyundai", name: "Hyundai", kbaRank: 9, aliases: ["hyundai"] },
  { id: "toyota", name: "Toyota", kbaRank: 10, aliases: ["toyota"] },
];

const BODY_TYPES = new Set(["hatchback", "sedan", "wagon", "suv", "suv-coupe", "coupe", "convertible", "van"]);
const POWERTRAINS = new Set(["petrol", "diesel", "mhev", "hev", "phev", "bev", "cng", "lpg", "fcev"]);

// Plausible Bereiche – Werte außerhalb werden verworfen (null) und gemeldet
const RANGES = {
  lengthMm: [2500, 6000],
  widthMm: [1400, 2300],
  heightMm: [1000, 2300],
  wheelbaseMm: [1800, 3700],
  trunkL: [40, 2500],
  trunkFoldedL: [100, 5000],
  powerPs: [40, 1500],
};

const warnings = [];
const unapplied = [];

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "x";

const brandFor = (name) => {
  const n = norm(name);
  return BRANDS.find((b) => b.aliases.some((a) => norm(a) === n)) ?? BRANDS.find((b) => n.includes(norm(b.aliases[0])));
};

function looseFind(list, key, name) {
  const n = norm(name);
  if (!n) return undefined;
  return list.find((x) => norm(x[key]) === n) ?? list.find((x) => norm(x[key]).includes(n) || n.includes(norm(x[key])));
}

function checkNumber(value, field, ctx) {
  if (value === null || value === undefined || value === "") return null;
  const v = typeof value === "string" ? Number(value.replace(/[^\d.]/g, "")) : value;
  if (typeof v !== "number" || !Number.isFinite(v)) {
    warnings.push(`${ctx}: ${field}=${JSON.stringify(value)} ist keine Zahl → null`);
    return null;
  }
  const range = RANGES[field];
  if (range && (v < range[0] || v > range[1])) {
    warnings.push(`${ctx}: ${field}=${v} außerhalb ${range[0]}–${range[1]} → null`);
    return null;
  }
  return Math.round(v);
}

function setPath(obj, field, value) {
  const parts = field.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (o[parts[i]] == null || typeof o[parts[i]] !== "object") o[parts[i]] = {};
    o = o[parts[i]];
  }
  o[parts.at(-1)] = value;
}

// ---------------------------------------------------------------------------
// 1. Rohdaten laden und Korrekturen anwenden

const files = fs.existsSync(RESEARCH) ? fs.readdirSync(RESEARCH).filter((f) => f.endsWith(".json") && !f.startsWith("_")) : [];
if (!files.length) {
  console.error(`Keine Rohdaten in ${path.relative(ROOT, RESEARCH)} gefunden.`);
  process.exit(1);
}

const rawModels = []; // { brandId, model, chunk }
for (const file of files) {
  const chunk = JSON.parse(fs.readFileSync(path.join(RESEARCH, file), "utf8"));
  const models = chunk.data?.models ?? [];
  const genStats = new Map(); // gen object → { corrected }

  for (const c of chunk.verification?.corrections ?? []) {
    const model = looseFind(models, "model", c.model);
    const gen =
      model && (looseFind(model.generations, "name", c.generation) ?? (model.generations.length === 1 ? model.generations[0] : undefined));
    if (!gen) {
      unapplied.push({ chunk: chunk.id, reason: "Modell/Generation nicht gefunden", ...c });
      continue;
    }
    const field = String(c.field).replace(/^variants?\./, "");
    const isNumeric = typeof c.newValue === "number" || c.newValue === null;
    let target = gen;
    if (c.variant) {
      const variant = looseFind(gen.variants ?? [], "name", c.variant);
      if (!variant) {
        if ((field === "variant" || field === "variants" || field === "missingVariant") && c.newValue && typeof c.newValue === "object") {
          gen.variants = [...(gen.variants ?? []), c.newValue];
          genStats.set(gen, { corrected: (genStats.get(gen)?.corrected ?? 0) + 1 });
        } else {
          unapplied.push({ chunk: chunk.id, reason: "Variante nicht gefunden", ...c });
        }
        continue;
      }
      target = variant;
    }
    if ((field === "variant" || field === "variants") && c.newValue && typeof c.newValue === "object" && !Array.isArray(c.newValue)) {
      gen.variants = [...(gen.variants ?? []), c.newValue];
    } else if (isNumeric || ["yearFrom", "yearTo", "bodyType", "name", "powertrain"].includes(field)) {
      setPath(target, field, c.newValue);
    } else {
      unapplied.push({ chunk: chunk.id, reason: "Feld/Wert nicht automatisch anwendbar", ...c });
      continue;
    }
    gen.sources = [...(gen.sources ?? []), { url: c.sourceUrl, what: `Korrektur ${field}: ${c.evidence ?? ""}`.slice(0, 300) }];
    genStats.set(gen, { corrected: (genStats.get(gen)?.corrected ?? 0) + 1 });
  }

  const v = chunk.verification;
  const confirmRate = v && v.checkedValues ? v.confirmedValues / v.checkedValues : null;
  for (const m of models) {
    for (const g of m.generations ?? []) {
      g.__verification = {
        checked: v?.checkedValues ?? 0,
        confirmed: v?.confirmedValues ?? 0,
        corrected: genStats.get(g)?.corrected ?? 0,
        rate: confirmRate,
      };
    }
    const brand = brandFor(m.brand ?? chunk.brand) ?? brandFor(chunk.brand);
    if (!brand) {
      warnings.push(`${chunk.id}: unbekannte Marke ${m.brand}`);
      continue;
    }
    rawModels.push({ brandId: brand.id, model: m, chunk: chunk.id });
  }
}

// ---------------------------------------------------------------------------
// 2. Normalisieren

function cleanVariant(v, ctx, gen) {
  const name = String(v.name ?? "").trim();
  if (!name) return null;
  const c = `${ctx} / ${name}`;
  let powertrain = String(v.powertrain ?? "").toLowerCase();
  if (!POWERTRAINS.has(powertrain)) {
    warnings.push(`${c}: Antrieb ${v.powertrain} unbekannt → petrol`);
    powertrain = "petrol";
  }
  const trunkL = checkNumber(v.trunkL, "trunkL", c);
  let trunkFoldedL = checkNumber(v.trunkFoldedL, "trunkFoldedL", c);
  if (trunkL && trunkFoldedL && trunkFoldedL <= trunkL) {
    warnings.push(`${c}: umgeklappt (${trunkFoldedL}) ≤ normal (${trunkL}) → umgeklappt verworfen`);
    trunkFoldedL = null;
  }
  return {
    id: "",
    name,
    powertrain,
    powerPs: checkNumber(v.powerPs, "powerPs", c),
    awd: Boolean(v.awd),
    trunkL: trunkL === gen.trunkL ? trunkL : trunkL,
    trunkFoldedL,
    lengthMm: checkNumber(v.lengthMm, "lengthMm", c),
    widthMm: checkNumber(v.widthMm, "widthMm", c),
    heightMm: checkNumber(v.heightMm, "heightMm", c),
    yearFrom: v.yearFrom ? Math.round(v.yearFrom) : null,
    yearTo: v.yearTo ? Math.round(v.yearTo) : null,
    notes: String(v.notes ?? "").trim(),
  };
}

function cleanGeneration(g, ctx) {
  const name = String(g.name ?? "").trim() || `${g.yearFrom}`;
  const c = `${ctx} / ${name}`;
  const yearFrom = Math.round(Number(g.yearFrom));
  const yearTo = g.yearTo == null ? null : Math.round(Number(g.yearTo));
  if (!Number.isFinite(yearFrom)) {
    warnings.push(`${c}: kein Startjahr → verworfen`);
    return null;
  }
  if (yearTo !== null && yearTo < OLDEST_YEAR) return null;
  let bodyType = String(g.bodyType ?? "").toLowerCase();
  if (!BODY_TYPES.has(bodyType)) {
    warnings.push(`${c}: Karosserie ${g.bodyType} unbekannt → hatchback`);
    bodyType = "hatchback";
  }
  const out = {
    id: "",
    name,
    yearFrom,
    yearTo,
    bodyType,
    lengthMm: checkNumber(g.lengthMm, "lengthMm", c),
    widthMm: checkNumber(g.widthMm, "widthMm", c),
    heightMm: checkNumber(g.heightMm, "heightMm", c),
    wheelbaseMm: checkNumber(g.wheelbaseMm, "wheelbaseMm", c),
    trunkL: checkNumber(g.trunkL, "trunkL", c),
    trunkFoldedL: checkNumber(g.trunkFoldedL, "trunkFoldedL", c),
    loadSpace: null,
    variants: [],
    sources: (g.sources ?? [])
      .filter((s) => s && /^https?:\/\//.test(s.url))
      .map((s) => ({ url: s.url, what: String(s.what ?? "").slice(0, 300) })),
    confidence: ["high", "medium", "low"].includes(g.confidence) ? g.confidence : "medium",
    verification: {
      checked: g.__verification?.checked ?? 0,
      confirmed: g.__verification?.confirmed ?? 0,
      corrected: g.__verification?.corrected ?? 0,
    },
    notes: String(g.notes ?? "").trim(),
  };
  if (out.trunkL && out.trunkFoldedL && out.trunkFoldedL <= out.trunkL) {
    warnings.push(`${c}: umgeklappt (${out.trunkFoldedL}) ≤ normal (${out.trunkL}) → umgeklappt verworfen`);
    out.trunkFoldedL = null;
  }
  if (g.loadSpace && typeof g.loadSpace === "object") {
    const ls = g.loadSpace;
    const mm = (v) => {
      const n = checkNumber(v, "loadSpaceMm", c);
      return n && n >= 150 && n <= 3500 ? n : null;
    };
    const loadSpace = {
      lengthMm: mm(ls.lengthMm),
      widthMm: mm(ls.widthMm),
      widthBetweenArchesMm: mm(ls.widthBetweenArchesMm),
      heightMm: mm(ls.heightMm),
      openingHeightMm: mm(ls.openingHeightMm),
      sillHeightMm: mm(ls.sillHeightMm),
      lengthFoldedMm: mm(ls.lengthFoldedMm),
      source: String(ls.source ?? ""),
    };
    if (Object.entries(loadSpace).some(([k, v]) => k !== "source" && v)) out.loadSpace = loadSpace;
  }
  const seen = new Set();
  for (const v of g.variants ?? []) {
    const cv = cleanVariant(v, c, out);
    if (!cv) continue;
    const key = norm(cv.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.variants.push(cv);
  }
  if (!out.variants.length) {
    out.variants.push({
      id: "",
      name: "Alle Motorisierungen",
      powertrain: "petrol",
      powerPs: null,
      awd: false,
      trunkL: null,
      trunkFoldedL: null,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      yearFrom: null,
      yearTo: null,
      notes: "",
    });
  }
  if (!out.sources.length) warnings.push(`${c}: keine Quellen`);
  plausibility(out, c);
  return out;
}

// Günstige Plausibilitätsprüfung statt zweiter Recherche: auffällige Kombinationen melden
function plausibility(g, c) {
  const { lengthMm: L, widthMm: W, heightMm: H, trunkL, trunkFoldedL, bodyType } = g;
  if (L && W && H && trunkL) {
    // Kofferraum in Promille des umbauten Raums (L × B × H)
    const share = (trunkL / ((L / 1000) * (W / 1000) * (H / 1000) * 1000)) * 1000;
    const [lo, hi] = bodyType === "van" ? [30, 220] : bodyType === "convertible" || bodyType === "coupe" ? [20, 80] : [25, 95];
    if (share < lo || share > hi)
      warnings.push(`${c}: Kofferraum ${trunkL} l wirkt im Verhältnis zur Fahrzeuggröße unplausibel (${share.toFixed(0)} ‰)`);
  }
  if (trunkL && trunkFoldedL && bodyType !== "sedan" && bodyType !== "van" && trunkFoldedL / trunkL < 1.6) {
    warnings.push(`${c}: umgeklappt nur ${(trunkFoldedL / trunkL).toFixed(1)}× normal – evtl. Messmethode vertauscht`);
  }
  const base = g.variants.filter((v) => ["petrol", "diesel", "mhev"].includes(v.powertrain) && v.trunkL).map((v) => v.trunkL);
  const maxBase = base.length ? Math.max(...base) : g.trunkL;
  for (const v of g.variants) {
    if (v.powertrain === "phev" && v.trunkL && maxBase && v.trunkL > maxBase) {
      warnings.push(`${c} / ${v.name}: Plug-in-Hybrid hat größeren Kofferraum (${v.trunkL} l) als Verbrenner (${maxBase} l)`);
    }
    if (v.trunkL && g.trunkL && Math.abs(v.trunkL - g.trunkL) / g.trunkL > 0.5) {
      warnings.push(`${c} / ${v.name}: Variante weicht stark vom Generationswert ab (${v.trunkL} vs. ${g.trunkL} l)`);
    }
  }
  if (g.wheelbaseMm && L && (g.wheelbaseMm / L < 0.5 || g.wheelbaseMm / L > 0.72)) {
    warnings.push(`${c}: Radstand ${g.wheelbaseMm} mm passt nicht zur Länge ${L} mm`);
  }
}

const PT_ORDER = ["petrol", "mhev", "diesel", "hev", "phev", "bev", "cng", "lpg", "fcev"];
const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

const brands = new Map(BRANDS.map((b) => [b.id, { id: b.id, name: b.name, models: [] }]));
for (const { brandId, model, chunk } of rawModels) {
  const brand = brands.get(brandId);
  const name = String(model.model ?? "").trim();
  if (!name) continue;
  const ctx = `${brand.name} ${name}`;
  const generations = (model.generations ?? []).map((g) => cleanGeneration(g, ctx)).filter(Boolean);
  if (!generations.length) {
    warnings.push(`${ctx} (${chunk}): keine Generation ab ${OLDEST_YEAR} → verworfen`);
    continue;
  }
  const existing = brand.models.find((m) => norm(m.name) === norm(name));
  if (existing) {
    // Doppelt recherchiert: Generationen zusammenführen (gleicher Name → die mit mehr Varianten behalten)
    for (const g of generations) {
      const dup = existing.generations.find((e) => norm(e.name) === norm(g.name) && e.yearFrom === g.yearFrom);
      if (!dup) existing.generations.push(g);
      else if (g.variants.length > dup.variants.length) existing.generations[existing.generations.indexOf(dup)] = g;
    }
    continue;
  }
  brand.models.push({ id: "", name, generations });
}

for (const brand of brands.values()) {
  brand.models.sort((a, b) => collator.compare(a.name, b.name));
  const modelIds = new Set();
  for (const m of brand.models) {
    let id = slug(m.name);
    while (modelIds.has(id)) id += "-2";
    modelIds.add(id);
    m.id = id;
    m.generations.sort((a, b) => b.yearFrom - a.yearFrom);
    const genIds = new Set();
    for (const g of m.generations) {
      let gid = slug(`${g.yearFrom}-${g.name}`);
      while (genIds.has(gid)) gid += "-2";
      genIds.add(gid);
      g.id = gid;
      g.variants.sort(
        (a, b) =>
          PT_ORDER.indexOf(a.powertrain) - PT_ORDER.indexOf(b.powertrain) ||
          (a.powerPs ?? 0) - (b.powerPs ?? 0) ||
          collator.compare(a.name, b.name),
      );
      const vIds = new Set();
      for (const v of g.variants) {
        let vid = slug(v.name);
        while (vIds.has(vid)) vid += "-2";
        vIds.add(vid);
        v.id = vid;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Schreiben

fs.mkdirSync(OUT, { recursive: true });
const index = { generatedAt: new Date().toISOString().slice(0, 10), brands: [] };
let stats = { models: 0, generations: 0, variants: 0 };
for (const b of BRANDS) {
  const brand = brands.get(b.id);
  const file = path.join(OUT, `${b.id}.json`);
  if (!brand.models.length) {
    // Marke bleibt in der Auswahl sichtbar (Daten folgen), bekommt aber keine Datei
    warnings.push(`${b.name}: keine Modelle`);
    if (fs.existsSync(file)) fs.rmSync(file);
    index.brands.push({ id: b.id, name: b.name, kbaRank: b.kbaRank, models: [] });
    continue;
  }
  fs.writeFileSync(file, JSON.stringify(brand, null, 1) + "\n");
  index.brands.push({
    id: b.id,
    name: b.name,
    kbaRank: b.kbaRank,
    models: brand.models.map((m) => ({
      id: m.id,
      name: m.name,
      bodyType: m.generations[0].bodyType,
      yearFrom: Math.min(...m.generations.map((g) => g.yearFrom)),
      yearTo: m.generations.some((g) => g.yearTo === null) ? null : Math.max(...m.generations.map((g) => g.yearTo)),
    })),
  });
  stats.models += brand.models.length;
  for (const m of brand.models) {
    stats.generations += m.generations.length;
    for (const g of m.generations) stats.variants += g.variants.length;
  }
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1) + "\n");

const loaderLines = index.brands
  .filter((b) => b.models.length)
  .map((b) => `  "${b.id}": () => import("@/data/vehicles/${b.id}.json").then((m) => m.default as unknown as BrandData),`);
fs.writeFileSync(
  LOADERS,
  `// Automatisch erzeugt von scripts/build-vehicle-data.mjs – nicht von Hand bearbeiten.
// Jede Marke wird als eigener Chunk erst bei Bedarf geladen.
import type { BrandData } from "./types";

export const BRAND_LOADERS: Record<string, () => Promise<BrandData>> = {
${loaderLines.join("\n")}
};
`,
);

fs.writeFileSync(path.join(RESEARCH, "_build-report.json"), JSON.stringify({ stats, warnings, unapplied }, null, 1) + "\n");
console.log(`Marken: ${index.brands.length}, Modelle: ${stats.models}, Generationen: ${stats.generations}, Varianten: ${stats.variants}`);
console.log(`Warnungen: ${warnings.length}, nicht angewandte Korrekturen: ${unapplied.length} (siehe data/research/_build-report.json)`);
