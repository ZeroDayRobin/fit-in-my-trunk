"use client";

import { useMemo, useState } from "react";
import { CARS, PAINTS, trunkLiters } from "@/lib/cars";
import { LUGGAGE, LUGGAGE_TYPES, luggageDimsLabel, luggageLiters, type LuggageType } from "@/lib/luggage";
import { autoPack, makeEnv } from "@/lib/packing";
import { useCar, useSim } from "@/lib/store";
import { CarSilhouette, IconChevron, IconPlus, IconReset, IconSeat, IconSparkle, LuggageGlyph } from "./icons";
import { cx, panel, sectionLabel } from "./styles";

/** Linke Seitenleiste (Desktop) bzw. Bottom-Sheet (Mobil). */
export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className={cx(
        panel,
        "pointer-events-auto flex flex-col overflow-hidden",
        // Mobil: Bottom-Sheet
        "fixed inset-x-0 bottom-0 rounded-b-none rounded-t-3xl",
        // Desktop: schwebende Seitenleiste
        "lg:absolute lg:inset-x-auto lg:bottom-6 lg:left-6 lg:top-24 lg:w-[360px] lg:rounded-3xl",
      )}
    >
      {/* Mobil: Griff + Schnellzugriff */}
      <div className="lg:hidden">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 pb-1 pt-3" aria-expanded={open}>
          <span className={sectionLabel}>Gepäck hinzufügen</span>
          <span className="flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {open ? "Weniger" : "Fahrzeug & Optionen"}
            <IconChevron className={cx("h-4 w-4 transition-transform", !open && "rotate-180")} />
          </span>
        </button>
        <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-2">
          {LUGGAGE_TYPES.map((t) => (
            <LuggageButton key={t} type={t} compact />
          ))}
        </div>
      </div>

      <div className={cx("min-h-0 flex-1 overflow-y-auto overscroll-contain", open ? "max-h-[46dvh]" : "hidden", "lg:block lg:max-h-none")}>
        <div className="space-y-6 px-5 pb-5 pt-1 lg:pt-5">
          <CarSection />
          <PaintSection />
          <section className="hidden lg:block">
            <h2 className={sectionLabel}>Gepäck hinzufügen</h2>
            <div className="mt-3 space-y-2">
              {LUGGAGE_TYPES.map((t) => (
                <LuggageButton key={t} type={t} />
              ))}
            </div>
          </section>
          <CargoSection />
          <p className="hidden text-[11px] leading-relaxed text-neutral-400 lg:block dark:text-neutral-500">
            <Kbd>Ziehen</Kbd> Gepäck verschieben · <Kbd>R</Kbd> drehen · <Kbd>T</Kbd> kippen · <Kbd>Entf</Kbd> löschen · <Kbd>1</Kbd>–
            <Kbd>3</Kbd> hinzufügen. Ziehen im freien Raum dreht die Kamera, Scrollen zoomt.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-black/10 bg-white px-1 py-px font-sans text-[10px] font-semibold text-neutral-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300">
      {children}
    </kbd>
  );
}

function CarSection() {
  const carId = useSim((s) => s.carId);
  const setCar = useSim((s) => s.setCar);
  const items = useSim((s) => s.items);
  const folded = useSim((s) => s.seatsFolded);

  // Vorschau: Wie viele der aktuellen Gepäckstücke passen in jedes Modell?
  const fitKey = items
    .map((i) => i.type)
    .sort()
    .join(",");
  const fits = useMemo(() => {
    if (!fitKey) return null;
    return Object.fromEntries(CARS.map((c) => [c.id, autoPack(items, makeEnv(c, folded)).packedIds.length]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, folded]);

  return (
    <section>
      <h2 className={sectionLabel}>Fahrzeug</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {CARS.map((c) => {
          const active = c.id === carId;
          const fit = fits?.[c.id];
          const all = fit === items.length;
          return (
            <button
              key={c.id}
              onClick={() => setCar(c.id)}
              className={cx(
                "group relative flex flex-col items-start rounded-2xl border p-2.5 text-left transition",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-lg shadow-neutral-900/20 dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-black/[0.07] bg-white/60 text-neutral-800 hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-200 dark:hover:border-white/25",
              )}
            >
              <CarSilhouette
                style={c.style}
                className={cx("h-7 w-full", active ? "text-white dark:text-neutral-900" : "text-neutral-700 dark:text-neutral-300")}
              />
              <span className="mt-1.5 text-[13px] font-semibold leading-tight">{c.name}</span>
              <span
                className={cx(
                  "text-[11px] tabular-nums",
                  active ? "text-white/70 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400",
                )}
              >
                {trunkLiters(c, folded)} L
              </span>
              {fit !== undefined && (
                <span
                  className={cx(
                    "absolute right-1.5 top-1.5 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                    all ? "bg-emerald-500 text-white" : "bg-amber-400 text-amber-950",
                  )}
                  title={`${fit} von ${items.length} Gepäckstücken passen`}
                >
                  {fit}/{items.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <CarDetails />
    </section>
  );
}

function CarDetails() {
  const car = useCar();
  const t = car.trunk;
  const cm = (v: number) => Math.round(v * 100);
  return (
    <div className="mt-3 flex items-baseline justify-between gap-3 rounded-2xl bg-black/[0.03] px-3.5 py-2.5 dark:bg-white/[0.04]">
      <div>
        <div className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{car.segment}</div>
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Ladefläche {cm(t.width)} × {cm(t.depth)} cm · Höhe {cm(t.height)} cm
        </div>
      </div>
      <div className="text-right text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
        {car.length.toFixed(2).replace(".", ",")} m
      </div>
    </div>
  );
}

function PaintSection() {
  const paintId = useSim((s) => s.paints[s.carId]);
  const setPaint = useSim((s) => s.setPaint);
  const current = PAINTS.find((p) => p.id === paintId);
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className={sectionLabel}>Lackierung</h2>
        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{current?.name}</span>
      </div>
      <div className="mt-3 flex gap-2.5">
        {PAINTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPaint(p.id)}
            title={p.name}
            aria-label={p.name}
            className={cx(
              "h-8 w-8 rounded-full ring-offset-2 transition hover:scale-110 ring-offset-white dark:ring-offset-neutral-900",
              p.id === paintId ? "ring-2 ring-neutral-900 dark:ring-white" : "ring-1 ring-black/10 dark:ring-white/15",
            )}
            style={{
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 42%), ${p.color}`,
            }}
          />
        ))}
      </div>
    </section>
  );
}

function LuggageButton({ type, compact = false }: { type: LuggageType; compact?: boolean }) {
  const spec = LUGGAGE[type];
  const addItem = useSim((s) => s.addItem);
  const count = useSim((s) => s.items.filter((i) => i.type === type).length);

  if (compact) {
    return (
      <button
        onClick={() => addItem(type)}
        className="relative flex flex-col items-center gap-1 rounded-2xl border border-black/[0.07] bg-white/70 px-2 py-2 active:scale-[0.97] dark:border-white/10 dark:bg-white/[0.04]"
      >
        <LuggageGlyph type={type} color={spec.color} />
        <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">{spec.name}</span>
        {count > 0 && <CountBadge count={count} />}
      </button>
    );
  }

  return (
    <button
      onClick={() => addItem(type)}
      className="group relative flex w-full items-center gap-3 rounded-2xl border border-black/[0.07] bg-white/60 px-3 py-2 text-left transition hover:border-black/20 hover:bg-white active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.06]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
        <LuggageGlyph type={type} color={spec.color} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">{spec.name}</span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{spec.description}</span>
        </span>
        <span className="block text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
          {luggageDimsLabel(type)} · {Math.round(luggageLiters(type))} L
        </span>
      </span>
      {count > 0 && (
        <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-neutral-700 dark:bg-white/10 dark:text-neutral-200">
          ×{count}
        </span>
      )}
      <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-white transition group-hover:scale-105 dark:bg-white dark:text-neutral-900">
        <IconPlus className="h-4 w-4" />
      </span>
    </button>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-neutral-900 px-1.5 text-[10px] font-semibold leading-5 text-white tabular-nums dark:bg-white dark:text-neutral-900">
      {count}
    </span>
  );
}

function CargoSection() {
  const car = useCar();
  const folded = useSim((s) => s.seatsFolded);
  const toggleSeats = useSim((s) => s.toggleSeats);
  const packAll = useSim((s) => s.packAll);
  const clearItems = useSim((s) => s.clearItems);
  const hasItems = useSim((s) => s.items.length > 0);
  const extra = trunkLiters(car, true) - trunkLiters(car, false);

  return (
    <section>
      <h2 className={sectionLabel}>Laderaum</h2>
      <button
        onClick={toggleSeats}
        role="switch"
        aria-checked={folded}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-black/[0.07] bg-white/60 px-3 py-2.5 text-left transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-black/[0.04] text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-300">
          <IconSeat />
        </span>
        <span className="flex-1">
          <span className="block text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">Rücksitze umklappen</span>
          <span className="block text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">+{extra} L Ladevolumen</span>
        </span>
        <span
          className={cx("relative h-6 w-11 rounded-full transition-colors", folded ? "bg-sky-500" : "bg-neutral-300 dark:bg-neutral-700")}
        >
          <span
            className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", folded ? "left-[22px]" : "left-0.5")}
          />
        </span>
      </button>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={packAll}
          disabled={!hasItems}
          className="flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-[14px] font-semibold text-white shadow-lg shadow-neutral-900/15 transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <IconSparkle className="h-4 w-4" /> Automatisch packen
        </button>
        <button
          onClick={clearItems}
          disabled={!hasItems}
          title="Alles zurücksetzen"
          aria-label="Alles zurücksetzen"
          className="grid w-12 place-items-center rounded-2xl border border-black/[0.08] text-neutral-700 transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/[0.06]"
        >
          <IconReset className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
