"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { CAR_BY_ID, CARS, type CarId } from "./cars";
import type { LuggageType } from "./luggage";
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
} from "./packing";

export type ViewName = "rear" | "top" | "side" | "front";
export type Theme = "light" | "dark";

interface SimState {
  carId: CarId;
  paints: Record<CarId, string>;
  seatsFolded: boolean;
  items: Item[];
  selectedId: string | null;
  draggingId: string | null;
  theme: Theme;
  xray: boolean;
  view: { name: ViewName; nonce: number };
  notice: { text: string; nonce: number } | null;

  setCar: (id: CarId) => void;
  setPaint: (paintId: string) => void;
  toggleSeats: () => void;
  addItem: (type: LuggageType) => void;
  removeSelected: () => void;
  clearItems: () => void;
  select: (id: string | null) => void;
  rotateSelected: (mode: "yaw" | "tip") => void;
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

const envOf = (s: Pick<SimState, "carId" | "seatsFolded">) => makeEnv(CAR_BY_ID[s.carId], s.seatsFolded);

export const useSim = create<SimState>((set, get) => ({
  carId: "compact",
  paints: Object.fromEntries(CARS.map((c) => [c.id, c.defaultPaint])) as Record<CarId, string>,
  seatsFolded: false,
  items: [],
  selectedId: null,
  draggingId: null,
  theme: "light",
  xray: true,
  view: { name: "rear", nonce: 0 },
  notice: null,

  setCar: (carId) => {
    if (carId === get().carId) return;
    const env = makeEnv(CAR_BY_ID[carId], get().seatsFolded);
    const { items, packedIds } = autoPack(get().items, env);
    set((s) => ({ carId, items, selectedId: null, view: { name: "rear", nonce: s.view.nonce + 1 } }));
    if (items.length > 0) {
      get().notify(`Gepäck umgeladen: ${packedIds.length} von ${items.length} passen in den ${CAR_BY_ID[carId].name}.`);
    }
  },

  setPaint: (paintId) => set((s) => ({ paints: { ...s.paints, [s.carId]: paintId } })),

  toggleSeats: () => {
    const seatsFolded = !get().seatsFolded;
    const env = envOf({ carId: get().carId, seatsFolded });
    set({ seatsFolded, items: settle(get().items, env) });
  },

  addItem: (type) => {
    const s = get();
    const env = envOf(s);
    const size = orientedSize(type, IDENTITY);
    const position = findStagingSpot(size, s.items.map(itemBox), env);
    const item: Item = { id: nextId(), type, position, quaternion: IDENTITY };
    set({ items: [...s.items, item], selectedId: item.id });
  },

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

  rotateSelected: (mode) => {
    const s = get();
    const target = s.items.find((i) => i.id === s.selectedId);
    if (!target) return;
    const env = envOf(s);
    // Liegt das Teil (teilweise) im Kofferraum, wird es nach dem Drehen wieder hineingeschoben
    const inTrunk = footprintOverlap(itemBox(target), env.trunk);
    const quaternion = rotateQuat(target.quaternion, mode);
    let position = target.position;
    if (inTrunk) position = clampIntoTrunk(position, orientedSize(target.type, quaternion), env);
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
    const size = orientedSize(dragged.type, dragged.quaternion);
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

  setTheme: (theme) => {
    set({ theme });
    try {
      localStorage.setItem("trunk-theme", theme);
    } catch {}
    document.documentElement.classList.toggle("dark", theme === "dark");
  },

  toggleXray: () => set((s) => ({ xray: !s.xray })),

  setView: (name) => set((s) => ({ view: { name, nonce: s.view.nonce + 1 } })),

  notify: (text) => set((s) => ({ notice: { text, nonce: (s.notice?.nonce ?? 0) + 1 } })),
}));

export const useCar = () => useSim((s) => CAR_BY_ID[s.carId]);

export function usePackEnv() {
  const carId = useSim((s) => s.carId);
  const folded = useSim((s) => s.seatsFolded);
  return useMemo(() => makeEnv(CAR_BY_ID[carId], folded), [carId, folded]);
}

export function useStatuses() {
  const env = usePackEnv();
  const items = useSim((s) => s.items);
  return useMemo(() => computeStatuses(items, env), [items, env]);
}
