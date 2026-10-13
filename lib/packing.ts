// Reine Geometrie-/Pack-Logik ohne React. Alle Gepäckstücke sind achsenparallele
// Quader (Drehungen nur in 90°-Schritten), dadurch sind Kollisionen exakte AABB-Tests.

import { Euler, Quaternion, Ray, Vector3, Box3 } from "three";
import type { CarModel } from "./cars";
import { LUGGAGE, luggageLiters, type LuggageType } from "./luggage";

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface Item {
  id: string;
  type: LuggageType;
  /** x/z = Mittelpunkt, y = Unterkante */
  position: Vec3;
  quaternion: Quat;
}

export interface Box {
  min: Vec3;
  max: Vec3;
}

export type ItemStatus = "packed" | "outside" | "collision" | "idle";

/** Toleranz für Berührungen (2 mm) */
export const EPS = 0.002;
const SNAP_DISTANCE = 0.04;

export const IDENTITY: Quat = [0, 0, 0, 1];

const round = (v: number) => Math.round(v * 1e4) / 1e4;

// ---------------------------------------------------------------------------
// Grundlagen

export function orientedSize(type: LuggageType, q: Quat): Vec3 {
  const [w, h, d] = LUGGAGE[type].size;
  const v = new Vector3(w, h, d).applyQuaternion(new Quaternion(...q));
  return [round(Math.abs(v.x)), round(Math.abs(v.y)), round(Math.abs(v.z))];
}

export function boxFor(position: Vec3, size: Vec3): Box {
  const [x, y, z] = position;
  return {
    min: [x - size[0] / 2, y, z - size[2] / 2],
    max: [x + size[0] / 2, y + size[1], z + size[2] / 2],
  };
}

export function itemBox(item: Item): Box {
  return boxFor(item.position, orientedSize(item.type, item.quaternion));
}

export function itemLiters(item: Item): number {
  return luggageLiters(item.type);
}

function overlaps1D(aMin: number, aMax: number, bMin: number, bMax: number) {
  return aMin < bMax - EPS && aMax > bMin + EPS;
}

export function footprintOverlap(a: Box, b: Box) {
  return overlaps1D(a.min[0], a.max[0], b.min[0], b.max[0]) && overlaps1D(a.min[2], a.max[2], b.min[2], b.max[2]);
}

export function boxesOverlap(a: Box, b: Box) {
  return footprintOverlap(a, b) && overlaps1D(a.min[1], a.max[1], b.min[1], b.max[1]);
}

export function boxInside(inner: Box, outer: Box) {
  for (let i = 0; i < 3; i++) {
    if (inner.min[i] < outer.min[i] - EPS || inner.max[i] > outer.max[i] + EPS) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fahrzeug-Geometrie

export function trunkBox(car: CarModel, folded: boolean): Box {
  const rearZ = car.length / 2 - car.trunk.rearInset;
  const depth = car.trunk.depth + (folded ? car.trunk.foldExtension : 0);
  const { width, height, floorY } = car.trunk;
  return {
    min: [-width / 2, floorY, rearZ - depth],
    max: [width / 2, floorY + height, rearZ],
  };
}

/** Grundfläche der Karosserie – darüber liegt Gepäck mindestens auf Ladeboden-Höhe. */
export function carFootprint(car: CarModel): Box {
  const hw = car.width / 2 - 0.04;
  return {
    min: [-hw, 0, -car.length / 2 + 0.05],
    max: [hw, car.height, car.length / 2 - 0.01],
  };
}

export interface PackEnv {
  car: CarModel;
  trunk: Box;
  body: Box;
}

export function makeEnv(car: CarModel, folded: boolean): PackEnv {
  return { car, trunk: trunkBox(car, folded), body: carFootprint(car) };
}

// ---------------------------------------------------------------------------
// Schwerkraft / Stapeln

/** Höhe, auf der ein Quader mit dieser Grundfläche zu liegen kommt. */
export function supportHeight(footprint: Box, others: Box[], env: PackEnv): number {
  let y = 0;
  if (footprintOverlap(footprint, env.body)) y = env.car.trunk.floorY;
  for (const o of others) {
    if (footprintOverlap(footprint, o)) y = Math.max(y, o.max[1]);
  }
  return y;
}

/** Lässt alle Gepäckstücke von unten nach oben „fallen“. */
export function settle(items: Item[], env: PackEnv): Item[] {
  const order = [...items].sort((a, b) => a.position[1] - b.position[1] || a.id.localeCompare(b.id));
  const placed: Box[] = [];
  const result = new Map<string, Item>();
  for (const item of order) {
    const size = orientedSize(item.type, item.quaternion);
    const fp = boxFor([item.position[0], 0, item.position[2]], size);
    const y = supportHeight(fp, placed, env);
    const next: Item = { ...item, position: [item.position[0], y, item.position[2]] };
    placed.push(boxFor(next.position, size));
    result.set(item.id, next);
  }
  return items.map((i) => result.get(i.id)!);
}

// ---------------------------------------------------------------------------
// Status / Feedback

export function computeStatuses(items: Item[], env: PackEnv): Record<string, ItemStatus> {
  const boxes = items.map(itemBox);
  const out: Record<string, ItemStatus> = {};
  items.forEach((item, i) => {
    const box = boxes[i];
    const collides = boxes.some((b, j) => j !== i && boxesOverlap(box, b));
    if (collides) out[item.id] = "collision";
    else if (boxInside(box, env.trunk)) out[item.id] = "packed";
    else if (boxesOverlap(box, env.body)) out[item.id] = "outside";
    else out[item.id] = "idle";
  });
  return out;
}

// ---------------------------------------------------------------------------
// Drag & Drop

/** Schnittpunkt des Maus-Strahls mit Boden, Ladeboden oder anderem Gepäck. */
export function pickSurface(ray: Ray, others: Box[], env: PackEnv): Vector3 | null {
  let best: Vector3 | null = null;
  let bestDist = Infinity;
  const consider = (p: Vector3 | null) => {
    if (!p) return;
    const d = p.distanceTo(ray.origin);
    if (d < bestDist) {
      bestDist = d;
      best = p.clone();
    }
  };

  const o = ray.origin;
  const dir = ray.direction;
  if (dir.y < -1e-6) {
    // Boden (y = 0)
    consider(o.clone().addScaledVector(dir, -o.y / dir.y));
    // Ladeboden-Ebene innerhalb der Fahrzeug-Grundfläche
    const floorY = env.car.trunk.floorY;
    const p = o.clone().addScaledVector(dir, (floorY - o.y) / dir.y);
    if (p.x > env.body.min[0] && p.x < env.body.max[0] && p.z > env.body.min[2] && p.z < env.body.max[2]) {
      consider(p);
    }
  }
  const tmp = new Box3();
  const hit = new Vector3();
  for (const b of others) {
    tmp.min.set(...b.min);
    tmp.max.set(...b.max);
    if (ray.intersectBox(tmp, hit)) consider(hit);
  }
  return best;
}

/** Magnetisches Einrasten an Kofferraumwänden und Nachbar-Gepäck. */
export function snapXZ(x: number, z: number, size: Vec3, others: Box[], env: PackEnv): [number, number] {
  const snapAxis = (center: number, half: number, axis: 0 | 2) => {
    const edges = [env.trunk.min[axis], env.trunk.max[axis]];
    for (const o of others) edges.push(o.min[axis], o.max[axis]);
    let best = 0;
    let bestAbs = SNAP_DISTANCE;
    for (const e of edges) {
      for (const delta of [e - (center - half), e - (center + half)]) {
        if (Math.abs(delta) < bestAbs) {
          bestAbs = Math.abs(delta);
          best = delta;
        }
      }
    }
    return center + best;
  };
  return [snapAxis(x, size[0] / 2, 0), snapAxis(z, size[2] / 2, 2)];
}

/** Grenzen, in denen Gepäck bewegt werden darf. */
export function clampToStage(x: number, z: number, env: PackEnv): [number, number] {
  const L = env.car.length;
  return [Math.min(3.2, Math.max(-3.2, x)), Math.min(L / 2 + 3.2, Math.max(-L / 2 - 0.8, z))];
}

// ---------------------------------------------------------------------------
// Drehen

const ROTATE_YAW = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
const ROTATE_TIP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
const ROTATE_ROLL = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);

/** yaw = um die Hochachse drehen, tip = nach vorne/hinten kippen, roll = zur Seite kippen */
export type RotateMode = "yaw" | "tip" | "roll";

export function rotateQuat(q: Quat, mode: RotateMode, direction: 1 | -1 = 1): Quat {
  let rot = (mode === "yaw" ? ROTATE_YAW : mode === "tip" ? ROTATE_TIP : ROTATE_ROLL).clone();
  if (direction === -1) rot = rot.invert();
  const r = rot.multiply(new Quaternion(...q));
  return [r.x, r.y, r.z, r.w];
}

/** Die 6 Ausrichtungen, die unterschiedliche Quader-Abmessungen ergeben. */
export const ORIENTATIONS: Quat[] = (() => {
  const seen = new Set<string>();
  const out: Quat[] = [];
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const base = new Vector3(1, 2, 3);
  for (const ax of angles)
    for (const ay of angles)
      for (const az of angles) {
        const q = new Quaternion().setFromEuler(new Euler(ax, ay, az));
        const v = base.clone().applyQuaternion(q);
        const key = [v.x, v.y, v.z].map((n) => Math.round(Math.abs(n))).join(",");
        if (!seen.has(key)) {
          seen.add(key);
          out.push([q.x, q.y, q.z, q.w]);
        }
      }
  return out;
})();

// ---------------------------------------------------------------------------
// Abstellfläche hinter dem Auto

export function findStagingSpot(size: Vec3, boxes: Box[], env: PackEnv): Vec3 {
  const L = env.car.length;
  const zStart = L / 2 + 0.6;
  const zEnd = L / 2 + 3.0;
  const gap = 0.05;
  const xs: number[] = [];
  for (let x = 0; x <= 1.8; x += 0.05) {
    xs.push(round(x));
    if (x > 0) xs.push(round(-x));
  }
  for (let z = zStart + size[2] / 2; z + size[2] / 2 <= zEnd; z += 0.05) {
    for (const x of xs) {
      const fp: Box = {
        min: [x - size[0] / 2 - gap, 0, z - size[2] / 2 - gap],
        max: [x + size[0] / 2 + gap, 10, z + size[2] / 2 + gap],
      };
      if (!boxes.some((b) => footprintOverlap(fp, b))) return [x, 0, round(z)];
    }
  }
  // Alles voll: auf vorhandenes Gepäck stapeln
  const z = zStart + size[2] / 2;
  const fp = boxFor([0, 0, z], size);
  return [0, supportHeight(fp, boxes, env), z];
}

// ---------------------------------------------------------------------------
// Auto-Pack (Heuristik: Extrempunkte, tiefste Position zuerst, dann zur Rückbank hin)

export interface PackResult {
  items: Item[];
  packedIds: string[];
}

export function autoPack(items: Item[], env: PackEnv): PackResult {
  const t = env.trunk;
  const order = [...items].sort((a, b) => itemLiters(b) - itemLiters(a) || a.id.localeCompare(b.id));
  const placed: Box[] = [];
  const result = new Map<string, Item>();
  const unplaced: Item[] = [];

  for (const item of order) {
    let best: { score: number[]; position: Vec3; q: Quat; size: Vec3 } | null = null;

    for (const q of ORIENTATIONS) {
      const size = orientedSize(item.type, q);
      const [hx, , hz] = [size[0] / 2, size[1] / 2, size[2] / 2];
      if (size[0] > t.max[0] - t.min[0] + EPS || size[1] > t.max[1] - t.min[1] + EPS || size[2] > t.max[2] - t.min[2] + EPS) continue;

      const xs = new Set<number>([round(t.min[0] + hx), round(t.max[0] - hx)]);
      const zs = new Set<number>([round(t.min[2] + hz), round(t.max[2] - hz)]);
      for (const p of placed) {
        xs.add(round(p.max[0] + hx))
          .add(round(p.min[0] - hx))
          .add(round(p.min[0] + hx))
          .add(round(p.max[0] - hx));
        zs.add(round(p.max[2] + hz))
          .add(round(p.min[2] - hz))
          .add(round(p.min[2] + hz))
          .add(round(p.max[2] - hz));
      }

      for (const x of xs) {
        if (x - hx < t.min[0] - EPS || x + hx > t.max[0] + EPS) continue;
        for (const z of zs) {
          if (z - hz < t.min[2] - EPS || z + hz > t.max[2] + EPS) continue;
          const fp = boxFor([x, 0, z], size);
          let y = t.min[1];
          for (const p of placed) if (footprintOverlap(fp, p)) y = Math.max(y, p.max[1]);
          if (y + size[1] > t.max[1] + EPS) continue;
          const score = [Math.round(y * 1000), Math.round(z * 1000), Math.round(x * 1000), Math.round(size[1] * 1000)];
          if (!best || lexLess(score, best.score)) best = { score, position: [x, y, z], q, size };
        }
      }
    }

    if (best) {
      placed.push(boxFor(best.position, best.size));
      result.set(item.id, { ...item, position: best.position, quaternion: best.q });
    } else {
      unplaced.push(item);
    }
  }

  // Was nicht passt, wird aufrecht hinter dem Auto abgestellt
  const staged: Box[] = [...placed];
  for (const item of unplaced) {
    const size = orientedSize(item.type, IDENTITY);
    const position = findStagingSpot(size, staged, env);
    staged.push(boxFor(position, size));
    result.set(item.id, { ...item, position, quaternion: IDENTITY });
  }

  return {
    items: items.map((i) => result.get(i.id)!),
    packedIds: items.filter((i) => !unplaced.includes(i)).map((i) => i.id),
  };
}

function lexLess(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/** Schiebt ein Gepäckstück (x/z) in den Kofferraum zurück, falls es nach dem Drehen übersteht. */
export function clampIntoTrunk(position: Vec3, size: Vec3, env: PackEnv): Vec3 {
  const t = env.trunk;
  const clampAxis = (c: number, half: number, min: number, max: number) => {
    if (half * 2 > max - min) return c;
    return Math.min(max - half, Math.max(min + half, c));
  };
  return [clampAxis(position[0], size[0] / 2, t.min[0], t.max[0]), position[1], clampAxis(position[2], size[2] / 2, t.min[2], t.max[2])];
}
