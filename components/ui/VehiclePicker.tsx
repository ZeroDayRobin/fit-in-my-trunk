"use client";

import { useEffect, useMemo, useState } from "react";
import { BODY_TYPE_LABEL } from "@/lib/cars";
import { CATALOG, defaultVehicleFor, hasBrandData, loadBrand, resolveVehicle } from "@/lib/vehicles/catalog";
import { variantsFor, yearOptions, type VehicleSelection } from "@/lib/vehicles/spec";
import type { BrandData, Powertrain, VariantData } from "@/lib/vehicles/types";
import { useSim } from "@/lib/store";
import { CarSilhouette, IconChevron } from "./icons";
import { cx, sectionLabel } from "./styles";

const POWERTRAIN_LABEL: Record<Powertrain, string> = {
  petrol: "Benziner",
  mhev: "Mild-Hybrid",
  diesel: "Diesel",
  hev: "Vollhybrid",
  phev: "Plug-in-Hybrid",
  bev: "Elektro",
  cng: "Erdgas (CNG)",
  lpg: "Autogas (LPG)",
  fcev: "Wasserstoff",
};

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Hook: Daten einer Marke laden (mit Cache in catalog.ts) */
function useBrand(brandId: string | null) {
  const [state, setState] = useState<{ id: string; data: BrandData | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!brandId || !hasBrandData(brandId)) return;
    let alive = true;
    loadBrand(brandId)
      .then((data) => alive && setState({ id: brandId, data, error: false }))
      .catch(() => alive && setState({ id: brandId, data: null, error: true }));
    return () => {
      alive = false;
    };
  }, [brandId]);
  return state && state.id === brandId ? state : null;
}

async function apply(sel: VehicleSelection | Promise<Awaited<ReturnType<typeof resolveVehicle>>>) {
  const r = sel instanceof Promise ? await sel : await resolveVehicle(sel);
  if (r) useSim.getState().setVehicle(r.car, r.info, r.selection);
}

/** Fahrzeugauswahl: Suche oder Marke › Modell › Modelljahr › Variante */
export function VehiclePicker() {
  const selection = useSim((s) => s.selection);
  const [draftBrand, setDraftBrand] = useState<string | null>(null);
  const brandId = draftBrand ?? selection?.brandId ?? null;
  const brand = useBrand(brandId);
  const isDraft = draftBrand !== null && draftBrand !== selection?.brandId;

  const model = !isDraft && brand?.data ? brand.data.models.find((m) => m.id === selection?.modelId) : undefined;
  const years = useMemo(() => (model ? yearOptions(model) : []), [model]);
  const yearKey = selection ? `${selection.year}:${selection.generationId}` : "";
  const gen = model?.generations.find((g) => g.id === selection?.generationId);
  const variants = gen && selection ? variantsFor(gen, selection.year) : [];

  const onBrand = (id: string) => setDraftBrand(id === selection?.brandId ? null : id);
  const onModel = (modelId: string) => {
    if (!brandId) return;
    setDraftBrand(null);
    apply(defaultVehicleFor(brandId, modelId));
  };
  const onYear = (key: string) => {
    if (!selection || !model) return;
    const [y, genId] = key.split(":");
    const year = Number(y);
    const g = model.generations.find((x) => x.id === genId);
    if (!g) return;
    const list = variantsFor(g, year);
    const current = gen?.variants.find((v) => v.id === selection.variantId);
    const keep = list.find((v) => v.name === current?.name) ?? list[0];
    if (keep) apply({ ...selection, year, generationId: g.id, variantId: keep.id });
  };
  const onVariant = (variantId: string) => selection && apply({ ...selection, variantId });

  return (
    <section>
      <h2 className={sectionLabel}>Fahrzeug</h2>
      <VehicleSearch />

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Field label="Marke">
          <Select value={brandId ?? ""} onChange={onBrand}>
            {CATALOG.brands.map((b) => (
              <option key={b.id} value={b.id} disabled={!b.models.length}>
                {b.name}
                {b.models.length ? "" : " (Daten folgen)"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Modell">
          <Select value={isDraft ? "" : (selection?.modelId ?? "")} onChange={onModel} disabled={!brand?.data}>
            {(isDraft || !selection) && <option value="">Modell wählen …</option>}
            {brand?.data?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Modelljahr">
          <Select value={isDraft ? "" : yearKey} onChange={onYear} disabled={isDraft || !years.length}>
            {isDraft && <option value="">–</option>}
            {years.map((y) => (
              <option key={y.key} value={y.key}>
                {y.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Variante">
          <Select value={isDraft ? "" : (selection?.variantId ?? "")} onChange={onVariant} disabled={isDraft || !variants.length}>
            {isDraft && <option value="">–</option>}
            <VariantOptions variants={variants} baseTrunk={gen?.trunkL ?? null} />
          </Select>
        </Field>
      </div>

      {!isDraft && <VehicleInfoCard />}
      {isDraft && (
        <p className="mt-3 rounded-2xl bg-black/[0.03] px-3.5 py-2.5 text-[12px] text-neutral-500 dark:bg-white/[0.04] dark:text-neutral-400">
          Wähle ein Modell von {CATALOG.brands.find((b) => b.id === draftBrand)?.name}.
        </p>
      )}
    </section>
  );
}

function VariantOptions({ variants, baseTrunk }: { variants: VariantData[]; baseTrunk: number | null }) {
  const groups = new Map<Powertrain, VariantData[]>();
  for (const v of variants) groups.set(v.powertrain, [...(groups.get(v.powertrain) ?? []), v]);
  return (
    <>
      {[...groups.entries()].map(([pt, list]) => (
        <optgroup key={pt} label={POWERTRAIN_LABEL[pt]}>
          {list.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.trunkL && v.trunkL !== baseTrunk ? ` · ${v.trunkL} L` : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="w-full appearance-none truncate rounded-xl border border-black/[0.08] bg-white/80 py-2 pl-3 pr-8 text-[13px] font-medium text-neutral-900 outline-none transition hover:border-black/20 focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100 dark:hover:border-white/25"
      >
        {children}
      </select>
      <IconChevron className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-180 text-neutral-400" />
    </span>
  );
}

/** Schnellsuche über alle Marken und Modelle */
function VehicleSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/);
    const out: { brandId: string; brand: string; modelId: string; model: string; bodyType: keyof typeof BODY_TYPE_LABEL; years: string }[] =
      [];
    for (const b of CATALOG.brands) {
      for (const m of b.models) {
        const hay = `${b.name} ${m.name}`.toLowerCase();
        if (words.every((w) => hay.includes(w))) {
          out.push({
            brandId: b.id,
            brand: b.name,
            modelId: m.id,
            model: m.name,
            bodyType: m.bodyType,
            years: m.yearTo ? `${m.yearFrom}–${m.yearTo}` : `seit ${m.yearFrom}`,
          });
        }
      }
    }
    return out.slice(0, 8);
  }, [query]);

  const pick = (r: (typeof results)[number]) => {
    setQuery("");
    setOpen(false);
    apply(defaultVehicleFor(r.brandId, r.modelId));
  };

  return (
    <div className="relative mt-3">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) pick(results[0]);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Fahrzeug suchen, z. B. „Tiguan“"
        aria-label="Fahrzeug suchen"
        className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-3 py-2 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100"
      />
      {open && query && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-black/[0.08] bg-white p-1 shadow-xl dark:border-white/10 dark:bg-neutral-900">
          {results.length === 0 && <li className="px-3 py-2 text-[12px] text-neutral-500">Kein Treffer in der Datenbank.</li>}
          {results.map((r) => (
            <li key={`${r.brandId}/${r.modelId}`}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <CarSilhouette style={r.bodyType} className="h-5 w-12 shrink-0 text-neutral-600 dark:text-neutral-300" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
                    {r.brand} {r.model}
                  </span>
                  <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                    {BODY_TYPE_LABEL[r.bodyType]} · {r.years}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Offizielle Daten des gewählten Fahrzeugs inkl. Quellen */
function VehicleInfoCard() {
  const info = useSim((s) => s.info);
  const [showSources, setShowSources] = useState(false);
  if (!info) return <div className="mt-3 h-28 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.05]" />;
  const v = info.verification;
  const verified = v.checked > 0;

  return (
    <div className="mt-3 rounded-2xl bg-black/[0.03] px-3.5 py-3 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <CarSilhouette style={info.bodyType} className="mt-0.5 h-6 w-14 shrink-0 text-neutral-700 dark:text-neutral-300" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
            {info.brand} {info.model}
          </div>
          <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
            {BODY_TYPE_LABEL[info.bodyType]} · {info.generation} · MJ {info.year}
          </div>
        </div>
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <Stat label="Kofferraum (VDA)" value={info.trunkL ? `${fmt(info.trunkL)} L` : "k. A."} />
        <Stat label="Umgeklappt" value={info.trunkFoldedL ? `${fmt(info.trunkFoldedL)} L` : "k. A."} />
        <Stat
          label="L × B × H"
          value={
            info.lengthMm && info.widthMm && info.heightMm
              ? `${fmt(info.lengthMm)} × ${fmt(info.widthMm)} × ${fmt(info.heightMm)} mm`
              : "k. A."
          }
          wide
        />
        <Stat
          label={
            info.box.basis === "measured"
              ? `Laderaum (${info.box.sourceLabel})`
              : info.box.basis === "partial"
                ? `Laderaum (teils ${info.box.sourceLabel}, teils geschätzt)`
                : "Laderaum (geschätzt)"
          }
          value={`B ${info.box.widthCm} × H ${info.box.heightCm} × T ${info.box.depthCm} cm`}
          wide
        />
      </dl>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge tone={verified ? "green" : "amber"}>
          {verified ? `Gegengeprüft: ${v.confirmed}/${v.checked} Werte bestätigt` : "Noch nicht unabhängig gegengeprüft"}
        </Badge>
        {info.sources.length > 0 && (
          <button
            onClick={() => setShowSources((s) => !s)}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-700 hover:underline dark:text-sky-400"
            aria-expanded={showSources}
          >
            Quellen ({info.sources.length})
            <IconChevron className={cx("h-3 w-3 transition-transform", !showSources && "rotate-180")} />
          </button>
        )}
      </div>
      {<p className="mt-1.5 text-[10.5px] leading-snug text-neutral-500 dark:text-neutral-400">{estimateNote(info)}</p>}
      {showSources && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-[10.5px] leading-snug">
          {info.sources.map((s, i) => (
            <li key={i} className="text-neutral-500 dark:text-neutral-400">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sky-700 hover:underline dark:text-sky-400"
              >
                {new URL(s.url).hostname.replace(/^www\./, "")}
              </a>{" "}
              – {s.what}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Erklärt, wie die Laderaum-Box zustande kommt, wenn keine Innenmaße veröffentlicht sind */
function estimateNote(info: NonNullable<ReturnType<typeof useSim.getState>["info"]>) {
  const { widthCm, heightCm, depthCm, basis, sourceLabel } = info.box;
  const boxL = Math.round((widthCm * heightCm * depthCm) / 1000);
  if (basis === "measured")
    return `Die blaue Box nutzt gemessene Innenmaße (${sourceLabel}). Das offizielle VDA-Volumen${info.trunkL ? ` (${fmt(info.trunkL)} L)` : ""} wird mit genormten 1-Liter-Klötzen ermittelt und kann davon abweichen.`;
  if (basis === "partial")
    return `Ein Teil der Innenmaße ist gemessen (${sourceLabel}), der Rest ist aus dem offiziellen Volumen${info.trunkL ? ` (${fmt(info.trunkL)} L)` : ""} berechnet. Die blaue Box hat ≈ ${fmt(boxL)} L.`;
  const shape =
    "Breite, Höhe und Tiefe sind geschätzt, weil keine Innenmaße veröffentlicht sind – die echte Form (Radkästen, schräge Heckklappe) kann etwas abweichen.";
  if (!info.trunkL)
    return `Für diese Variante ist kein offizielles Kofferraumvolumen bekannt. Die blaue Box (≈ ${fmt(boxL)} L) ist anhand typischer Werte geschätzt.`;
  if (Math.abs(boxL - info.trunkL) <= info.trunkL * 0.03)
    return `Die blaue Box hat das offizielle Kofferraumvolumen (${fmt(info.trunkL)} L). ${shape}`;
  return `Die blaue Box (≈ ${fmt(boxL)} L) nähert das offizielle Volumen von ${fmt(info.trunkL)} L an – sehr hohe oder verwinkelte Laderäume lassen sich nicht vollständig als Quader darstellen. ${shape}`;
}

function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
        tone === "green"
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-400/20 text-amber-800 dark:text-amber-300",
      )}
    >
      {children}
    </span>
  );
}
