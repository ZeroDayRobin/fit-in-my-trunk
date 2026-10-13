// Recherche-Workflow für die Fahrzeugdatenbank (für das Workflow-Tool von Claude Code).
// Je Paket (Marke + Modellliste): ein Agent sammelt offizielle Daten per Websuche,
// ein zweiter, unabhängiger Agent prüft jeden Wert gegen (Pipeline, kein Warten zwischen Paketen).
//
// Aufruf: Workflow({ scriptPath: "scripts/research/vehicle-data.workflow.js", args: <Inhalt einer batch-N.json> })
// Anleitung: docs/recherche-fortsetzen.md

export const meta = {
  name: 'vehicle-data-collect',
  description: 'Collect and adversarially verify official German-market car dimensions and trunk volumes per brand chunk',
  phases: [
    { title: 'Databases', detail: 'multi-angle sweep for public vehicle/trunk databases' },
    { title: 'Collect', detail: 'one agent per brand chunk, WebSearch only' },
    { title: 'Verify', detail: 'independent re-check of every dimension/trunk value' },
  ],
}

const BODY_TYPES = ['hatchback', 'sedan', 'wagon', 'suv', 'suv-coupe', 'coupe', 'convertible', 'van']
const POWERTRAINS = ['petrol', 'diesel', 'mhev', 'hev', 'phev', 'bev', 'cng', 'lpg', 'fcev']
const num = { type: ['number', 'null'] }
const SOURCE = { type: 'object', properties: { url: { type: 'string' }, what: { type: 'string' } }, required: ['url', 'what'] }
const VARIANT = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'German-market variant name as in price list, e.g. "VZ e-HYBRID 272 PS" or "1.5 TSI 150 PS DSG"' },
    powertrain: { type: 'string', enum: POWERTRAINS },
    powerPs: num,
    awd: { type: 'boolean' },
    trunkL: { type: ['number', 'null'], description: 'VDA trunk volume in litres, rear seats up (5-seat config)' },
    trunkFoldedL: { type: ['number', 'null'], description: 'VDA max volume with rear seats folded' },
    lengthMm: num, widthMm: num, heightMm: num,
    yearFrom: num, yearTo: num,
    notes: { type: 'string' },
  },
  required: ['name', 'powertrain', 'trunkL', 'trunkFoldedL'],
}
const GENERATION = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'e.g. "Mk8 (Facelift)" or "KM"' },
    yearFrom: { type: 'number', description: 'first German model year' },
    yearTo: { type: ['number', 'null'], description: 'last model year, null if current' },
    bodyType: { type: 'string', enum: BODY_TYPES },
    lengthMm: num, widthMm: num, heightMm: num, wheelbaseMm: num,
    trunkL: num, trunkFoldedL: num,
    loadSpace: {
      type: ['object', 'null'],
      properties: {
        lengthMm: num, widthMm: num, widthBetweenArchesMm: num, heightMm: num, openingHeightMm: num,
        sillHeightMm: num, lengthFoldedMm: num, source: { type: 'string' },
      },
    },
    variants: { type: 'array', items: VARIANT },
    sources: { type: 'array', items: SOURCE },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string' },
  },
  required: ['name', 'yearFrom', 'yearTo', 'bodyType', 'lengthMm', 'widthMm', 'heightMm', 'wheelbaseMm', 'trunkL', 'trunkFoldedL', 'variants', 'sources', 'confidence'],
}
const CHUNK_SCHEMA = {
  type: 'object',
  properties: {
    models: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          brand: { type: 'string' },
          model: { type: 'string', description: 'model incl. body style, e.g. "Leon Sportstourer"' },
          generations: { type: 'array', items: GENERATION },
        },
        required: ['brand', 'model', 'generations'],
      },
    },
    notFound: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['models', 'notFound'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          model: { type: 'string' }, generation: { type: 'string' }, variant: { type: ['string', 'null'] },
          field: { type: 'string' }, oldValue: {}, newValue: {}, sourceUrl: { type: 'string' }, evidence: { type: 'string' },
        },
        required: ['model', 'generation', 'field', 'oldValue', 'newValue', 'sourceUrl', 'evidence'],
      },
    },
    missing: { type: 'array', items: { type: 'object', properties: { model: { type: 'string' }, detail: { type: 'string' } }, required: ['model', 'detail'] } },
    checkedValues: { type: 'number' },
    confirmedValues: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['corrections', 'missing', 'checkedValues', 'confirmedValues'],
}

const TOOLS_NOTE = `TOOLS: Only the WebSearch tool can reach the internet here (WebFetch, curl etc. are blocked by the network policy - do not try them). Load it first with ToolSearch query "select:WebSearch". Use mode "standard" for normal lookups and "extended" when results are thin or conflicting. Issue several independent searches in parallel in one turn to save time. Search in German and English (e.g. "<Modell> Kofferraumvolumen Liter technische Daten", "<Modell> Abmessungen Länge Breite Höhe Radstand", "<Modell> e-Hybrid Kofferraum").`

const RULES = `RULES:
- NEVER invent or guess a number. If a value cannot be found, set it to null and explain in notes.
- Use official manufacturer data (press kit / Pressemappe, technische Daten, Preisliste, configurator) first; ADAC Autokatalog/Autotest second; major German car magazines (auto motor und sport, AUTO BILD, autozeitung) third. Record the URL of every source you used (from the search results) with what it supports.
- Trunk volumes are VDA litres. trunkL = rear seats up, 5-seat configuration (for 7-seaters with the 3rd row folded; note the 7-seat value). trunkFoldedL = max with rear seats folded. For BEVs give the rear trunk only and mention a frunk in notes.
- Plug-in hybrids, 4x4 and some mild-hybrid/BEV variants often have a SMALLER trunk than the base car - check this per powertrain and give each variant its own trunkL/trunkFoldedL.
- Width = without mirrors. Give per-variant lengthMm/heightMm/widthMm only where they differ from the generation (e.g. sporty trims, off-road trims).
- Generations: the current generation, plus the predecessor if the generation changed after 2020 (model years 2020 to 2026). Split a facelift into its own entry when dimensions or trunk volume changed; otherwise note it. yearTo = null for the current generation.
- Variants: one entry per powertrain group as named in German price lists (e.g. "1.5 TSI (Benziner)", "2.0 TDI (Diesel)", "eHybrid (Plug-in-Hybrid)", "4MOTION", "Elektro 77 kWh") plus well-known sporty/named trims (GTI, R, VZ, AMG, M, RS, VZ e-HYBRID). Only split further when trunk volume or dimensions differ. At most ~8 variants per generation.
- Separate body styles are separate models (e.g. "Golf" and "Golf Variant", "A3 Sportback" and "A3 Limousine").
- loadSpace: only fill if published load-floor measurements exist (Ladelänge bis Rücksitz, Ladebreite / zwischen Radkästen, Ladehöhe / Höhe Gepäckraumöffnung, Ladekantenhöhe, Ladelänge bei umgeklappter Rückbank). Otherwise null.
- Passenger cars only (no pure commercial panel vans / pickups).`

function collectPrompt(c) {
  const budget = (args && args.searchesPerAgent) || 12
  return `SEARCH BUDGET: at most ${budget} WebSearch calls in total for this task (a shared limit applies to all agents). Prefer mode "extended" queries that ask for dimensions AND trunk volumes of several powertrains at once. Stop searching when the budget is used and return what you have (unknown values = null).

You are compiling a factual vehicle database for a German web app that simulates packing luggage into car trunks. Brand: ${c.brand}.
Models to cover: ${c.models.join('; ')}.
If you notice another ${c.brand} passenger-car model/body style that belongs to the same segment and is clearly missing from all lists you were given, add it.

${TOOLS_NOTE}

${RULES}

Return the structured result. Every generation needs sources. Put anything you could not find into notFound (e.g. "Golf Variant 2020 eTSI trunk volume").`
}

function verifyPrompt(c, data) {
  return `You are an independent, skeptical fact-checker. Another agent compiled the following ${c.brand} data (German market) for a trunk-packing app. Your job is to try to REFUTE it.

DATA:
${JSON.stringify(data)}

For EVERY generation, independently re-check via your own searches (do not trust the given sources): lengthMm, widthMm (without mirrors), heightMm, wheelbaseMm, trunkL, trunkFoldedL, and each distinct per-variant trunkL/trunkFoldedL (especially plug-in hybrid, 4x4, BEV variants). Also check yearFrom/yearTo and whether any generation or important German-market variant (e.g. e-HYBRID, VZ, GTI, RS, 4MOTION, xDrive, AMG, N, e-tron) is missing.
Report a correction only when you have a source that clearly contradicts the value (give the URL and a short quote or paraphrase). If sources disagree, prefer the manufacturer's official figure. If a value is null but you found it, report it as a correction with oldValue null.

${TOOLS_NOTE}

Count every value you checked (checkedValues) and how many were confirmed (confirmedValues).`
}

const DB_ANGLES = [
  {
    key: 'open-apis',
    prompt: `Research question: Is there a PUBLIC, freely accessible database or API (open data) that provides official car dimensions AND trunk/luggage volume (ideally also load-space length/width/height) for cars sold in Germany/Europe, with brand > model > model year > variant structure? Examine at least: CarQuery API, NHTSA vPIC, fueleconomy.gov (US EPA luggage volume), Wikidata (cargo volume properties), EU EEA CO2 monitoring dataset, KBA open data, GitHub/Kaggle car spec datasets, OpenData portals (GovData), Euro NCAP, any "car specs API" on GitHub. For each: URL, access method (API/download), license/terms, which fields exist (esp. trunk volume VDA, load space dims), EU/German coverage, freshness (2020-2026 models), and verdict for our use.
${TOOLS_NOTE}
Return a concise markdown report with a comparison table and a recommendation.`,
  },
  {
    key: 'german-editorial',
    prompt: `Research question: Which German/European sources publish official per-variant vehicle data incl. Kofferraumvolumen (VDA) and Laderaum-Innenmaße (Ladelänge, Ladebreite, Ladehöhe), and can they legally be used as a data source for a web app? Examine: ADAC Autokatalog/Autodatenbank (structure Marke > Modell > Baureihe > Variante, fields, terms of use, any API/licensing offer), ADAC Autotest (measured trunk dimensions), auto motor und sport Datenbank, AUTO BILD Datenbank, autozeitung, auto-data.net, ultimatespecs, carsized.com (trunk dimensions?), automobile-catalog.com, mobile.de/autoscout24 Daten, manufacturer price lists/technical data PDFs and press kits (VW, Mercedes, BMW, Skoda, Audi, Seat/Cupra, Opel, Ford, Hyundai, Toyota). Also consider EU database rights (sui generis Datenbankschutz, §87b UrhG) for extracting from ADAC & co.
${TOOLS_NOTE}
Return a concise markdown report: per source - URL, fields (esp. trunk volume & load-space dims), structure, access (API? scraping allowed?), license/terms, cost; then a recommendation for a legally sound approach.`,
  },
  {
    key: 'commercial-apis',
    prompt: `Research question: Which commercial or freemium vehicle-specification APIs provide European (German) market data incl. trunk/cargo volume (VDA litres) and ideally load-space dimensions, with brand > model > year > variant (trim/engine) structure? Examine at least: DAT (Deutsche Automobil Treuhand) SilverDAT/DAT Europa-Code, Schwacke/Autovista (incl. Autovista Group "Vehicle Specifications"), JATO Dynamics, Autodata, Car API (carapi.app), Vehicle Databases (vehicledatabases.com), auto-data.net API, CarQuery, "Cars Technical Specifications API" (RapidAPI), Edmunds/Motor Trend (US), any others you find. For each: URL, data fields (trunk volume? load dims? exterior dims?), EU coverage, pricing/free tier, license terms for display in a public web app.
${TOOLS_NOTE}
Return a concise markdown report with a comparison table and a recommendation (best free option, best paid option).`,
  },
]

const chunks = (args && args.chunks) || []
const doDb = Boolean(args && args.dbResearch)

const dbPromise = doDb
  ? parallel(DB_ANGLES.map((d) => () => agent(d.prompt, { label: `db:${d.key}`, phase: 'Databases' }).then((r) => ({ key: d.key, report: r }))))
  : Promise.resolve([])

// Pakete mit mitgelieferten Daten (c.data) werden nur noch gegengeprüft
const results = await pipeline(
  chunks,
  (c) => (c.data ? Promise.resolve(c.data) : agent(collectPrompt(c), { label: `collect:${c.id}`, phase: 'Collect', schema: CHUNK_SCHEMA })),
  (data, c) =>
    args && args.verify === false
      ? { id: c.id, brand: c.brand, data, verification: null }
      : agent(verifyPrompt(c, data), { label: `verify:${c.id}`, phase: 'Verify', schema: VERIFY_SCHEMA }).then((v) => ({ id: c.id, brand: c.brand, data, verification: v })),
)

const db = await dbPromise
for (const r of results) {
  if (!r) continue
  const gens = (r.data && r.data.models ? r.data.models : []).reduce((n, m) => n + m.generations.length, 0)
  log(`${r.id}: ${r.data ? r.data.models.length : 0} models, ${gens} generations, ${r.verification ? r.verification.corrections.length : 'no'} corrections`)
}
const dropped = chunks.filter((c, i) => !results[i]).map((c) => c.id)
if (dropped.length) log(`WARNING: chunks without result: ${dropped.join(', ')}`)
// Die vollständigen Daten liegen im journal.jsonl des Laufs (scripts/research/extract-results.mjs liest sie aus).
// Zurückgegeben wird nur eine kompakte Übersicht, damit die Benachrichtigung klein bleibt.
const summary = results.filter(Boolean).map((r) => ({
  id: r.id,
  models: r.data ? r.data.models.length : 0,
  generations: r.data ? r.data.models.reduce((n, m) => n + m.generations.length, 0) : 0,
  notFound: r.data && r.data.notFound ? r.data.notFound.length : 0,
  corrections: r.verification ? r.verification.corrections.length : null,
  checked: r.verification ? r.verification.checkedValues : null,
  confirmed: r.verification ? r.verification.confirmedValues : null,
}))
return { db, summary, dropped }
