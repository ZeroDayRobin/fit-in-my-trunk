"use client";

import { useSim, type ViewName } from "@/lib/store";
import { IconMoon, IconSun, IconXray } from "./icons";
import { cx, panel } from "./styles";

const VIEWS: { name: ViewName; label: string }[] = [
  { name: "rear", label: "Heck" },
  { name: "top", label: "Oben" },
  { name: "side", label: "Seite" },
  { name: "front", label: "Front" },
];

/** Kamera-Presets, Röntgenblick und Hell/Dunkel-Umschalter. */
export function ViewToolbar() {
  const view = useSim((s) => s.view.name);
  const setView = useSim((s) => s.setView);
  const xray = useSim((s) => s.xray);
  const toggleXray = useSim((s) => s.toggleXray);
  const theme = useSim((s) => s.theme);
  const setTheme = useSim((s) => s.setTheme);

  return (
    <div className={cx(panel, "pointer-events-auto flex items-center gap-1 rounded-full p-1")}>
      <div className="flex">
        {VIEWS.map((v) => (
          <button
            key={v.name}
            onClick={() => setView(v.name)}
            className={cx(
              "rounded-full px-3 py-1.5 text-[13px] font-medium transition sm:px-4",
              view === v.name
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-600 hover:bg-black/[0.05] hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/[0.08] dark:hover:text-white",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />
      <button
        onClick={toggleXray}
        title="Röntgenblick: Karosserie transparent"
        aria-pressed={xray}
        className={cx(
          "grid h-8 w-8 place-items-center rounded-full transition",
          xray ? "bg-sky-500 text-white" : "text-neutral-600 hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/[0.08]",
        )}
      >
        <IconXray className="h-[18px] w-[18px]" />
      </button>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Hell/Dunkel umschalten"
        aria-label="Hell/Dunkel umschalten"
        className="grid h-8 w-8 place-items-center rounded-full text-neutral-600 transition hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/[0.08]"
      >
        <IconMoon className="h-[18px] w-[18px] dark:hidden" />
        <IconSun className="hidden h-[18px] w-[18px] dark:block" />
      </button>
    </div>
  );
}
