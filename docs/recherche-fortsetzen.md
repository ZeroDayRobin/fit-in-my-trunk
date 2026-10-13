# Fahrzeug-Recherche fortsetzen

Diese Anleitung richtet sich an eine neue Claude-Code-Session (oder einen Menschen) und beschreibt, wie man die Fahrzeugdatenbank erweitert.

## Stand

- **80/20-Ausbau erledigt:** Pro Marke sind die meistverkauften Modelle enthalten, also die Pakete in `priority` aus `scripts/research/chunks.json`. Varianten sind nach Antrieb zusammengefasst, Generationen beschränken sich auf die aktuelle und die Vorgängergeneration.
- **Für später:** `full` in `chunks.json` listet die komplette Modellpalette 2020–2026. Erledigt sind die Pakete, für die `data/research/<id>.json` existiert.
- **Gegenprüfung:** Die meisten Pakete sind bisher nur plausibilitätsgeprüft (Warnungen in `data/research/_build-report.json`). Der Workflow kann zusätzlich eine unabhängige Prüfung pro Paket fahren (`"verify": true`), das verdoppelt aber den Suchbedarf.

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

## Beispiel-Prompt für eine neue Session

> Lies docs/recherche-fortsetzen.md und führe die Recherche-Workflows für die noch offenen Pakete aus `full` durch, inklusive Gegenprüfung. Danach Daten übernehmen, testen und pushen.
