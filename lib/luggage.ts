// Gepäck-Typen mit realistischen Normmaßen (Meter).
// size = [Breite (x), Höhe (y), Tiefe (z)] im aufrechten Zustand.

export type LuggageType = "small" | "medium" | "large";

export interface LuggageSpec {
  type: LuggageType;
  name: string;
  description: string;
  size: [number, number, number];
  color: string;
  shortcut: string;
}

export const LUGGAGE: Record<LuggageType, LuggageSpec> = {
  small: {
    type: "small",
    name: "Rucksack",
    description: "Handgepäck",
    size: [0.32, 0.45, 0.22],
    color: "#c8443c",
    shortcut: "1",
  },
  medium: {
    type: "medium",
    name: "Trolley",
    description: "Kabinengröße",
    size: [0.4, 0.55, 0.23],
    color: "#efb233",
    shortcut: "2",
  },
  large: {
    type: "large",
    name: "Reisekoffer",
    description: "Aufgabegepäck",
    size: [0.5, 0.75, 0.3],
    color: "#2f6fd6",
    shortcut: "3",
  },
};

export const LUGGAGE_TYPES: LuggageType[] = ["small", "medium", "large"];

export function luggageLiters(type: LuggageType): number {
  const [w, h, d] = LUGGAGE[type].size;
  return w * h * d * 1000;
}

/** "55 × 40 × 23 cm" (Höhe × Breite × Tiefe, wie bei Kofferangaben üblich) */
export function luggageDimsLabel(type: LuggageType): string {
  const [w, h, d] = LUGGAGE[type].size.map((v) => Math.round(v * 100));
  return `${h} × ${w} × ${d} cm`;
}

// ---------------------------------------------------------------------------
// Eigene Gepäckstücke mit frei wählbaren Maßen

export interface CustomLuggage {
  name: string;
  /** [Breite, Höhe, Tiefe] in Metern */
  size: [number, number, number];
  color: string;
}

/** Farben für eigene Gepäckstücke (abwechselnd vergeben) */
export const CUSTOM_COLORS = ["#14b8a6", "#8b5cf6", "#22a06b", "#ec4899", "#f97316", "#64748b"];

/** Erlaubter Bereich für eigene Maße (cm) */
export const CUSTOM_LIMITS = { min: 5, max: 220 };

/** Name, Maße und Farbe eines Gepäckstücks – Standardtyp oder eigenes */
export function luggageInfo(type: LuggageType | "custom", custom?: CustomLuggage) {
  if (type === "custom" && custom) return { name: custom.name, size: custom.size, color: custom.color };
  const spec = LUGGAGE[type === "custom" ? "medium" : type];
  return { name: spec.name, size: spec.size, color: spec.color };
}
