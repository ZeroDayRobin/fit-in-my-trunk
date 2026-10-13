# Kofferraum-Simulator – „Passt mein Gepäck rein?“

Interaktiver 3D-Pack-Simulator: Fahrzeug wählen, Gepäck spawnen, per Drag & Drop in den Kofferraum ziehen und sofort sehen, was passt.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · React Three Fiber 9 · @react-three/drei 10 · Zustand 5

## Funktionen

- **3 Fahrzeugklassen** (Kompaktwagen, Kombi, SUV) mit realistischen Kofferraum-Maßen in Metern (1 Einheit = 1 m) und 6 Lackierungen
- **3 Gepäckgrößen** mit Normmaßen: Rucksack (45 × 32 × 22 cm), Trolley (55 × 40 × 23 cm), Reisekoffer (75 × 50 × 30 cm)
- **Drag & Drop per Raycasting** mit Auto-Stapeln (Gepäck legt sich auf Boden, Ladeboden oder anderes Gepäck) und magnetischem Einrasten an Wänden und Nachbarteilen
- **Feedback:** Grün = komplett im Kofferraum. Rot (pulsierend) = ragt heraus oder kollidiert.
- **Zähler oben rechts:** gepackte Gepäckstücke und genutztes Volumen in Litern und Prozent
- **Drehen/Kippen** mit `R` / `T` oder über Buttons (Touch). `Entf` löscht, `Esc` hebt die Auswahl auf, `1`–`3` fügt Gepäck hinzu.
- **Automatisch packen:** Heuristik, die zuerst den Boden füllt und zur Rückbank hin packt
- **Fahrzeugvergleich:** Die Fahrzeugkarten zeigen, wie viele der aktuellen Gepäckstücke in jedes Modell passen
- **Rücksitze umklappen** verlängert den Laderaum, mit Animation
- **Kamera-Presets** (Heck, Oben, Seite, Front), Röntgenblick und Hell/Dunkel-Modus
- Responsive: Seitenleiste auf dem Desktop, Bottom-Sheet auf dem Smartphone

## Lokal starten

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deployment auf Vercel

1. Repository zu GitHub pushen.
2. Auf [vercel.com/new](https://vercel.com/new) das Repo importieren. Umgebungsvariablen sind nicht nötig.
3. **Deploy** klicken. Die Seite wird statisch vorgerendert, die 3D-Szene lädt nur im Browser.

Die `vercel.json` im Repo legt das Framework fest auf Next.js (`"framework": "nextjs"`). Dadurch funktioniert der Build auch, wenn das Vercel-Projekt auf den Framework-Preset „Other“ eingestellt ist. Ohne diese Datei bricht der Build dann mit `No Output Directory named "public" found` ab.

## Abhängigkeiten (`package.json`)

```json
"dependencies": {
  "@react-three/drei": "^10.7.9",
  "@react-three/fiber": "^9.8.1",
  "next": "16.4.0",
  "react": "19.3.0",
  "react-dom": "19.3.0",
  "three": "^0.186.1",
  "zustand": "^5.0.15"
},
"devDependencies": {
  "@tailwindcss/turbopack": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "@types/three": "^0.186.0",
  "eslint": "^9",
  "eslint-config-next": "16.4.0",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

## Projektstruktur

```
app/
  layout.tsx            Root-Layout, Font, Theme-Script (kein Aufblitzen beim Laden)
  page.tsx              Server-Komponente → <Simulator />
  globals.css           Tailwind 4, Dark-Mode-Variante, Toast-Animation
components/
  Simulator.tsx         Client-Layout; lädt die 3D-Szene per next/dynamic mit ssr: false
  Scene.tsx             <Canvas>, OrbitControls, Auto, Kofferraum-Box, Gepäck
  scene/
    CarModel.tsx        Prozedurales Auto (extrudierte Profile, Radhäuser, Heckklappe, Rückbank)
    TrunkZone.tsx       Hellblaue Bounding-Box mit 10-cm-Raster und Maßangaben
    LuggageItem.tsx     Gepäckmodelle, Status-Leuchten, Drag-Start
    DragController.tsx  Raycasting-Drag inkl. Auto-Stapeln und Einrasten
    CameraRig.tsx       Kamera-Presets und Kamerafahrten
    Stage.tsx           Licht, Umgebung (ohne externe HDRI), Boden, Kontaktschatten
  ui/                   Tailwind-UI: Sidebar, StatsPanel, ViewToolbar, SelectionBar, …
lib/
  cars.ts               Fahrzeugdaten und Lacke
  luggage.ts            Gepäck-Typen
  packing.ts            Kollision, Stapeln, Status, Auto-Pack (reine Funktionen, ohne React)
  store.ts              Zustand-Store
```

### Eigene Fahrzeuge oder echte 3D-Modelle

Neue Fahrzeuge werden in `lib/cars.ts` ergänzt: Außenmaße, Profilpunkte und Kofferraum-Quader. Für echte Modelle kannst du `CarModel` durch ein GLB ersetzen, z. B. mit `useGLTF` aus drei. Kofferraum-Box und Pack-Logik bleiben dabei unverändert, weil sie nur `trunk` aus `cars.ts` verwenden.
