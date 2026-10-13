"use client";

import { trunkLiters } from "@/lib/cars";
import { itemLiters } from "@/lib/packing";
import { useCar, useSim, useStatuses } from "@/lib/store";
import { cx, panel, sectionLabel } from "./styles";

/** Zähler oben rechts: gepackte Gepäckstücke und genutztes Volumen. */
export function StatsPanel() {
  const car = useCar();
  const folded = useSim((s) => s.seatsFolded);
  const items = useSim((s) => s.items);
  const statuses = useStatuses();

  const packed = items.filter((i) => statuses[i.id] === "packed");
  const usedLiters = Math.round(packed.reduce((sum, i) => sum + itemLiters(i), 0));
  const capacity = trunkLiters(car, folded);
  const pct = capacity ? Math.min(100, Math.round((usedLiters / capacity) * 100)) : 0;
  const outside = items.filter((i) => statuses[i.id] === "outside").length;
  const collisions = items.filter((i) => statuses[i.id] === "collision").length;
  const waiting = items.filter((i) => statuses[i.id] === "idle").length;

  return (
    <div className={cx(panel, "pointer-events-auto w-[180px] px-4 py-3 sm:w-[260px] sm:px-5 sm:py-4")}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={sectionLabel}>Gepackt</div>
          <div className="mt-0.5 text-[26px] font-semibold leading-none tracking-tight text-neutral-900 tabular-nums sm:text-[32px] dark:text-white">
            {packed.length}
            <span className="text-neutral-400 dark:text-neutral-500">/{items.length}</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">Gepäckstücke</div>
        </div>
        <div className="text-right">
          <div className={sectionLabel}>Volumen</div>
          <div className="mt-0.5 text-[18px] font-semibold leading-none text-neutral-900 tabular-nums sm:text-[22px] dark:text-white">
            {pct}%
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
            {usedLiters} / {capacity} L
          </div>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10"
        role="progressbar"
        aria-label="Genutztes Kofferraumvolumen"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {(outside > 0 || collisions > 0 || waiting > 0) && (
        <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
          {outside > 0 && <Chip color="bg-red-500" text={`${outside} ragt heraus`} />}
          {collisions > 0 && <Chip color="bg-red-500" text={`${collisions} Kollision`} />}
          {waiting > 0 && <Chip color="bg-neutral-400" text={`${waiting} noch draußen`} />}
        </div>
      )}
    </div>
  );
}

function Chip({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">
      <span className={cx("h-1.5 w-1.5 rounded-full", color)} />
      {text}
    </span>
  );
}
