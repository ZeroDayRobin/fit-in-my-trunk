# Recherche: Datenquellen für Fahrzeugmaße und Kofferraumvolumen

> Automatisch erstellte Recherche-Berichte (Oktober 2026). Als *unverified* markierte Punkte wurden nicht abschließend geprüft. Keine Rechtsberatung.

## Public data sources for official car dimensions and trunk volume (Germany/EU)

**Answer:** No free, openly licensed database or API gives official trunk volume (VDA, in litres) and load-space dimensions for German-market cars in a brand > model > model year > variant structure. Official exterior dimensions are available as open data. Official VDA trunk volume and load-space length, width and sill height are not open anywhere. They only appear in manufacturer spec sheets and price lists, or in paid databases.

Note: I ran out of web searches before I could confirm the exact RDW field names, its units and whether its API can be called from a browser. Items marked *(unverified)* come from memory or second-hand sources and should be checked before relying on them.

## Comparison

| Source | Access | License | Dimensions | Trunk / load space | Germany/EU coverage | 2020–2026 data | Verdict |
|---|---|---|---|---|---|---|---|
| **RDW Open Data, Netherlands** (`opendata.rdw.nl`, dataset `m9d7-ebf2`) | Socrata API (JSON/CSV/XML) plus bulk download; 16.9M rows, 98 columns | **CC0** | `lengte`, `breedte`, `hoogte_voertuig`, `wielbasis`, each with min/max *(names from a second-hand CSV header; units probably cm, unverified)*. Also make (`merk`), model name (`handelsbenaming`), variant/version | None | Every car registered in NL, which in practice covers almost all EU-approved models also sold in Germany | Yes, updated continuously *(daily, unverified)* | **Best open source for official exterior dimensions.** Only a cross-check, no trunk |
| **EEA CO2 monitoring, passenger cars** | CSV/SQL download per year (2025 provisional published 25 Jun 2026) | EEA material is CC BY unless stated otherwise | Wheelbase `W (mm)`, track widths `At1`/`At2 (mm)`, masses `M`/`Mt`. **No length, width or height** | None | All EU registrations; can be filtered to Germany *(country field `Ms`, unverified)* | Yes, up to 2025 provisional | **Good for building the real variant list** (make `Mk`, model name `Cn`, type/variant/version, fuel, power), not for sizes |
| CarQuery API | JSONP API; full database as paid CSV/SQL | API free, database paid | `model_length_mm`, `model_weight_kg`, `model_wheelbase_mm` confirmed in the docs; width/height *(from memory)* | No trunk field found | Mixed, mostly older | Stale *(ends around 2020–22, unverified)*; no CORS, so it can't be called from a browser | Not suitable |
| NHTSA vPIC | Free REST API, no key; 144 VIN-decoder variables | US government | Truck bed length etc. | No cargo volume | US only | Yes | Not suitable |
| fueleconomy.gov (EPA) | CSV/XML/REST | US government *(public domain, unverified)* | None | `hlv`, `lv2`, `lv4` luggage volume in **cubic feet**, using the US SAE method, not VDA; often empty for SUVs *(unverified)* | US variants only | Yes | Not suitable (wrong market and measurement method) |
| Wikidata | SPARQL query | CC0 | Length P2043, width P2049, height P2048, wheelbase P3039 | **No trunk property found**, only the generic volume property P2234 | Model level, sparse | Patchy | Not suitable |
| KBA (German vehicle authority) | Official make/type code list as half-yearly PDF; other formats only as **paid** custom work; eCoC lookup only per individual VIN | Not open data | CoC certificates contain dimensions, but only per VIN | CoC has no trunk volume | Germany | — | Not suitable |
| GovData.de | — | — | No relevant dataset found | — | — | — | Nothing there |
| Euro NCAP | PDF datasheets only, no API | Not open | — | — | EU | — | Not suitable |
| ADAC Autokatalog | Web tables, no public API | Not open | — | ADAC's **own measured** volumes for about 290 models, using a different method (lower than manufacturer figures) | Germany | Yes | Reference only |
| autoseeker.eu open data | CSV/JSON dump | **CC BY 4.0** | None | `boot` field (litres, manufacturer figures), per model generation, not per variant | 281 models across EU brands | Generated 2026-07-18 | **Useful to cross-check trunk volume per model**, with attribution |
| vehiclesdb (GitHub) | JSON/CSV/Parquet/SQLite | CC BY 4.0 | None found in its schema | None | Built from official registers of 14 countries | Release 2026.10.2 | Model names only |
| gor3a/vehicle-makes-models (GitHub) | JSON/CSV/SQLite, refreshed weekly | ODbL (share-alike), scraped from autoevolution | Not in the sample | None | Global, makes > models > generations > engines | Yes | Model names only; license and origin are risky |
| Qatar Cars, Kaggle 1945–2020, ElyesDer Vehicle-data-DB, ilyasozkurt scraper | GitHub/Kaggle/CRAN | Mixed or unknown; some scraped | Partly | Some have a trunk field | Qatar-, US- or globally-scraped | Old or small | Not suitable |
| Paid: auto-data.net API, cars-data.com API, car2db, EV Database, Autodata, DAT/JATO, vbalagovic ($499) | API or download | Proprietary | Yes | Some have trunk volume | EU | Yes | Only an option if the project pays a license |

## Recommendation

1. **Ship a hand-curated static JSON file in the repo.** Don't call any API at runtime: none of the open sources has the trunk data, CarQuery has no browser support, and every source has rate limits or goes stale. Structure: `brand > model > modelYear > variant > {length, width, height, wheelbase, trunkL_VDA, trunkMaxL_VDA, loadLength, loadWidthBetweenWheelArches, sillHeight, source, sourceDate}`.
2. **Variant list:** take it from manufacturer German price lists and configurators. The EEA dataset (filtered to Germany) can check that the variants are real and registered (model name, type/variant/version, fuel, kW).
3. **Exterior dimensions:** use the manufacturer's official technical data, cross-checked against RDW (CC0) length/width/height/wheelbase.
4. **Trunk (VDA) and load-space dimensions:** these can only come from the manufacturer's technical data or price-list PDFs, entered by hand for each variant. This matters because plug-in hybrids such as the Cupra Formentor VZ e-Hybrid usually have a smaller trunk than the combustion versions. autoseeker.eu (CC BY 4.0, with attribution) can sanity-check the litres per model.
5. **Keep a source URL and date on every entry.** Where no official load-space dimension exists, mark the field `null` rather than estimating it.

## Sources
- [EEA CO2 cars data (2018 final)](https://www.eea.europa.eu/data-and-maps/data/co2-cars-emission-18/co2-emissions-cars-2018-final), [EEA cars series](https://www.eea.europa.eu/data-and-maps/data/co2-cars-emission-22), [EEA 2025 news](https://www.eea.europa.eu/en/newsroom/news/average-co2-emissions-from-new-cars-and-vans-significantly-decreased-in-2025), [EEA metadata 2025P](https://sdi.eea.europa.eu/catalogue/api/records/b4044b06-2e6b-4f8e-a6e6-66e0e98bb0dd/attachments/CO2%20from%20cars%20and%20vans_Stastical%20metadata_2025P.pdf), [EEA legal notice (CC BY)](https://climate-adapt.eea.europa.eu/en/legal-notice)
- [RDW Gekentekende_voertuigen](https://opendata.rdw.nl/Voertuigen/Open-Data-RDW-Gekentekende_voertuigen/m9d7-ebf2), [data.overheid.nl entry](https://data.overheid.nl/dataset/11441-open-data-rdw--gekentekende-voertuigen), [RDW CSV header copy](https://assets.website-files.com/64ce9c5ce8c576bff03b6136/64d26b4d6646af69725b626a_Open_Data_RDW__Gekentekende_voertuigen.csv)
- [CarQuery API usage](http://www.carqueryapi.com/documentation/api-usage/), [CarQuery downloads](https://www.carqueryapi.com/downloads/), [jtlwheeler/CarQuery](https://github.com/jtlwheeler/CarQuery)
- [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/), [vPIC variable list](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablelist?format=xml)
- [fueleconomy.gov web services](https://www.fueleconomy.gov/feg/ws/index.shtml), [download page](https://www.fueleconomy.gov/feg/download.shtml), [EPA volume guide](https://fueleconomy.gov/feg/pdfs/guides/volume.pdf)
- [Wikidata P2234](https://www.wikidata.org/wiki/Property:P2234), [DBpedia wheelbase ↔ P3039](https://dbpedia.org/ontology/wheelbase)
- [KBA CoC and type data](https://www.kba.de/EN/Themen_en/Typgenehmigung_en/CoC_Daten_Fahrzeugtypdaten_en/CoC_Daten_Fahrzeugtypdaten_node_en.html), [firmenauto eCoC](https://www.firmenauto.de/branche/kba-ecoc-fahrzeugdaten-online-per-fahrgestellnummer-abrufen-und-herunterladen/), [Autohaus eCoC](https://www.autohaus.de/nachrichten/autohandel/elektronische-uebereinstimmungserklaerung-kba-digitalisiert-die-coc-3827368)
- [Euro NCAP TB 018](https://cdn.euroncap.com/media/32296/tb-018-manufacturer-data-v11.pdf)
- [ADAC trunk-volume test 2026](https://www.adac.de/rund-ums-fahrzeug/autokatalog/autotest/kofferraumvolumen-vergleich-2026/)
- [EV Database data services](https://ev-database.org/data-services-api)
- [autoseeker.eu open data](https://autoseeker.eu/en/data/), [vehiclesdb](https://github.com/vehiclesdb/vehiclesdb), [gor3a/vehicle-makes-models](https://github.com/gor3a/vehicle-makes-models), [vbalagovic/cars-dataset](https://github.com/vbalagovic/cars-dataset), [Qatar Cars](https://archive.linux.duke.edu/cran/web/packages/qatarcars/readme/README.html), [Kaggle 1945–2020 mirror](https://baselight.app/u/kaggle/dataset/jahaidulislam_car_specification_dataset_1945_2020), [Opendatabay dataset](https://www.opendatabay.com/data/ai-ml/77731fb5-141f-4ebe-9ee7-1c06b133d99e), [ElyesDer/Vehicle-data-DB](https://github.com/ElyesDer/Vehicle-data-DB), [ilyasozkurt specs DB](https://dev.to/ilyasozkurt/automobile-manufacturers-models-and-specs-database-42ch)
- [cars-data.com API terms](https://cars-data.com/en/api/terms), [auto-data.net API](https://api.auto-data.net/), [car2db](https://car2db.com/api/), [Autodata API](https://www.autodata-group.com/corporate/api/), [Teoalida](https://www.teoalida.com/cardatabase/)
## Vehicle data sources for trunk volume and load-space dimensions (DE/EU): what exists and what may legally be used

**Scope note:** The shared web-search budget ran out before I finished. These points are **unverified** and come from background knowledge or are open: UltimateSpecs terms, whether carsized.com has trunk fields, the AUTO BILD and autozeitung databases, JATO, and the specific press kits for Mercedes, Opel, Ford, Hyundai, Toyota and Audi. This is not legal advice.

## Bottom line
- No source I found is free, openly licensed **and** has per-variant VDA trunk volume plus Ladelänge, Ladebreite and Ladehöhe. The open EU data (EEA CO2 dataset) has no trunk data.
- **ADAC Autokatalog** matches the hierarchy the user asked for exactly (Marke > Modell > Generation > Variante with build period). It has no API or licence offer, and its imprint forbids reuse. Use it only to look up single values by hand.
- **Recommended:** build our own curated dataset by hand from **manufacturer primary sources**, store a source for every value, and do not scrape anything. The paid option is cars-data.com.

## Sources

### ADAC Autokatalog: https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/
- **Structure:** `/marken-modelle/{marke}/{modell}/{generation}/{variant-id}/`. Examples:
  - `cupra/formentor/1generation/327060` = "1.4 e-HYBRID VZ Tribe Edition DSG (01/23 - 07/24)"
  - `cupra/formentor/1generation-facelift/349374` = "1.5 e-HYBRID VZ Tribe Edition DSG (ab 02/26)"
  - Model year maps to the build period, and facelifts get their own generation slug.
- **Fields:**
  - Kofferraumvolumen normal, fensterhoch with the rear seat folded, and dachhoch with the rear seat folded. Examples: Golf VI GTI 350 / 1305 l; Astra J ST 500 / 1000 / 1550 l; Formentor 1.4 e-Hybrid 345 / 1415 l.
  - Länge, Breite, Höhe and Radstand, and whether the rear seat folds.
  - These are manufacturer figures. I found **no Ladelänge or Ladebreite** in the catalogue.
- **Access:** no public API and no B2B licence found. The only scraper I found is a third-party Apify actor (`rainminer/adac-de-scraper`), not an ADAC offering.
- **Terms:** the ADAC imprint says adac.de content is protected and use without the consent of ADAC e.V. is forbidden, including reproduction, distribution and making it publicly available. The investment behind the catalogue very likely gives it sui generis database protection (§87a ff. UrhG).
- **Cost:** free to view only.

### ADAC Autotest PDFs and trunk test
- **URLs:** PDFs follow `https://assets.adac.de/image/upload/Autodatenbank/Autotest/AT{nr}_{slug}/{slug}.pdf` (examples: AT6505 Enyaq, AT5366 Touran). The trunk comparison is at https://www.adac.de/rund-ums-fahrzeug/autokatalog/autotest/kofferraumvolumen-vergleich-2026/.
- **Fields (measured by ADAC):**
  - Volume by foam blocks: up to the cover, dachhoch, and with the seats folded.
  - Ladekante height (Enyaq 68 cm, Touran 63 cm, 3er Touring 63 cm).
  - Max load length with the seat folded, cited in a forum as 1.66 m for one model.
  - The comparison covers about 290 models: manufacturer value vs ADAC value vs ADAC dachhoch.
- **Coverage:** one tested variant per model, not per variant. These are ADAC's own measurements, so they are more strongly protected (investment in obtaining the data). Use them only as a manual cross-check and cite them. Do not copy them in bulk.

### auto motor und sport
- **URLs:** https://www.auto-motor-und-sport.de/marken-modelle/{marke}/{modell}/technische-daten, plus `/autovergleich/{id}/` pages and professional.auto-motor-und-sport.de.
- **Fields:** a trunk volume range per variant, engine, power and price.
- **Access and terms:** no API found. The content belongs to Motor Presse Stuttgart and is protected. Its data supplier is unknown (possibly DAT or JATO, unverified). Do not extract from it.

### AUTO BILD and autozeitung
- Not verified. Searches only returned editorial articles (autozeitung reporting on the ADAC trunk test). No open database and no API found.

### AutoScout24 / mobile.de
- **URLs:** https://www.autoscout24.de/auto/technische-daten/{marke}/{modell}/ lists generations, then variants.
- **Fields:** a trunk volume range (for example Leon ST 480–1460 l, Kodiaq 5 generations) and exterior dimensions.
- **Access:** no spec API. The data supplier is unknown (Schwacke was used historically). mobile.de only has magazine articles.
- **Terms:** I did not check them. Assume scraping is forbidden.

### auto-data.net
- **Structure:** Marke > Modell > Generation > Modification.
- **Fields:** trunk minimum and maximum (from my knowledge). No load-space dimensions.
- **Access and terms:** free and ad-funded, no API. The terms of use (ES/BG versions) **forbid automated extraction by bots, scripts or crawlers without written permission**, and forbid using the data for AI. Not usable.

### UltimateSpecs
- Cargo volume per variant (from my knowledge). Terms **not verified**, no API known. Treat it like auto-data.net.

### carsized.com
- A tool that compares exterior sizes at scale (front, side, rear views). It probably also shows trunk volume, but I could not confirm that or any load-space dimensions.
- No API. Reviewers note limited coverage.

### automobile-catalog.com
- A free reference database of cars since 1945, focused on specs and performance. No licensing offer found and no load-space dimensions confirmed.

### kofferraum.org (Corthus, launched 09/2025)
- **URLs:** `/masse/{marke}/{modell}/`
- **Fields:** this is the closest match for load-space dimensions:
  - Trunk width, length and height in cm.
  - Opening width and height.
  - Ladekante height and narrowest width.
  - Length with the seats up and folded.
  - The site says it has 3D models of more than 800 trunks.
- **Provenance:** sources and measuring method are **not disclosed**. No API or licence found.
- **Use:** contact the operator for a licence. Do not copy.

### kofferraum-check.de and bootsized.co.uk
- kofferraum-check.de has individual trunk tests with measured Ladekante, opening height and width (for example ID.7 Tourer 69 / 67 / 100 cm). bootsized.co.uk covers 250+ models.
- Terms not verified. Small coverage.

### cars-data.com (commercial): https://cars-data.com/en/api
- **Coverage:** about 102k variants across 116 brands.
- **Price:** the module "Exterior and interior sizes, weights, boot and load, chassis" costs **€390**. "Full Specs" costs €2,900 one-time.
- **Delivery:** CSV/JSON snapshot, paid by invoice. The API is still early access.
- **Licence (terms v. 2 Oct 2026):** internal use only, and the data may not be shown to the public. **A public-display licence costs 2× the price**, so about €780 for this module. A coverage sheet is available before purchase, so check that the boot and load fields are actually filled.

### DAT SilverDAT (B2B)
- Data is structured in the €uropa-Code with extra technical data. Whether it includes a trunk field is unconfirmed.
- Licensed by volume and industry. A third-party estimate puts it at several hundred € per month. The High Mobility Static Data API also requires a SilverDAT licence.

### JATO Dynamics
- Enterprise market-intelligence provider. Not verified.

### Open data
- **EEA CO2 cars (Reg. 2019/631):** make, commercial name, type approval, mass, wheelbase, axle width, engine and fuel. **No trunk data and no length.** Licence is CC BY with attribution. Usable at most as a backbone for variant names.
- **NHTSA vPIC:** US only, no trunk data.
- **OpenSpec (openspec.visor.vin):** US market, pre-1.0, licence not found.
- **Wikidata:** I did not confirm a cargo-volume property.
- **schema.org `cargoVolume`:** useful for markup only.

### Manufacturer primary sources (recommended)
- **BMW PressClub** technical data PDFs (`press.bmwgroup.com/deutschland/article/attachment/...`): L/B/H, Radstand and Kofferraumvolumen per variant. Example: BMW 120 (06/2024) 4361/1800/1459 mm, wheelbase 2670 mm, 300–1135 l. Usually no load-space dimensions.
- **Skoda Storyboard** TD PDFs (e.g. `cdn.skoda-storyboard.com/2020/07/TD-OCTAVIA-COMBI-diesel-de.pdf`): 640/1700 l and Ladekante 632 mm. Further pages may hold the interior dimensions. Example for Kodiaq II (from AutoScout24 / carwow): 910/2105 l (5-seater), 4758 × 1864 mm.
- **VW** technical data / configurator printouts include load-space dimensions. Example, Golf Variant VII: width between the wheel arches 1003 mm, length 1055 mm (seat up) / 1831 mm (folded), max 1620 l. Current price lists on volkswagen.de not verified.
- **Cupra** (`cupraofficial.de/fahrzeuge/formentor/formentor-vz-specs`):
  - Formentor e-Hybrid: 345 l (ADAC and ams).
  - 1.5 e-Hybrid VZ: 200 kW (272 PS), 400 Nm, 118 km electric range (cupraofficial.de).
  - Formentor petrol (ICE): 450 l, or 420 l with the Top View camera (Cupra's footnote).
  - ams measures the facelift at 4451 × 1839 × 1537 mm, wheelbase 2679 mm.
- **Mercedes, Audi, Opel, Ford, Hyundai, Toyota:** press portals (media.mercedes-benz.com, audi-mediacenter.com, presse.opel.de / Stellantis, media.ford.com, hyundai.news, toyota-media.de) and owner's manuals. Manuals often give VDA volume per trim (Kia), sometimes detailed trunk dimensions (Polestar 3). Not verified one by one.
- **Press-portal terms:** I found Porsche's newsroom terms (VW Group); the VW-brand newsroom's own terms were not found. They allow editorial use only and forbid copying content onto websites for non-editorial purposes. That applies to **texts and images**, not to individual facts.

## Legal position (DE/EU)
- **Copyright:** individual technical facts (for example "380 l VDA") are not works under §2 UrhG. What is protected is text, photos, layout and the database.
- **Sui generis database right (§87a/87b UrhG, Art. 7 Dir. 96/9/EC):**
  - It forbids extracting or re-using a substantial part, and also repeated, systematic extraction of insubstantial parts (§87b(1) S.2).
  - **BGH I ZR 159/10 "Automobil-Onlinebörse" (2011):** systematic extraction aimed at cumulatively rebuilding the database infringes.
  - **CJEU C-762/19 CV-Online (2021):** infringement requires a risk to the maker's investment. A car-data app built on ADAC data would be a substitute, so that risk is high.
- **Data created by manufacturers:** from background knowledge, not verified here: under CJEU C-203/02 BHB, investment in *creating* data does not count toward protection. So manufacturers' own spec data has weak database protection, while ADAC's measured data (obtained and verified) has strong protection.
- **Contracts:** CJEU C-30/14 Ryanair says terms of use can restrict even unprotected databases, subject to national law. That matters for auto-data.net's anti-bot clause.
- **TDM exception §44b UrhG:** it only allows temporary copies for analysis, which must be deleted, and an opt-out works if machine-readable. It **does not** allow publishing the extracted data in an app.
- **UWG:** scraping freely accessible pages is not a "gezielte Behinderung" in itself (BGH, same case), but database and contract claims are still open.
- **New §87b(3):** it refers to the Data Act exception (Art. 43), which covers data from connected products. Not relevant here.

## Recommended approach
1. **Curated JSON in the repo:** brand > model > generation/model year (with build period) > variant. Enter the 10 brands by hand from manufacturer primary sources: press-kit technical data, current price list / technical data PDF, configurator, owner's manual. For each value store `source_url`, `retrieved_at` and `standard` (VDA / manufacturer / measured). Copy no text or images.
2. **ADAC, ams, AutoScout24, auto-data, UltimateSpecs:** only for manually looking up or checking individual values. Deep links to ADAC pages are fine. No scrapers, no bulk copying, and in particular **no copying of ADAC's measured values or of kofferraum.org dimensions**.
3. **Ladelänge, Ladebreite, Ladehöhe:** manufacturers publish these unevenly (VW and Skoda often; BMW and Cupra mostly only volume). Where they are missing, show an **estimate** clearly labelled as such, derived from VDA volume and the class, not as an official figure. Licensed data would be needed for anything better.
4. **To scale beyond 10 brands or get real load-space dimensions:** buy the cars-data.com boot/load module with the public-display licence (about €780, check the coverage sheet first). Alternatives are DAT/JATO, or asking ADAC or kofferraum.org (Corthus) for a licence.
5. **Optional:** use the EEA CO2 dataset (CC BY, with attribution) as an open backbone for variant names, mass and wheelbase.

## Sources
- ADAC: [Autokatalog Formentor 1.5 e-Hybrid](https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/cupra/formentor/1generation-facelift/349374/), [Formentor 1.4 e-Hybrid](https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/cupra/formentor/1generation/327060/), [Golf VI GTI](https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/vw/golf/vi/270712/), [Kofferraumvergleich 2026](https://www.adac.de/rund-ums-fahrzeug/autokatalog/autotest/kofferraumvolumen-vergleich-2026/), [Autotest Enyaq PDF](https://assets.adac.de/image/upload/Autodatenbank/Autotest/AT6505-skoda-enyaq-85x-sportline/skoda-enyaq-85x-sportline.pdf), [Autotest Touran PDF](https://assets.adac.de/image/upload/Autodatenbank/Autotest/AT5366_VW_Touran_2_0_TDI_SCR_BMT_Highline/VW_Touran_2_0_TDI_SCR_BMT_Highline.pdf), [Impressum Hessen-Thüringen](https://www.adac.de/der-adac/regionalclubs/hessen-thueringen/impressum/), [Kinderwagen criteria](https://presse.adac.de/meldungen/adac-ev/technik/welches-auto-fuer-den-kinderwagen.html), [Apify scraper](https://apify.com/rainminer/adac-de-scraper.md)
- Other spec sites: [ams Marken/Modelle](https://www.auto-motor-und-sport.de/marken-modelle/), [ams Formentor e-Hybrid](https://www.auto-motor-und-sport.de/test/cupra-formentor-phev-im-test-staerker-elektrischer-enger/technische-daten/), [AutoScout24 technische Daten](https://www.autoscout24.de/auto/technische-daten/skoda/kodiaq/), [auto-data.net ToS (ES)](https://www.auto-data.net/es/terms-of-use), [kofferraum.org about](https://kofferraum.org/en-gb/about/), [kofferraum-check ID.7](https://kofferraum-check.de/eautos/kofferraum-test-volkswagen-vw-id-7-tourer/), [bootsized](https://bootsized.co.uk/cars), [Motor1 on carsized](https://www.motor1.com/news/632965/carsized-vehicle-size-comparison-website/)
- Commercial data: [cars-data.com API](https://cars-data.com/cs/api), [cars-data.com terms](https://cars-data.com/en/api/terms), [DAT SilverDAT](https://www.datgroup.com/products/interface-partnership/), [ki-syndikat DAT](https://www.ki-syndikat.de/tools/dat/), [High Mobility Static Data API](https://docs.high-mobility.com/docs/vehicle-data/static-data-api)
- Open data: [EEA CO2 cars](https://co2cars.apps.eea.europa.eu/1), [EEA copyright](https://www.eea.europa.eu/legal/copyright), [OpenSpec](https://openspec.visor.vin/about)
- Manufacturers: [BMW 120 press PDF](https://press.bmwgroup.com/deutschland/article/attachment/T0442625DE/617686), [Skoda TD Octavia Combi](https://cdn.skoda-storyboard.com/2020/07/TD-OCTAVIA-COMBI-diesel-de.pdf), [VW Golf Variant data sheet](https://res.cloudinary.com/vehiculum/image/upload/v1506727444/VRJYK4XO_ekxaq7.pdf), [Cupra Formentor VZ specs](https://www.cupraofficial.de/fahrzeuge/formentor/formentor-vz-specs), [Porsche newsroom terms](https://newsroom.porsche.com/de/innovation.html)
- Law: [§87b UrhG](https://lexetius.com/UrhG/87b,2), [BGH I ZR 159/10](https://gesetze.co/urteile/I_ZR_159-10), [CJEU CV-Online (Bird & Bird)](https://www.twobirds.com/en/insights/2021/uk/cv-online-latvia-cjeu-complicates-the-enforcement-of-database-rights), [Ryanair C-30/14](https://legalblogs.wolterskluwer.com/copyright-blog/ryanair-ltd-v-pr-aviation-bv-contracts-rights-and-users-in-a-low-cost-database-law/), [§44b UrhG](https://www.gesetze-im-internet.de/urhg/__44b.html), [WBS on screen scraping](https://www.wbs.legal/urheberrecht/ist-screen-scraping-legal-15081/)