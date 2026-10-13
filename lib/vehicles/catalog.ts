// Zugriff auf die Fahrzeugdatenbank: kleiner Index (Marken + Modellnamen) sofort,
// die Detaildaten je Marke werden erst bei Bedarf als eigener Chunk geladen.

import indexJson from "@/data/vehicles/index.json";
import { BRAND_LOADERS } from "./loaders";
import { buildCarSpec, defaultSelection, resolveSelection, type VehicleSelection } from "./spec";
import type { BrandData, CatalogIndex } from "./types";

export const CATALOG = indexJson as unknown as CatalogIndex;

/** Standardfahrzeug beim Öffnen der Seite (meistzugelassene Marke, beliebtes Modell) */
export const DEFAULT_VEHICLE = { brandId: "volkswagen", modelName: "Tiguan" };

const cache = new Map<string, Promise<BrandData>>();

export function hasBrandData(brandId: string) {
  return brandId in BRAND_LOADERS;
}

export function loadBrand(brandId: string): Promise<BrandData> {
  const loader = BRAND_LOADERS[brandId];
  if (!loader) return Promise.reject(new Error(`Keine Daten für ${brandId}`));
  let p = cache.get(brandId);
  if (!p) {
    p = loader();
    cache.set(brandId, p);
    p.catch(() => cache.delete(brandId));
  }
  return p;
}

/** Lädt die Marke und baut die 3D-Beschreibung für eine Auswahl. */
export async function resolveVehicle(sel: VehicleSelection) {
  const brand = await loadBrand(sel.brandId);
  const r = resolveSelection(brand, sel);
  if (!r) return null;
  return { selection: sel, ...buildCarSpec(brand, r.model, r.gen, r.variant, sel.year) };
}

/** Standardauswahl eines Modells (neuestes Modelljahr, erste Variante) */
export async function defaultVehicleFor(brandId: string, modelId?: string) {
  const brand = await loadBrand(brandId);
  const model = (modelId && brand.models.find((m) => m.id === modelId)) || brand.models[0];
  if (!model) return null;
  const sel = defaultSelection(brand, model);
  return sel ? resolveVehicle(sel) : null;
}

export async function initialVehicle() {
  const brand = await loadBrand(DEFAULT_VEHICLE.brandId);
  const model = brand.models.find((m) => m.name === DEFAULT_VEHICLE.modelName) ?? brand.models[0];
  return defaultVehicleFor(brand.id, model?.id);
}
