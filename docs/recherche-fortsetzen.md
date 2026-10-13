# Fahrzeug-Recherche fortsetzen

Diese Anleitung richtet sich an eine neue Claude-Code-Session (oder einen Menschen) und beschreibt, wie man die Fahrzeugdatenbank erweitert.

## Stand

- **80/20-Ausbau erledigt:** Pro Marke sind die meistverkauften Modelle enthalten, also die Pakete in `priority` aus `scripts/research/chunks.json`. Varianten sind nach Antrieb zusammengefasst, Generationen decken die Modelljahre 2020–2026 ab.
- **Variante B erledigt (Oktober 2026):** Alle 23 Pakete aus `chunks-history-2005.json` sind recherchiert und unabhängig gegengeprüft (`data/research/h-*.json`). Dazu kamen 159 Vorgängergenerationen (von 144 auf 303 Generationen, Varianten von 576 auf 1080). Die Hauptquelle ist meist der ADAC-Autokatalog mit Herstellerangaben, weil sich alte Pressemappen per Websuche selten finden. Schwach belegte Korrekturen (nur eine Spec-Datenbank, widersprüchlich) wurden verworfen. Lückenfüller: `data/research/patches/gap-h-*.json`.
  - Offene Lücken (null, nirgends belegt): umgeklappte Volumen der Limousinen BMW 3er E46–F30, C-Klasse W203–W205, CLA C117 und Passat B6/B7, außerdem RAV4 XA20. Kofferraum mit 5 Sitzen bei Caddy 3/4 Maxi, Multivan T5 und T6 lang. Radstand des Focus Turnier 3 Facelift.
  - Fehlende Generationen: RAV4 XA30 Facelift (2009–2013; ADAC nennt 586/1752 l, aber Breite und Höhe sind unbelegt) und Polo IV 9N vor dem Facelift. Die Gegenprüfer haben außerdem einzelne fehlende Varianten gemeldet (z. B. Cupra-, RS- und AMG-Versionen), siehe `verification.missing` in `h-*.json`.
- **Für später:** `full` in `chunks.json` listet die komplette Modellpalette 2020–2026. Erledigt sind die Pakete, für die `data/research/<id>.json` existiert.
- **Gegenprüfung:** Die meisten Pakete sind bisher nur plausibilitätsgeprüft (Warnungen in `data/research/_build-report.json`). Der Workflow kann zusätzlich eine unabhängige Prüfung pro Paket fahren (`"verify": true`), das verdoppelt aber den Suchbedarf.

## Variante B: Vorgängergenerationen ab Modelljahr 2005

Ziel: Für die vorhandenen Modelle alle fehlenden Generationen mit Modelljahren 2005–2019 ergänzen, damit man z. B. „Golf > 2010“ wählen kann.

- **Pakete:** `scripts/research/chunks-history-2005.json` (23 Pakete, 56 Modelle, erzeugt von `node scripts/research/make-history-chunks.mjs`). Neue Baureihen ohne gleichnamigen Vorgänger (ID.-Modelle, Karoq, GLC …) stehen unter `skipped` und werden nicht recherchiert.
- **Quellen:** Herstellerdaten aus der Zeit (Pressemappen, Archiv-Preislisten) zuerst. ADAC nur als Ersatz für einzelne fehlende Werte, mit Quelle. Nie schätzen.
- **Zusammenführen:** `npm run data` hängt die Generationen aus `data/research/h-*.json` an die bestehenden Modelle an. Bestehende Generationen werden nie ersetzt. Doppelte (gleicher Name oder gleiches Startjahr) werden übersprungen, Überschneidungen landen als Warnung im Report.
- **Jahresauswahl:** `OLDEST_YEAR` steht in `lib/vehicles/spec.ts` und `scripts/build-vehicle-data.mjs` bereits auf 2005.

Ablauf:

1. Pakete auf 5 Workflows verteilen und alle gleichzeitig starten. Pro Workflow laufen 2 Agenten parallel, mit Gegenprüfung sind es 8–10 Agenten je Workflow. Bei 23 Paketen × 20 Suchen × 2 (Sammeln + Prüfen) sind das rund 920 Suchen, das passt in ein Limit von 5000 pro Session.
   ```
   Workflow({
     scriptPath: "scripts/research/vehicle-data.workflow.js",
     args: { verify: true, searchesPerAgent: 20, chunks: [ <4–5 Pakete aus chunks-history-2005.json, unverändert inkl. history/existing> ] }
   })
   ```
2. Wenn alle fertig sind: `node scripts/research/extract-results.mjs && npm run data`.
3. Report `data/research/_build-report.json` prüfen. Überschneidungen und unplausible Werte in `data/research/h-*.json` korrigieren oder entfernen, dann erneut `npm run data` ausführen.
4. Optional fehlende Einzelwerte der neuen Generationen mit `scripts/research/gaps.workflow.js` nachrecherchieren (`kind: "gaps"`, Paket-IDs `gap-h-…`).
5. `npx eslint . && npx tsc --noEmit && npm run build`, dann im Browser z. B. VW Golf 2010 (Golf VI), BMW 3er Touring 2008 und Opel Mokka 2017 auswählen. Danach committen und auf `main` pushen.

## Rahmenbedingungen

- Im Cloud-Container ist das Internet gesperrt (kba.de, adac.de und die Herstellerseiten sind blockiert). Recherchiert wird ausschließlich über das **WebSearch-Tool**.
- Ohne Anpassung sind es **200 Websuchen pro Antwortrunde**, geteilt von allen Agenten. Ein Paket mit 5–7 Modellen braucht etwa 12 Suchen im schlanken Modus und rund 20 mit Gegenprüfung.
- Wer mehr pro Runde will, setzt in den Umgebungseinstellungen `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` (z. B. `5000`). Das wirkt erst in einer neuen Session.
- Werte werden nie geschätzt. Fehlt etwas, bleibt es `null`, und die App schätzt dann nur die Laderaum-Box.

## Ablauf

1. **Pakete wählen:** Aus `full` in `scripts/research/chunks.json` die Pakete ohne `data/research/<id>.json` auswählen. Für die Gegenprüfung bereits gesammelter Pakete deren `data` aus `data/research/<id>.json` als Feld `data` mitgeben, dann wird nur geprüft.
2. **Workflow starten** (die Session braucht dafür die ausdrückliche Freigabe des Nutzers für Workflows). Es laufen etwa 2 Agenten pro Workflow gleichzeitig, mehrere Workflows parallel sind möglich:
   ```
   Workflow({
     scriptPath: "scripts/research/vehicle-data.workflow.js",
     args: { verify: false, searchesPerAgent: 12, chunks: [ { id, brand, models: [...] }, ... ] }
   })
   ```
   Budget-Regel: Anzahl Pakete × `searchesPerAgent` muss unter dem Suchlimit der Runde bleiben.
3. **Ergebnisse übernehmen:**
   ```bash
   node scripts/research/extract-results.mjs   # Journale → data/research/<id>.json
   npm run data                                # → data/vehicles/*.json + Report
   ```
4. **Report prüfen:** In `data/research/_build-report.json` stehen Warnungen (unplausible Werte) und nicht automatisch anwendbare Korrekturen. Auffällige Werte manuell in `data/research/<id>.json` korrigieren oder auf `null` setzen, dann erneut `npm run data` ausführen.
5. **Testen und pushen:** `npx eslint . && npx tsc --noEmit && npm run build`, die App kurz im Browser prüfen, dann committen und pushen.

## Beispiel-Prompts für eine neue Session

> Lies docs/recherche-fortsetzen.md und führe Variante B (Vorgängergenerationen ab 2005) mit parallelen Recherche-Workflows durch, inklusive Gegenprüfung. Danach Daten übernehmen, testen und auf main pushen.

> Lies docs/recherche-fortsetzen.md und führe die Recherche-Workflows für die noch offenen Pakete aus `full` durch, inklusive Gegenprüfung. Danach Daten übernehmen, testen und pushen.
