# Kofferraum-Simulator – „Passt mein Gepäck rein?“

Interaktiver 3D-Pack-Simulator: Fahrzeug wählen, Gepäck spawnen, per Drag & Drop in den Kofferraum ziehen und sofort sehen, was passt.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · React Three Fiber 9 · @react-three/drei 10 · Zustand 5

## Funktionen

- **Echte Fahrzeuge:** Auswahl nach Marke › Modell › Modelljahr › Variante (z. B. *Volkswagen › Tiguan › 2026 › 2.0 TSI 4MOTION*), dazu eine Schnellsuche. Die Daten sind offizielle Herstellerangaben: Außenmaße und VDA-Kofferraumvolumen je Variante, mit Quellenangabe.
- **Datengetriebene 3D-Autos:** Länge, Breite, Höhe und Radstand stammen aus der Datenbank. Die Karosserieform passt sich an: Schrägheck, Kombi, SUV, SUV-Coupé, Limousine/Coupé/Cabrio mit Kofferraumdeckel, Van.
- **3 Gepäckgrößen** mit Normmaßen: Rucksack (45 × 32 × 22 cm), Trolley (55 × 40 × 23 cm), Reisekoffer (75 × 50 × 30 cm)
- **Drag & Drop per Raycasting** mit Auto-Stapeln und magnetischem Einrasten
- **Feedback:** Grün = komplett im Kofferraum. Rot (pulsierend) = ragt heraus oder kollidiert.
- **Zähler oben rechts:** gepackte Gepäckstücke und genutztes Volumen
- **Drehen/Kippen** mit `R` / `T` oder über Buttons, **Automatisch packen**, **Rücksitze umklappen**
- **Nachricht an den Entwickler:** Button unten rechts, siehe unten
- Kamera-Presets, Röntgenblick, startet immer im hellen Design (Dunkel per Umschalter), responsive

## Fahrzeugdatenbank

Berücksichtigt werden die 10 größten Marken nach KBA-Neuzulassungen 2025 (Pressemitteilung Nr. 01/2026): Volkswagen, Mercedes-Benz, BMW, Škoda, Audi, Seat/Cupra (vom KBA gemeinsam gezählt), Opel, Ford, Hyundai und Toyota. Erfasst werden die Modelljahre 2020 bis 2026.

**Warum keine externe Datenbank?** Eine Recherche hat ergeben: Es gibt keine freie, offen lizenzierte Datenbank mit VDA-Kofferraumvolumen je Variante für den deutschen Markt.
- Offene Daten wie RDW (NL), der EEA-CO₂-Datensatz und Wikidata enthalten kein Kofferraumvolumen.
- Der ADAC-Autokatalog hat genau die gewünschte Struktur, aber keine API, und seine Nutzungsbedingungen verbieten die Weiterverwendung. Dazu kommt der Datenbankschutz nach §87a ff. UrhG.
- Kommerzielle Anbieter wie cars-data.com, DAT oder JATO kosten Lizenzgebühren. Bei cars-data.com sind es rund 780 € für eine öffentliche Anzeige.

Die App nutzt deshalb eine **eigene, kuratierte Datenbank**. Einzelne technische Fakten der Hersteller (z. B. „652 l nach VDA“) sind nicht urheberrechtlich geschützt. Jede Generation speichert ihre Quellen-URLs, und die App zeigt sie an.

- `data/research/*.json`: Rohdaten der Recherche je Paket, inklusive Ergebnis der unabhängigen Gegenprüfung
- `scripts/build-vehicle-data.mjs` (`npm run data`): übernimmt Korrekturen, prüft die Plausibilität, vergibt IDs und schreibt `data/vehicles/<marke>.json` sowie `data/vehicles/index.json`. Jede Marke wird im Browser als eigener Chunk erst bei Bedarf geladen.
- Laderaum-Innenmaße veröffentlichen Hersteller nur selten. Fehlen sie, berechnet `lib/vehicles/spec.ts` die Box aus dem VDA-Volumen und typischen Proportionen der Karosserieform. Die App kennzeichnet das als „geschätzt“.

**Stand:** Die Recherche läuft in Etappen. Pro Durchgang sind 200 Websuchen möglich. Derzeit enthalten sind Volkswagen (Teil) und Mercedes-Benz (GLA, GLB). Die übrigen Marken erscheinen in der Auswahl als „Daten folgen“ und werden in den nächsten Etappen ergänzt und gegengeprüft.

## Nachricht an den Entwickler (Kontaktformular)

Der Button unten rechts öffnet ein Formular. Gesendet wird über die Server-Route `app/api/feedback/route.ts`. Die Zieladresse steht nur in Umgebungsvariablen und ist auf der Seite nicht sichtbar. In Vercel richtest du sie unter **Settings → Environment Variables** ein (mindestens eine Variante):

| Variable | Bedeutung |
|---|---|
| `RESEND_API_KEY` | API-Key von [resend.com](https://resend.com) (kostenloser Tarif reicht) |
| `FEEDBACK_EMAIL_TO` | Deine E-Mail-Adresse (mehrere durch Komma getrennt) |
| `FEEDBACK_EMAIL_FROM` | optional, Absender einer bei Resend verifizierten Domain. Standard: `onboarding@resend.dev` (stellt nur an die Adresse deines Resend-Kontos zu) |
| `FEEDBACK_WEBHOOK_URL` | alternativ ein Discord- oder Slack-Webhook bzw. ein beliebiger JSON-Endpunkt |

Ohne Konfiguration zeigt das Formular „Der Nachrichtenversand ist noch nicht eingerichtet.“ Eingebaut sind Spam-Schutz (Honeypot-Feld), eine Längenbegrenzung und eine einfache Drosselung pro IP.

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

Für das Kontaktformular musst du nach dem Deploy die Umgebungsvariablen aus dem Abschnitt oben setzen.

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
  layout.tsx            Root-Layout, Font (startet immer hell)
  page.tsx              Server-Komponente → <Simulator />
  api/feedback/route.ts Kontaktformular → E-Mail (Resend) oder Webhook
  globals.css           Tailwind 4, Dark-Mode-Variante, Toast-Animation
components/
  Simulator.tsx         Client-Layout; lädt Startfahrzeug und 3D-Szene (next/dynamic, ssr: false)
  Scene.tsx             <Canvas>, OrbitControls, Auto, Kofferraum-Box, Gepäck
  scene/
    CarModel.tsx        Prozedurales Auto aus echten Maßen (Profile, Radhäuser, Heckklappe/Deckel, Rückbank)
    TrunkZone.tsx       Hellblaue Bounding-Box mit 10-cm-Raster und Maßangaben
    LuggageItem.tsx     Gepäckmodelle, Status-Leuchten, Drag-Start
    DragController.tsx  Raycasting-Drag inkl. Auto-Stapeln und Einrasten
    CameraRig.tsx       Kamera-Presets und Kamerafahrten
    Stage.tsx           Licht, Umgebung (ohne externe HDRI), Boden, Kontaktschatten
  ui/
    VehiclePicker.tsx   Suche + Marke › Modell › Modelljahr › Variante, Datenkarte mit Quellen
    FeedbackButton.tsx  Button unten rechts + Formular
    …                   Sidebar, StatsPanel, ViewToolbar, SelectionBar, Notice
data/
  research/             Rohdaten der Recherche (inkl. Gegenprüfung)
  vehicles/             Erzeugte Datenbank: index.json + eine Datei je Marke
lib/
  cars.ts               3D-Fahrzeugbeschreibung (Typ), Karosserieformen, Lacke
  vehicles/             Datenbank-Typen, Loader, Umrechnung Herstellerdaten → 3D-Modell + Laderaum-Box
  luggage.ts            Gepäck-Typen
  packing.ts            Kollision, Stapeln, Status, Auto-Pack (reine Funktionen, ohne React)
  store.ts              Zustand-Store
scripts/
  build-vehicle-data.mjs  Baut data/vehicles aus data/research
```

### Weitere Fahrzeuge oder echte 3D-Modelle

Neue Fahrzeuge kommen als Rohdaten nach `data/research/`, danach `npm run data` ausführen. Für echte 3D-Modelle kannst du `CarModel` durch ein GLB ersetzen, z. B. mit `useGLTF` aus drei. Kofferraum-Box und Pack-Logik bleiben dabei unverändert, weil sie nur `trunk` der Fahrzeugbeschreibung verwenden.

## Lizenz

© 2026 [ZeroDayRobin](https://github.com/ZeroDayRobin). Lizenziert unter **[Creative Commons Namensnennung – Nicht kommerziell 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/deed.de)**. Den vollständigen Text findest du in [`LICENSE`](LICENSE).

- **Namensnennung:** Wer das Projekt nutzt, weitergibt oder verändert, muss den Urheber „ZeroDayRobin“ mit Link auf dieses Repository nennen, auf die Lizenz hinweisen und Änderungen kenntlich machen.
- **Nicht kommerziell:** Eine kommerzielle Nutzung ist nicht erlaubt. Für eine kommerzielle Lizenz bitte den Urheber kontaktieren.

Abhängigkeiten wie Next.js, React und Three.js stehen unter ihren eigenen Lizenzen. Marken- und Modellnamen sind Marken ihrer Inhaber. Alle Fahrzeugdaten sind ohne Gewähr.
