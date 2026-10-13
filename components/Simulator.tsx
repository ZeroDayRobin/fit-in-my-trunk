"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { initialVehicle } from "@/lib/vehicles/catalog";
import { useSim } from "@/lib/store";
import { Sidebar } from "./ui/Sidebar";
import { StatsPanel } from "./ui/StatsPanel";
import { ViewToolbar } from "./ui/ViewToolbar";
import { SelectionBar } from "./ui/SelectionBar";
import { Notice } from "./ui/Notice";
import { KeyboardShortcuts } from "./ui/KeyboardShortcuts";
import { FeedbackButton } from "./ui/FeedbackButton";

function SceneLoading() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
        3D-Szene wird geladen …
      </div>
    </div>
  );
}

// Three.js greift auf window/WebGL zu → nur im Browser rendern (kein SSR).
const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: SceneLoading });

export default function Simulator() {
  const ready = useSim((s) => s.info !== null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Startfahrzeug laden (Datenbank-Chunk der Marke)
  useEffect(() => {
    let alive = true;
    initialVehicle().then((r) => {
      if (!alive || useSim.getState().info) return;
      if (!r) throw new Error("Kein Startfahrzeug verfügbar");
      useSim.getState().setVehicle(r.car, r.info, r.selection);
    }).catch(() => {
      if (alive) setLoadError(true);
    });
    return () => { alive = false; };
  }, [attempt]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#e3e5e8] text-neutral-900 dark:bg-[#0b0c0f] dark:text-neutral-100">
      {/* isolate: hält die 3D-Html-Labels unterhalb der Overlay-UI */}
      <div className="absolute inset-0 isolate">
        {ready ? <Scene /> : loadError ? (
          <div className="grid h-full place-items-center px-6">
            <div role="alert" className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg dark:bg-neutral-900">
              <p className="text-sm">Die Fahrzeugdaten konnten nicht geladen werden.</p>
              <button className="mt-3 min-h-11 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white"
                onClick={() => { setLoadError(false); setAttempt((n) => n + 1); }}>
                Erneut versuchen
              </button>
            </div>
          </div>
        ) : <SceneLoading />}
      </div>

      {/* Overlay-UI */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <header className="absolute left-4 top-4 sm:left-6 sm:top-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-neutral-900 text-white shadow-lg shadow-neutral-900/20 dark:bg-white dark:text-neutral-900">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M3 15l2-5c.4-1 1.2-1.6 2.3-1.6h9.4c1.1 0 1.9.6 2.3 1.6l2 5v3H3z" />
                <rect x="9" y="4" width="6" height="5" rx="1" />
                <circle cx="7" cy="18" r="1.6" />
                <circle cx="17" cy="18" r="1.6" />
              </svg>
            </div>
            <div className="sr-only leading-tight min-[440px]:not-sr-only">
              <h1 className="text-[15px] font-semibold tracking-tight">Kofferraum-Simulator</h1>
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Passt mein Gepäck rein?</p>
            </div>
          </div>
        </header>

        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <StatsPanel />
        </div>

        <div className="absolute inset-x-0 top-[132px] flex flex-col items-center gap-2 px-3 sm:top-[150px] lg:bottom-6 lg:top-auto lg:flex-col-reverse lg:pl-[384px] xl:pl-0">
          <ViewToolbar />
          <SelectionBar />
        </div>

        <div className="absolute inset-x-0 top-[84px] flex justify-center px-3 sm:top-6">
          <Notice />
        </div>

        <Sidebar />
        <FeedbackButton />
      </div>

      <KeyboardShortcuts />
    </main>
  );
}
