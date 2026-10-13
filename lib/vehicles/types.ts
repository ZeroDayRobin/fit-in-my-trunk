// Datenformat der Fahrzeugdatenbank (data/vehicles/*.json).
// Erzeugt von scripts/build-vehicle-data.mjs aus den recherchierten Rohdaten in data/research/.
// Maße in Millimetern, Volumen in Litern (VDA). null = nicht offiziell veröffentlicht/gefunden.

import type { BodyType } from "../cars";

export type Powertrain = "petrol" | "diesel" | "mhev" | "hev" | "phev" | "bev" | "cng" | "lpg" | "fcev";

export interface Source {
  url: string;
  what: string;
}

export interface LoadSpace {
  lengthMm: number | null;
  widthMm: number | null;
  widthBetweenArchesMm: number | null;
  heightMm: number | null;
  openingHeightMm: number | null;
  sillHeightMm: number | null;
  lengthFoldedMm: number | null;
  source: string;
}

export interface VariantData {
  id: string;
  name: string;
  powertrain: Powertrain;
  powerPs: number | null;
  awd: boolean;
  trunkL: number | null;
  trunkFoldedL: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  notes: string;
}

export interface GenerationData {
  id: string;
  name: string;
  yearFrom: number;
  yearTo: number | null;
  bodyType: BodyType;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  wheelbaseMm: number | null;
  trunkL: number | null;
  trunkFoldedL: number | null;
  loadSpace: LoadSpace | null;
  variants: VariantData[];
  sources: Source[];
  confidence: "high" | "medium" | "low";
  /** Ergebnis der unabhängigen Gegenprüfung */
  verification: { checked: number; confirmed: number; corrected: number };
  notes: string;
}

export interface ModelData {
  id: string;
  name: string;
  generations: GenerationData[];
}

export interface BrandData {
  id: string;
  name: string;
  models: ModelData[];
}

export interface BrandIndexEntry {
  id: string;
  name: string;
  /** Rang laut KBA-Neuzulassungen 2025 (Seat und Cupra werden vom KBA gemeinsam gezählt) */
  kbaRank: number;
  models: { id: string; name: string; bodyType: BodyType; yearFrom: number; yearTo: number | null }[];
}

export interface CatalogIndex {
  generatedAt: string;
  brands: BrandIndexEntry[];
}
