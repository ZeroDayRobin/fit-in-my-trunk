// Lückenfüller für die Fahrzeugdatenbank (Workflow-Tool von Claude Code).
// Zwei Aufgabentypen je Paket:
//   kind "gaps"      – fehlende Außenmaße / VDA-Volumen einzelner Generationen und Varianten nachrecherchieren
//   kind "loadspace" – Laderaum-Innenmaße (Länge, Breite, Höhe …) für die aktuelle Generation suchen
// Quellen-Rangfolge: Hersteller (offiziell) > ADAC (Autotest/Autokatalog, Messwerte) > nichts. Nie schätzen.
//
// Aufruf: Workflow({ scriptPath: "scripts/research/gaps.workflow.js", args: { searchesPerAgent, tasks: [{ id, kind, brand, items: [...] }] } })
// Ergebnis übernehmen: node scripts/research/extract-results.mjs && npm run data

export const meta = {
  name: 'vehicle-data-gaps',
  description: 'Fill missing car dimensions, VDA trunk volumes and load-space measurements (manufacturer first, ADAC second)',
  phases: [{ title: 'Fill', detail: 'one agent per task package, WebSearch only' }],
}

const FIELDS = [
  'lengthMm', 'widthMm', 'heightMm', 'wheelbaseMm', 'trunkL', 'trunkFoldedL',
  'loadSpace.lengthMm', 'loadSpace.widthMm', 'loadSpace.widthBetweenArchesMm', 'loadSpace.heightMm',
  'loadSpace.openingHeightMm', 'loadSpace.sillHeightMm', 'loadSpace.lengthFoldedMm',
]

const PATCH_SCHEMA = {
  type: 'object',
  properties: {
    patches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'model name exactly as given in the task' },
          generation: { type: 'string', description: 'generation name exactly as given in the task' },
          variant: { type: ['string', 'null'], description: 'variant name exactly as given, or null for the whole generation' },
          field: { type: 'string', enum: FIELDS },
          value: { type: 'number', description: 'mm for dimensions, litres for trunk volumes' },
          sourceUrl: { type: 'string' },
          sourceType: { type: 'string', enum: ['hersteller', 'adac', 'sonstige'] },
          evidence: { type: 'string', description: 'short quote or paraphrase that supports the value' },
        },
        required: ['model', 'generation', 'variant', 'field', 'value', 'sourceUrl', 'sourceType', 'evidence'],
      },
    },
    notFound: { type: 'array', items: { type: 'string' } },
  },
  required: ['patches', 'notFound'],
}

const TOOLS = `TOOLS: Only the WebSearch tool reaches the internet (WebFetch/curl are blocked). Load it with ToolSearch query "select:WebSearch". Prefer mode "extended" and combine several values per query. Search in German and English.`

const RULES = `RULES:
- NEVER guess or estimate. Only report a value that a search result states explicitly; give its URL and a short quote/paraphrase.
- Source priority: 1) official manufacturer data (press kit, technical data, price list, configurator) → sourceType "hersteller"; 2) ADAC (Autotest report or ADAC Autokatalog) when the manufacturer does not publish the value → sourceType "adac"; 3) other serious sources (auto motor und sport, AUTO BILD) only if neither exists → "sonstige".
- Trunk volumes are litres; trunkL = rear seats up (5-seat config), trunkFoldedL = rear seats folded (VDA). For ADAC measured volumes say so in evidence.
- Widths without mirrors. All lengths in millimetres (convert cm → mm).
- Copy model, generation and variant names EXACTLY as given in the task, otherwise the value cannot be matched.
- If a value cannot be found, add it to notFound instead of patching.`

function gapsPrompt(t, budget) {
  return `SEARCH BUDGET: at most ${budget} WebSearch calls (a shared limit applies). Stop when used up and return what you have.

Fill missing data in a German car database (German market). Brand: ${t.brand}. Each line is: model | generation | missing fields | (optional) variants whose trunk volume is missing.
${t.items.map((l) => `- ${l}`).join('\n')}

${TOOLS}

${RULES}`
}

function loadspacePrompt(t, budget) {
  return `SEARCH BUDGET: at most ${budget} WebSearch calls (a shared limit applies). Stop when used up and return what you have.

Find the luggage-compartment INTERIOR dimensions (Laderaum-/Kofferraum-Innenmaße) for these ${t.brand} models (German market). Each line is: model | generation.
${t.items.map((l) => `- ${l}`).join('\n')}

Wanted fields (as patches with variant null):
- loadSpace.lengthMm = Ladelänge / Kofferraumlänge bis zur Rücksitzlehne (Sitze aufrecht)
- loadSpace.widthBetweenArchesMm = Breite zwischen den Radkästen (narrowest width); loadSpace.widthMm = maximale Ladebreite
- loadSpace.heightMm = Höhe des Laderaums (Boden bis Abdeckung/Hutablage) or loadSpace.openingHeightMm = Höhe der Heckklappenöffnung
- loadSpace.sillHeightMm = Ladekantenhöhe; loadSpace.lengthFoldedMm = Ladelänge bei umgeklappter Rückbank
Manufacturers rarely publish these; ADAC Autotest reports (adac.de Autotest PDF, "Innenmaße"/"Kofferraum") usually measure them - use them (sourceType "adac"). VW/Skoda technical data sheets sometimes list them (sourceType "hersteller"). Good queries: "<Modell> ADAC Autotest Kofferraum Innenmaße Ladelänge Ladebreite", "<Modell> Ladelänge Ladebreite zwischen den Radkästen technische Daten".

${TOOLS}

${RULES}`
}

const tasks = (args && args.tasks) || []
const budget = (args && args.searchesPerAgent) || 12

const results = await pipeline(tasks, (t) =>
  agent(t.kind === 'loadspace' ? loadspacePrompt(t, budget) : gapsPrompt(t, budget), {
    label: `${t.kind}:${t.id}`,
    phase: 'Fill',
    schema: PATCH_SCHEMA,
  }),
)

const summary = tasks.map((t, i) => ({
  id: t.id,
  kind: t.kind,
  patches: results[i] ? results[i].patches.length : null,
  adac: results[i] ? results[i].patches.filter((p) => p.sourceType === 'adac').length : null,
  notFound: results[i] ? results[i].notFound.length : null,
}))
for (const s of summary) log(`${s.kind}:${s.id}: ${s.patches} Werte (${s.adac} ADAC), ${s.notFound} nicht gefunden`)
return { summary }
