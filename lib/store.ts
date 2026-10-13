"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { canFoldSeats, type BodyType, type CarModel } from "./cars";
import type { CarInfo, VehicleSelection } from "./vehicles/spec";
import { CUSTOM_COLORS, type CustomLuggage, type LuggageType } from "./luggage";
import {
  autoPack,
  boxFor,
  clampIntoTrunk,
  computeStatuses,
  footprintOverlap,
  findStagingSpot,
  IDENTITY,
  itemBox,
  makeEnv,
  orientedSize,
  rotateQuat,
  settle,
  supportHeight,
  type Item,
  type RotateMode,
} from "./packing";

export type ViewName = "rear" | "top" | "side" | "front";
export type Theme = "light" | "dark";

interface SimState {
  /** Aktuell gewähltes Fahrzeug (3D-Beschreibung, offizielle Daten, Auswahl) */
  car: CarModel;
  info: CarInfo | null;
  selection: VehicleSelection | null;
  paintId: string;
  seatsFolded: boolean;
  items: Item[];
  selectedId: string | null;
  draggingId: string | null;
  theme: Theme;
  xray: boolean;
  view: { name: ViewName; nonce: number };
  notice: { text: string; nonce: number } | null;

  setVehicle: (car: CarModel, info: CarInfo, selection: VehicleSelection) => void;
  setPaint: (paintId: string) => void;
  toggleSeats: () => void;
  addItem: (type: LuggageType) => void;
  /** Eigene Gepäckstücke: zuletzt verwendete Vorlagen (für schnelles Wiederhinzufügen) */
  customTemplates: CustomLuggage[];
  addCustomItem: (custom: Omit<CustomLuggage, "color"> & { color?: string }) => void;
  removeCustomTemplate: (index: number) => void;
  removeSelected: () => void;
  clearItems: () => void;
  select: (id: string | null) => void;
  rotateSelected: (mode: RotateMode, direction?: 1 | -1) => void;
  packAll: () => void;
  startDrag: (id: string) => void;
  dragTo: (x: number, z: number) => void;
  endDrag: () => void;
  setTheme: (theme: Theme) => void;
  toggleXray: () => void;
  setView: (name: ViewName) => void;
  notify: (text: string) => void;
}

let idCounter = 0;
const nextId = () => `item-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const envOf = (s: Pick<SimState, "car" | "seatsFolded">) => makeEnv(s.car, s.seatsFolded);

/** Platzhalter bis die Fahrzeugdaten geladen sind (wird nicht angezeigt) */
const PLACEHOLDER_STYLE: BodyType = "hatchback";
const PLACEHOLDER_CAR: CarModel = {
  id: "placeholder",
  name: "",
  style: PLACEHOLDER_STYLE,
  length: 4.3,
  width: 1.8,
  height: 1.5,
  wheelbase: 2.65,
  frontOverhang: 0.86,
  wheelRadius: 0.32,
  groundClearance: 0.15,
  body: { beltline: 0.98, rearBeltline: 1.02, noseHeight: 0.7, cowl: 1.05, roofStart: 1.95, roofEnd: 0.32, rearBeltInset: 0.06 },
  trunk: { width: 1, height: 0.48, depth: 0.8, floorY: 0.62, rearInset: 0.14, foldExtension: 0.8 },
};

export const useSim = create<SimState>((set, get) => ({
  car: PLACEHOLDER_CAR,
  info: null,
  selection: null,
  paintId: "nachtblau",
  seatsFolded: false,
  items: [],
  selectedId: null,
  draggingId: null,
  theme: "light",
  xray: true,
  view: { name: "rear", nonce: 0 },
  notice: null,

  setVehicle: (car, info, selection) => {
    const prev = get();
    if (prev.car.id === car.id) return;
    const seatsFolded = prev.seatsFolded && canFoldSeats(car);
    const { items, packedIds } = autoPack(prev.items, makeEnv(car, seatsFolded));
    set((s) => ({ car, info, selection, seatsFolded, items, selectedId: null, view: { name: "rear", nonce: s.view.nonce + 1 } }));
    if (items.length > 0) {
      get().notify(`Gepäck umgeladen: ${packedIds.length} von ${items.length} passen in den ${info.brand} ${info.model}.`);
    }
  },

  setPaint: (paintId) => set({ paintId }),

  toggleSeats: () => {
    const s = get();
    if (!s.seatsFolded && !canFoldSeats(s.car)) {
      s.notify("Für dieses Fahrzeug ist kein Volumen mit umgeklappter Rückbank bekannt.");
      return;
    }
    const seatsFolded = !s.seatsFolded;
    set({ seatsFolded, items: settle(s.items, makeEnv(s.car, seatsFolded)) });
  },

  addItem: (type) => {
    const s = get();
    const size = orientedSize({ type }, IDENTITY);
    const position = findStagingSpot(size, s.items.map(itemBox), envOf(s));
    const item: Item = { id: nextId(), type, position, quaternion: IDENTITY };
    set({ items: [...s.items, item], selectedId: item.id });
  },

  customTemplates: [],

  addCustomItem: (input) => {
    const s = get();
    const same = s.customTemplates.find((t) => t.name === input.name && t.size.every((v, i) => Math.abs(v - input.size[i]) < 1e-6));
    const custom: CustomLuggage = {
      name: input.name,
      size: input.size,
      color: input.color ?? same?.color ?? CUSTOM_COLORS[s.customTemplates.length % CUSTOM_COLORS.length],
    };
    const size = orientedSize({ type: "custom", custom }, IDENTITY);
    const position = findStagingSpot(size, s.items.map(itemBox), envOf(s));
    const item: Item = { id: nextId(), type: "custom", custom, position, quaternion: IDENTITY };
    const customTemplates = same ? s.customTemplates : [custom, ...s.customTemplates].slice(0, 8);
    set({ items: [...s.items, item], selectedId: item.id, customTemplates });
  },

  removeCustomTemplate: (index) => set((s) => ({ customTemplates: s.customTemplates.filter((_, i) => i !== index) })),

  removeSelected: () => {
    const s = get();
    if (!s.selectedId) return;
    const items = settle(
      s.items.filter((i) => i.id !== s.selectedId),
      envOf(s),
    );
    set({ items, selectedId: null });
  },

  clearItems: () => set({ items: [], selectedId: null, draggingId: null }),

  select: (selectedId) => set({ selectedId }),

  rotateSelected: (mode, direction = 1) => {
    const s = get();
    const target = s.items.find((i) => i.id === s.selectedId);
    if (!target) return;
    const env = envOf(s);
    // Liegt das Teil (teilweise) im Kofferraum, wird es nach dem Drehen wieder hineingeschoben
    const inTrunk = footprintOverlap(itemBox(target), env.trunk);
    const quaternion = rotateQuat(target.quaternion, mode, direction);
    let position = target.position;
    if (inTrunk) position = clampIntoTrunk(position, orientedSize(target, quaternion), env);
    const items = s.items.map((i) => (i.id === target.id ? { ...i, quaternion, position } : i));
    set({ items: settle(items, env) });
  },

  packAll: () => {
    const s = get();
    if (s.items.length === 0) return;
    const { items, packedIds } = autoPack(s.items, envOf(s));
    set({ items, selectedId: null });
    const missing = items.length - packedIds.length;
    get().notify(
      missing === 0
        ? `Alles passt! ${items.length} Gepäckstücke automatisch gepackt.`
        : `${packedIds.length} von ${items.length} gepackt. ${missing} ${missing === 1 ? "Stück passt" : "Stücke passen"} nicht mehr rein.`,
    );
  },

  startDrag: (id) => set({ draggingId: id, selectedId: id }),

  dragTo: (x, z) => {
    const s = get();
    const dragged = s.items.find((i) => i.id === s.draggingId);
    if (!dragged) return;
    const env = envOf(s);
    // Andere Teile fallen nach, wenn das gezogene Teil unter ihnen weggezogen wird
    const others = settle(
      s.items.filter((i) => i.id !== dragged.id),
      env,
    );
    const size = orientedSize(dragged, dragged.quaternion);
    const y = supportHeight(boxFor([x, 0, z], size), others.map(itemBox), env);
    const moved: Item = { ...dragged, position: [x, y, z] };
    const byId = new Map(others.map((o) => [o.id, o]));
    set({ items: s.items.map((i) => (i.id === dragged.id ? moved : byId.get(i.id)!)) });
  },

  endDrag: () => {
    const s = get();
    if (!s.draggingId) return;
    set({ draggingId: null, items: settle(s.items, envOf(s)) });
  },

  // Die Seite startet immer hell; der Umschalter gilt nur für die aktuelle Sitzung
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle("dark", theme === "dark");
  },

  toggleXray: () => set((s) => ({ xray: !s.xray })),

  setView: (name) => set((s) => ({ view: { name, nonce: s.view.nonce + 1 } })),

  notify: (text) => set((s) => ({ notice: { text, nonce: (s.notice?.nonce ?? 0) + 1 } })),
}));

export const useCar = () => useSim((s) => s.car);

export function usePackEnv() {
  const car = useSim((s) => s.car);
  const folded = useSim((s) => s.seatsFolded);
  return useMemo(() => makeEnv(car, folded), [car, folded]);
}

export function useStatuses() {
  const env = usePackEnv();
  const items = useSim((s) => s.items);
  return useMemo(() => computeStatuses(items, env), [items, env]);
}
