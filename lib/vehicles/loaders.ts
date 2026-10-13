// Automatisch erzeugt von scripts/build-vehicle-data.mjs – nicht von Hand bearbeiten.
// Jede Marke wird als eigener Chunk erst bei Bedarf geladen.
import type { BrandData } from "./types";

export const BRAND_LOADERS: Record<string, () => Promise<BrandData>> = {
  volkswagen: () => import("@/data/vehicles/volkswagen.json").then((m) => m.default as unknown as BrandData),
  "mercedes-benz": () => import("@/data/vehicles/mercedes-benz.json").then((m) => m.default as unknown as BrandData),
};
