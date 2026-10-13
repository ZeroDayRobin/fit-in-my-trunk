// Automatisch erzeugt von scripts/build-vehicle-data.mjs – nicht von Hand bearbeiten.
// Jede Marke wird als eigener Chunk erst bei Bedarf geladen.
import type { BrandData } from "./types";

export const BRAND_LOADERS: Record<string, () => Promise<BrandData>> = {
  "volkswagen": () => import("@/data/vehicles/volkswagen.json").then((m) => m.default as unknown as BrandData),
  "mercedes-benz": () => import("@/data/vehicles/mercedes-benz.json").then((m) => m.default as unknown as BrandData),
  "bmw": () => import("@/data/vehicles/bmw.json").then((m) => m.default as unknown as BrandData),
  "skoda": () => import("@/data/vehicles/skoda.json").then((m) => m.default as unknown as BrandData),
  "audi": () => import("@/data/vehicles/audi.json").then((m) => m.default as unknown as BrandData),
  "seat": () => import("@/data/vehicles/seat.json").then((m) => m.default as unknown as BrandData),
  "cupra": () => import("@/data/vehicles/cupra.json").then((m) => m.default as unknown as BrandData),
  "opel": () => import("@/data/vehicles/opel.json").then((m) => m.default as unknown as BrandData),
  "hyundai": () => import("@/data/vehicles/hyundai.json").then((m) => m.default as unknown as BrandData),
  "toyota": () => import("@/data/vehicles/toyota.json").then((m) => m.default as unknown as BrandData),
};
