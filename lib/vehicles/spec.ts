// Erzeugt aus offiziellen Fahrzeugdaten (Außenmaße, VDA-Kofferraumvolumen) die 3D-Beschreibung
// für Szene und Pack-Logik. Wo der Hersteller keine Laderaum-Innenmaße veröffentlicht, wird die
// Laderaum-Box aus dem VDA-Volumen und typischen Proportionen der Karosserieform geschätzt.

import { hasTrunkLid, type BodyType, type CarModel } from "../cars";
import type { BrandData, GenerationData, ModelData, Source, VariantData } from "./types";

/** Jüngstes Modelljahr in der Auswahl */
export const CURRENT_YEAR = 2026;
/** Ältestes Modelljahr in der Auswahl */
export const OLDEST_YEAR = 2020;

interface StyleParams {
  belt: number; // Fensterlinie relativ zur Höhe
  rearRise: number; // Anstieg der Fensterlinie zum Heck (m)
  noseDrop: number; // Fensterlinie → Oberkante Front (m)
  cowl: number; // Windschutzscheiben-Fuß, Anteil der Länge ab Front
  roofStart: number; // Dachvorderkante, Anteil der Länge ab Front
  roofEnd: number; // Dachhinterkante, Anteil der Länge ab Heck
  rearBeltInset: number; // Heckscheiben-Unterkante bzw. Deckel-Vorderkante, Anteil der Länge ab Heck
  gc: number; // Bodenfreiheit (m)
  floor: number; // typische Ladeboden-Höhe (m)
  trunkH: number; // typische Laderaumhöhe relativ zur Fahrzeughöhe
  maxDepth: number; // maximale Laderaumtiefe (m)
  rearInset: number; // Heck → Kofferraum-Rückwand (m)
}

const STYLE: Record<BodyType, StyleParams> = {
  hatchback: {
    belt: 0.66,
    rearRise: 0.04,
    noseDrop: 0.28,
    cowl: 0.245,
    roofStart: 0.455,
    roofEnd: 0.075,
    rearBeltInset: 0.014,
    gc: 0.15,
    floor: 0.62,
    trunkH: 0.33,
    maxDepth: 1.0,
    rearInset: 0.14,
  },
  wagon: {
    belt: 0.655,
    rearRise: 0.02,
    noseDrop: 0.28,
    cowl: 0.23,
    roofStart: 0.42,
    roofEnd: 0.028,
    rearBeltInset: 0.01,
    gc: 0.15,
    floor: 0.6,
    trunkH: 0.39,
    maxDepth: 1.25,
    rearInset: 0.1,
  },
  suv: {
    belt: 0.665,
    rearRise: 0.02,
    noseDrop: 0.25,
    cowl: 0.25,
    roofStart: 0.44,
    roofEnd: 0.045,
    rearBeltInset: 0.013,
    gc: 0.19,
    floor: 0.72,
    trunkH: 0.39,
    maxDepth: 1.2,
    rearInset: 0.13,
  },
  "suv-coupe": {
    belt: 0.665,
    rearRise: 0.03,
    noseDrop: 0.25,
    cowl: 0.25,
    roofStart: 0.44,
    roofEnd: 0.16,
    rearBeltInset: 0.016,
    gc: 0.18,
    floor: 0.72,
    trunkH: 0.33,
    maxDepth: 1.1,
    rearInset: 0.14,
  },
  sedan: {
    belt: 0.68,
    rearRise: 0.04,
    noseDrop: 0.3,
    cowl: 0.26,
    roofStart: 0.44,
    roofEnd: 0.26,
    rearBeltInset: 0.11,
    gc: 0.14,
    floor: 0.6,
    trunkH: 0.3,
    maxDepth: 1.1,
    rearInset: 0.12,
  },
  coupe: {
    belt: 0.7,
    rearRise: 0.04,
    noseDrop: 0.32,
    cowl: 0.29,
    roofStart: 0.47,
    roofEnd: 0.28,
    rearBeltInset: 0.1,
    gc: 0.13,
    floor: 0.62,
    trunkH: 0.27,
    maxDepth: 1.0,
    rearInset: 0.12,
  },
  convertible: {
    belt: 0.7,
    rearRise: 0.04,
    noseDrop: 0.32,
    cowl: 0.29,
    roofStart: 0.47,
    roofEnd: 0.28,
    rearBeltInset: 0.1,
    gc: 0.13,
    floor: 0.62,
    trunkH: 0.26,
    maxDepth: 0.95,
    rearInset: 0.12,
  },
  van: {
    belt: 0.53,
    rearRise: 0,
    noseDrop: 0.2,
    cowl: 0.12,
    roofStart: 0.2,
    roofEnd: 0.02,
    rearBeltInset: 0.007,
    gc: 0.17,
    floor: 0.6,
    trunkH: 0.5,
    maxDepth: 1.35,
    rearInset: 0.1,
  },
};

/** Typische Werte, falls ein Wert in der Datenbank fehlt */
const FALLBACK: Record<BodyType, { lengthMm: number; widthMm: number; heightMm: number; trunkL: number }> = {
  hatchback: { lengthMm: 4280, widthMm: 1790, heightMm: 1460, trunkL: 380 },
  wagon: { lengthMm: 4750, widthMm: 1830, heightMm: 1490, trunkL: 600 },
  suv: { lengthMm: 4500, widthMm: 1850, heightMm: 1650, trunkL: 550 },
  "suv-coupe": { lengthMm: 4500, widthMm: 1850, heightMm: 1600, trunkL: 480 },
  sedan: { lengthMm: 4750, widthMm: 1820, heightMm: 1450, trunkL: 480 },
  coupe: { lengthMm: 4600, widthMm: 1840, heightMm: 1380, trunkL: 380 },
  convertible: { lengthMm: 4600, widthMm: 1840, heightMm: 1380, trunkL: 300 },
  van: { lengthMm: 4900, widthMm: 1940, heightMm: 1900, trunkL: 650 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface CarInfo {
  brand: string;
  model: string;
  generation: string;
  variant: string;
  year: number;
  bodyType: BodyType;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  wheelbaseMm: number | null;
  trunkL: number | null;
  trunkFoldedL: number | null;
  /** Laderaum-Box der Simulation */
  box: {
    widthCm: number;
    heightCm: number;
    depthCm: number;
    foldedDepthCm: number | null;
    estimated: boolean;
    /** measured = alle drei Innenmaße gemessen, partial = teilweise, estimated = aus VDA-Volumen geschätzt */
    basis: "measured" | "partial" | "estimated";
    /** Herkunft gemessener Innenmaße, z. B. "Hersteller" oder "ADAC-Messung" */
    sourceLabel: string;
  };
  sources: Source[];
  confidence: GenerationData["confidence"];
  verification: GenerationData["verification"];
  notes: string;
}

export interface VehicleSelection {
  brandId: string;
  modelId: string;
  generationId: string;
  variantId: string;
  year: number;
}

export function buildCarSpec(
  brand: BrandData,
  model: ModelData,
  gen: GenerationData,
  variant: VariantData,
  year: number,
): { car: CarModel; info: CarInfo } {
  const style = gen.bodyType;
  let P = STYLE[style];
  const fb = FALLBACK[style];

  const lengthMm = variant.lengthMm ?? gen.lengthMm;
  const widthMm = variant.widthMm ?? gen.widthMm;
  const heightMm = variant.heightMm ?? gen.heightMm;
  const L = (lengthMm ?? fb.lengthMm) / 1000;
  const W = (widthMm ?? fb.widthMm) / 1000;
  const H = (heightMm ?? fb.heightMm) / 1000;
  const wb = gen.wheelbaseMm ? gen.wheelbaseMm / 1000 : L * 0.61;
  // Kompakte Vans (Touran, Sportsvan, Active Tourer …) haben eine normale Motorhaube statt Bus-Front
  if (style === "van" && H < 1.8)
    P = {
      ...P,
      belt: 0.6,
      noseDrop: 0.26,
      cowl: 0.21,
      roofStart: 0.36,
      roofEnd: 0.03,
      rearBeltInset: 0.01,
      gc: 0.15,
      floor: 0.62,
      trunkH: 0.45,
      maxDepth: 1.15,
    };

  let r = clamp(0.29 + 0.11 * (H - 1.4) + 0.025 * (L - 4.2), 0.29, 0.4);
  if (style === "suv" || style === "suv-coupe") r = clamp(r + 0.015, 0.3, 0.41);
  if (style === "van") r = clamp(r, 0.31, 0.36);
  const frontOverhang = (L - wb) * 0.52;

  const beltline = H * P.belt;
  const rearBeltline = beltline + P.rearRise;
  const body = {
    beltline,
    rearBeltline,
    noseHeight: beltline - P.noseDrop,
    cowl: L * P.cowl,
    roofStart: L * P.roofStart,
    roofEnd: L * P.roofEnd,
    rearBeltInset: L * P.rearBeltInset,
  };

  // --- Laderaum-Box -------------------------------------------------------
  const trunkL = variant.trunkL ?? gen.trunkL;
  const trunkFoldedL = variant.trunkFoldedL ?? gen.trunkFoldedL;
  const liters = trunkL ?? fb.trunkL;
  const ls = gen.loadSpace;

  // Ladeboden: aus der gemessenen Ladekantenhöhe (Boden liegt meist knapp darunter), sonst typisch für die Karosserieform
  const sill = ls?.sillHeightMm && ls.sillHeightMm > 400 && ls.sillHeightMm < 1100 ? ls.sillHeightMm / 1000 : null;
  const floorY = clamp(sill ? sill - 0.03 : P.floor + (r - 0.32) * 0.8, Math.max(0.45, P.gc + 0.3), 0.95);
  const roofRearY = H - 0.06;
  const heightMax = hasTrunkLid(style) ? rearBeltline - 0.03 - floorY : roofRearY - 0.14 - floorY;

  let width = clamp(W - 0.78, 0.86, 1.24);
  let height = clamp(H * P.trunkH, 0.26, Math.min(heightMax, 1.15));
  let depth: number;

  // Gemessene Innenmaße (Hersteller oder ADAC) haben Vorrang vor der Schätzung
  const lsWidth = ls?.widthBetweenArchesMm ?? ls?.widthMm ?? null;
  const lsHeight = ls?.heightMm ?? ls?.openingHeightMm ?? null;
  const usedW = Boolean(lsWidth && lsWidth > 600 && lsWidth < 1600);
  let usedH = Boolean(lsHeight && lsHeight > 250 && lsHeight < 1400);
  const usedD = Boolean(ls?.lengthMm && ls.lengthMm > 300 && ls.lengthMm < 2000);
  if (usedW) width = lsWidth! / 1000;
  if (usedH) height = Math.min(lsHeight! / 1000, Math.max(heightMax, 0.3));
  if (usedD) {
    depth = ls!.lengthMm! / 1000;
    // Maximalmaße ergeben oft mehr als das VDA-Volumen – ohne gemessene Höhe diese aus dem Volumen ableiten
    if (!usedH) height = clamp(liters / 1000 / (width * depth), 0.26, Math.max(heightMax, 0.3));
    // Unplausibel große Box (über 140 % VDA): Höhe begrenzen
    if (trunkL && width * height * depth * 1000 > trunkL * 1.4) {
      height = clamp((trunkL * 1.25) / 1000 / (width * depth), 0.26, height);
      usedH = false;
    }
  } else {
    depth = liters / 1000 / (width * height);
    if (depth > P.maxDepth) {
      depth = P.maxDepth;
      if (!usedH) height = clamp(liters / 1000 / (width * depth), 0.26, Math.max(heightMax, 0.3));
    }
    depth = clamp(depth, 0.35, P.maxDepth);
  }
  const measured = [usedW, usedH, usedD].filter(Boolean).length;
  const estimated = measured < 3;
  const basis: CarInfo["box"]["basis"] = measured === 3 ? "measured" : measured > 0 ? "partial" : "estimated";
  const sourceLabel = measured > 0 ? ls?.source || "Hersteller" : "";

  let foldExtension = 0;
  if (trunkFoldedL && trunkFoldedL > liters) {
    foldExtension =
      ls?.lengthFoldedMm && ls.lengthFoldedMm / 1000 > depth + 0.2
        ? ls.lengthFoldedMm / 1000 - depth
        : clamp(((trunkFoldedL - liters) / 1000 / (width * height)) * 0.55, 0.4, 1.3);
    foldExtension = Math.min(foldExtension, wb * 0.45);
  }

  const car: CarModel = {
    id: `${brand.id}/${model.id}/${gen.id}/${variant.id}`,
    name: `${brand.name} ${model.name} ${variant.name}`,
    style,
    length: L,
    width: W,
    height: H,
    wheelbase: wb,
    frontOverhang,
    wheelRadius: r,
    groundClearance: P.gc,
    body,
    trunk: { width, height, depth, floorY, rearInset: P.rearInset, foldExtension },
  };

  const cm = (m: number) => Math.round(m * 100);
  const info: CarInfo = {
    brand: brand.name,
    model: model.name,
    generation: gen.name,
    variant: variant.name,
    year,
    bodyType: style,
    lengthMm,
    widthMm,
    heightMm,
    wheelbaseMm: gen.wheelbaseMm,
    trunkL,
    trunkFoldedL,
    box: {
      widthCm: cm(width),
      heightCm: cm(height),
      depthCm: cm(depth),
      foldedDepthCm: foldExtension > 0 ? cm(depth + foldExtension) : null,
      estimated,
      basis,
      sourceLabel,
    },
    sources: gen.sources,
    confidence: gen.confidence,
    verification: gen.verification,
    notes: [gen.notes, variant.notes].filter(Boolean).join(" "),
  };

  return { car, info };
}

// ---------------------------------------------------------------------------
// Auswahl-Hilfen

export const genYearTo = (g: GenerationData) => g.yearTo ?? CURRENT_YEAR;

export interface YearOption {
  key: string;
  year: number;
  generationId: string;
  label: string;
}

/** Modelljahre (neueste zuerst). Überschneiden sich zwei Generationen in einem Jahr, gibt es je Generation einen Eintrag. */
export function yearOptions(model: ModelData): YearOption[] {
  const out: YearOption[] = [];
  for (let year = CURRENT_YEAR; year >= OLDEST_YEAR; year--) {
    const gens = model.generations.filter((g) => g.yearFrom <= year && genYearTo(g) >= year);
    for (const g of gens) {
      out.push({ key: `${year}:${g.id}`, year, generationId: g.id, label: gens.length > 1 ? `${year} · ${g.name}` : `${year}` });
    }
  }
  return out;
}

export function variantsFor(gen: GenerationData, year: number): VariantData[] {
  const matching = gen.variants.filter((v) => (v.yearFrom ?? -Infinity) <= year && (v.yearTo ?? Infinity) >= year);
  return matching.length ? matching : gen.variants;
}

/** Standard-Auswahl für ein Modell: neuestes Modelljahr, erste Variante */
export function defaultSelection(brand: BrandData, model: ModelData): VehicleSelection | null {
  const opt = yearOptions(model)[0];
  if (!opt) return null;
  const gen = model.generations.find((g) => g.id === opt.generationId)!;
  const variant = variantsFor(gen, opt.year)[0];
  if (!variant) return null;
  return { brandId: brand.id, modelId: model.id, generationId: gen.id, variantId: variant.id, year: opt.year };
}

export function resolveSelection(brand: BrandData, sel: VehicleSelection) {
  const model = brand.models.find((m) => m.id === sel.modelId);
  const gen = model?.generations.find((g) => g.id === sel.generationId);
  const variant = gen?.variants.find((v) => v.id === sel.variantId);
  if (!model || !gen || !variant) return null;
  return { model, gen, variant };
}
