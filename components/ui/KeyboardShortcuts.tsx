"use client";

import { useEffect } from "react";
import { useSim } from "@/lib/store";
import { LUGGAGE_TYPES } from "@/lib/luggage";

/** Tastatur: R drehen · T nach vorne kippen · S zur Seite kippen (mit Shift jeweils andersherum) · Entf löschen · Esc abwählen · 1–3 Gepäck hinzufügen */
export function KeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useSim.getState();
      const dir = e.shiftKey ? -1 : 1;
      switch (e.key.toLowerCase()) {
        case "r":
          s.rotateSelected("yaw", dir);
          break;
        case "t":
          s.rotateSelected("tip", dir);
          break;
        case "s":
          s.rotateSelected("roll", dir);
          break;
        case "delete":
        case "backspace":
          if (s.selectedId) {
            e.preventDefault();
            s.removeSelected();
          }
          break;
        case "escape":
          s.select(null);
          break;
        case "1":
        case "2":
        case "3":
          s.addItem(LUGGAGE_TYPES[Number(e.key) - 1]);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
