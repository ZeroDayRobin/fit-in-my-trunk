// 3D-Fahrzeugbeschreibung für Szene und Pack-Logik. Alle Maße in Metern (1 Einheit = 1 m).
// Das Auto steht entlang der Z-Achse: Front bei -Z, Heck bei +Z.
// Konkrete Fahrzeuge werden aus den recherchierten Herstellerdaten erzeugt (lib/vehicles/spec.ts).

export type BodyType = "hatchback" | "sedan" | "wagon" | "suv" | "suv-coupe" | "coupe" | "convertible" | "van";

export const BODY_TYPE_LABEL: Record<BodyType, string> = {
  hatchback: "Schrägheck",
  sedan: "Limousine",
  wagon: "Kombi",
  suv: "SUV",
  "suv-coupe": "SUV-Coupé",
  coupe: "Coupé",
  convertible: "Cabrio",
  van: "Van",
};

/** Karosserien mit separatem Kofferraumdeckel statt Heckklappe */
export const hasTrunkLid = (style: BodyType) => style === "sedan" || style === "coupe" || style === "convertible";

export interface CarModel {
  id: string;
  name: string;
  style: BodyType;
  /** Außenmaße & Fahrwerk */
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  frontOverhang: number;
  wheelRadius: number;
  groundClearance: number;
  /** Karosserie-Profil (Abstände ab Fahrzeugfront bzw. -heck) */
  body: {
    beltline: number; // Höhe der Fensterlinie
    rearBeltline: number; // Fensterlinie am Heck
    noseHeight: number; // Oberkante Front
    cowl: number; // Abstand Front → Windschutzscheiben-Fuß
    roofStart: number; // Abstand Front → Dachvorderkante
    roofEnd: number; // Abstand Heck → Dachhinterkante (Heckklappen-Scharnier bzw. Heckscheiben-Oberkante)
    rearBeltInset: number; // Abstand Heck → Heckscheiben-Unterkante bzw. Kofferraumdeckel-Vorderkante
  };
  /** Nutzbarer Kofferraum als Quader */
  trunk: {
    width: number;
    height: number;
    depth: number;
    floorY: number; // Ladeboden-Höhe über Grund
    rearInset: number; // Abstand Fahrzeugheck → Kofferraum-Rückwand
    foldExtension: number; // zusätzliche Tiefe bei umgeklappter Rückbank (0 = nicht klappbar)
  };
}

export interface Paint {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
}

export const PAINTS: Paint[] = [
  { id: "polarweiss", name: "Polarweiß", color: "#e7e7e3", metalness: 0.15, roughness: 0.32 },
  { id: "mondsilber", name: "Mondsilber", color: "#a3a9b0", metalness: 0.75, roughness: 0.3 },
  { id: "graphit", name: "Graphitgrau", color: "#43474d", metalness: 0.7, roughness: 0.32 },
  { id: "tiefschwarz", name: "Tiefschwarz", color: "#121316", metalness: 0.5, roughness: 0.25 },
  { id: "nachtblau", name: "Nachtblau", color: "#1d3452", metalness: 0.7, roughness: 0.28 },
  { id: "salbei", name: "Salbeigrün", color: "#5d6c5c", metalness: 0.55, roughness: 0.34 },
];

export const PAINT_BY_ID: Record<string, Paint> = Object.fromEntries(PAINTS.map((p) => [p.id, p]));

/** Volumen der Laderaum-Box in Litern */
export function trunkLiters(car: CarModel, folded: boolean): number {
  const depth = car.trunk.depth + (folded ? car.trunk.foldExtension : 0);
  return Math.round(car.trunk.width * car.trunk.height * depth * 1000);
}

export const canFoldSeats = (car: CarModel) => car.trunk.foldExtension > 0;
