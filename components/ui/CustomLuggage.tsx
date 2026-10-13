"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CUSTOM_LIMITS } from "@/lib/luggage";
import { useSim } from "@/lib/store";
import { IconPlus } from "./icons";
import { cx, panel } from "./styles";

/** Typische Maße zum schnellen Ausfüllen – frei anpassbar */
const EXAMPLES: { name: string; w: number; h: number; d: number }[] = [
  { name: "Getränkekiste", w: 40, h: 32, d: 30 },
  { name: "Umzugskarton", w: 60, h: 34, d: 32 },
  { name: "Golfbag", w: 35, h: 125, d: 30 },
  { name: "Kinderwagen (gefaltet)", w: 60, h: 35, d: 80 },
];

const inRange = (v: number) => Number.isFinite(v) && v >= CUSTOM_LIMITS.min && v <= CUSTOM_LIMITS.max;

/** Button „Eigenes Gepäckstück“ inkl. Dialog */
export function CustomLuggageButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-black/20 bg-white/40 px-2 py-2 active:scale-[0.97] dark:border-white/20 dark:bg-white/[0.02]"
        >
          <span className="grid h-8 w-8 place-items-center text-neutral-600 dark:text-neutral-300">
            <IconPlus className="h-5 w-5" />
          </span>
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">Eigenes</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-black/20 bg-white/30 px-3 py-2 text-left transition hover:border-black/35 hover:bg-white/70 dark:border-white/20 dark:bg-white/[0.02] dark:hover:border-white/35"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-300">
            <IconPlus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">Eigenes Gepäckstück</span>
            <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
              Mit eigenen Maßen, z. B. Kiste, Golfbag, Kinderwagen
            </span>
          </span>
        </button>
      )}
      {/* Portal: die Seitenleiste nutzt backdrop-filter, das würde „fixed“ auf die Leiste begrenzen */}
      {open && createPortal(<CustomLuggageDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function CustomLuggageDialog({ onClose }: { onClose: () => void }) {
  const templates = useSim((s) => s.customTemplates);
  const addCustomItem = useSim((s) => s.addCustomItem);
  const removeTemplate = useSim((s) => s.removeCustomTemplate);
  const [name, setName] = useState("");
  const [w, setW] = useState("50");
  const [h, setH] = useState("40");
  const [d, setD] = useState("30");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nums = [w, h, d].map((v) => Number(v.replace(",", ".")));
  const valid = nums.every(inRange);
  const liters = valid ? Math.round((nums[0] * nums[1] * nums[2]) / 1000) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    addCustomItem({ name: name.trim() || "Eigenes Gepäck", size: [nums[0] / 100, nums[1] / 100, nums[2] / 100] });
    onClose();
  };

  const fill = (x: { name: string; w: number; h: number; d: number }) => {
    setName(x.name);
    setW(String(x.w));
    setH(String(x.h));
    setD(String(x.d));
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/25 p-3 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-luggage-title"
        onClick={(e) => e.stopPropagation()}
        className={cx(panel, "max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white/95 p-5 dark:bg-neutral-900/95")}
      >
        <h2 id="custom-luggage-title" className="text-[16px] font-semibold text-neutral-900 dark:text-white">
          Eigenes Gepäckstück
        </h2>
        <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
          Maße in Zentimetern ({CUSTOM_LIMITS.min}–{CUSTOM_LIMITS.max} cm). Im Kofferraum kannst du es danach drehen und kippen.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            ref={first}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Name, z. B. „Hundebox“"
            className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100"
          />
          <div className="grid grid-cols-3 gap-2">
            <DimInput label="Breite" value={w} onChange={setW} />
            <DimInput label="Höhe" value={h} onChange={setH} />
            <DimInput label="Tiefe" value={d} onChange={setD} />
          </div>
          <p className={cx("text-[12px]", valid ? "text-neutral-500 dark:text-neutral-400" : "font-medium text-red-600 dark:text-red-400")}>
            {valid ? `Volumen: ${liters} L` : `Bitte Werte zwischen ${CUSTOM_LIMITS.min} und ${CUSTOM_LIMITS.max} cm eingeben.`}
          </p>

          <div>
            <div className="mb-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Beispiele (typische Maße, anpassbar)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((x) => (
                <button
                  type="button"
                  key={x.name}
                  onClick={() => fill(x)}
                  className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[11.5px] text-neutral-700 hover:bg-black/[0.04] dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/[0.06]"
                >
                  {x.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[13px] font-medium text-neutral-600 hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/[0.08]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900"
            >
              Hinzufügen
            </button>
          </div>
        </form>

        {templates.length > 0 && (
          <div className="mt-4 border-t border-black/[0.06] pt-3 dark:border-white/10">
            <div className="mb-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Zuletzt verwendet</div>
            <ul className="space-y-1">
              {templates.map((t, i) => (
                <li key={`${t.name}-${i}`} className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: t.color }} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-800 dark:text-neutral-200">
                    {t.name}{" "}
                    <span className="text-neutral-500 tabular-nums dark:text-neutral-400">
                      {t.size.map((v) => Math.round(v * 100)).join(" × ")} cm
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      addCustomItem(t);
                      onClose();
                    }}
                    className="rounded-lg px-2 py-1 text-[12px] font-semibold text-sky-700 hover:bg-sky-500/10 dark:text-sky-400"
                  >
                    + Hinzufügen
                  </button>
                  <button
                    onClick={() => removeTemplate(i)}
                    aria-label={`${t.name} aus der Liste entfernen`}
                    className="rounded-lg px-1.5 py-1 text-[13px] text-neutral-400 hover:bg-black/[0.05] hover:text-neutral-700 dark:hover:bg-white/[0.08]"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function DimInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = Number(value.replace(",", "."));
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label} (cm)</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        aria-invalid={!inRange(n)}
        className={cx(
          "w-full rounded-xl border bg-white px-3 py-2 text-[13px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:bg-white/[0.05] dark:text-neutral-100",
          inRange(n) ? "border-black/[0.1] dark:border-white/10" : "border-red-400",
        )}
      />
    </label>
  );
}
