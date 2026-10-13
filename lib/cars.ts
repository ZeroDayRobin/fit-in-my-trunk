// Fahrzeugdaten. Alle Maße in Metern (1 Einheit in der 3D-Szene = 1 m).
// Das Auto steht entlang der Z-Achse: Front bei -Z, Heck bei +Z.

export type CarId = "compact" | "wagon" | "suv";
export type BodyStyle = "hatchback" | "wagon" | "suv";

export interface CarModel {
  id: CarId;
  name: string;
  segment: string;
  style: BodyStyle;
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
    roofEnd: number; // Abstand Heck → Dachhinterkante (Heckklappen-Scharnier)
    rearBeltInset: number; // Abstand Heck → Heckscheiben-Unterkante
  };
  /** Nutzbarer Kofferraum als Quader */
  trunk: {
    width: number;
    height: number;
    depth: number;
    floorY: number; // Ladeboden-Höhe über Grund
    rearInset: number; // Abstand Fahrzeugheck → Kofferraum-Rückwand
    foldExtension: number; // zusätzliche Tiefe bei umgeklappter Rückbank
  };
  defaultPaint: string;
}

export const CARS: CarModel[] = [
  {
    id: "compact",
    name: "Kompaktwagen",
    segment: "Kompaktklasse · Fließheck",
    style: "hatchback",
    length: 4.28,
    width: 1.79,
    height: 1.46,
    wheelbase: 2.62,
    frontOverhang: 0.89,
    wheelRadius: 0.32,
    groundClearance: 0.15,
    body: {
      beltline: 0.98,
      rearBeltline: 1.02,
      noseHeight: 0.7,
      cowl: 1.05,
      roofStart: 1.95,
      roofEnd: 0.32,
      rearBeltInset: 0.06,
    },
    trunk: {
      width: 1.0,
      height: 0.48,
      depth: 0.8,
      floorY: 0.7,
      rearInset: 0.16,
      foldExtension: 0.82,
    },
    defaultPaint: "nachtblau",
  },
  {
    id: "wagon",
    name: "Kombi",
    segment: "Mittelklasse · Variant",
    style: "wagon",
    length: 4.77,
    width: 1.83,
    height: 1.5,
    wheelbase: 2.79,
    frontOverhang: 0.92,
    wheelRadius: 0.33,
    groundClearance: 0.15,
    body: {
      beltline: 0.98,
      rearBeltline: 1.0,
      noseHeight: 0.7,
      cowl: 1.1,
      roofStart: 2.0,
      roofEnd: 0.13,
      rearBeltInset: 0.05,
    },
    trunk: {
      width: 1.05,
      height: 0.58,
      depth: 1.05,
      floorY: 0.72,
      rearInset: 0.11,
      foldExtension: 0.95,
    },
    defaultPaint: "mondsilber",
  },
  {
    id: "suv",
    name: "SUV",
    segment: "Kompakt-SUV · 5 Sitze",
    style: "suv",
    length: 4.51,
    width: 1.86,
    height: 1.66,
    wheelbase: 2.68,
    frontOverhang: 0.93,
    wheelRadius: 0.37,
    groundClearance: 0.2,
    body: {
      beltline: 1.1,
      rearBeltline: 1.12,
      noseHeight: 0.86,
      cowl: 1.12,
      roofStart: 1.98,
      roofEnd: 0.2,
      rearBeltInset: 0.06,
    },
    trunk: {
      width: 1.05,
      height: 0.64,
      depth: 0.92,
      floorY: 0.8,
      rearInset: 0.14,
      foldExtension: 0.88,
    },
    defaultPaint: "salbei",
  },
];

export const CAR_BY_ID: Record<CarId, CarModel> = Object.fromEntries(CARS.map((c) => [c.id, c])) as Record<CarId, CarModel>;

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

/** Kofferraum-Volumen in Litern */
export function trunkLiters(car: CarModel, folded: boolean): number {
  const depth = car.trunk.depth + (folded ? car.trunk.foldExtension : 0);
  return Math.round(car.trunk.width * car.trunk.height * depth * 1000);
}
