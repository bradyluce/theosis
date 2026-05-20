# Orthodox Calendar Acquisition & Architecture Strategy

Status: research deliverable, May 2026. Author: research pass before any acquisition or implementation.

This document recommends a long-term canonical-data strategy for Theosis's calendar / saints / readings / hymns surface. It builds on the existing `DailyCommemoration`, `ReadingAssignment`, `HymnText`, and `Person` types in [src/domain/content/types.ts](src/domain/content/types.ts) — nothing here requires those to be rewritten.

## Decisions confirmed (2026-05-19)

- **Calendar default**: **New Calendar + Julian Pascha**. Fixed feasts display on Gregorian dates (Nativity = Dec 25, Theophany = Jan 6). Pascha and the entire movable cycle computed by the Julian rule. Matches OCA / GOARCH / Antiochian US English mainstream. The `jurisdiction` and `calendarSystem` axes still go into the data model from day one so Old Calendar mode is a future flag, not a future rewrite.
- **Saint prose strategy**: **fully owned editorial summaries**. Do not ingest CC-BY-SA prose from OrthodoxWiki or the Prologue from Ohrid. Use Wikidata (CC0) for facts and Hapgood (public domain) for hymns. Editorial summaries are produced by Theosis maintainers (LLM-assisted is fine, but factually grounded in CC0/PD sources and Scripture). Net effect: slower content fill, fully clean rights, no attribution surfaces to maintain.

## Implementation status (2026-05-19)

Shipped to master:

- **Phase A — Paschalion + structural data** ✅ — Gauss algorithm in [src/lib/calendar/paschalion.ts](src/lib/calendar/paschalion.ts) (years 1900–2099); 38 named movable-cycle days in [content/normalized/calendar/movable-cycle.json](content/normalized/calendar/movable-cycle.json); composer wired into [src/app/(shell)/daily/page.tsx](src/app/(shell)/daily/page.tsx).
- **Phase B — Full-year Menaion** ✅ — 365 entries (one per calendar day) in [content/normalized/calendar/menaion.json](content/normalized/calendar/menaion.json), with editorial summaries grounded in well-documented historical/liturgical facts.
- **Phase A.2 — Lectionary** ✅ (Sundays + Pentecostarion complete) — daily readings keyed by pdist (movable) and Gregorian MM-DD (fixed) in [content/normalized/calendar/lectionary.json](content/normalized/calendar/lectionary.json). Coverage: every day Pascha→Pentecost (Acts + John daily cycle), every Sunday year-round (Triodion + Lent + post-Pentecost 1-31), all twelve Great Feasts, ~15 other principal saints. Post-Pentecost ordinary weekday cycles (Romans/Corinthians/Matthew/Luke daily) deferred to a follow-up slice.
- **Paschal anchor: next-year switch** ✅ — `resolvePaschalAnchor` (in [src/lib/calendar/paschalion.ts](src/lib/calendar/paschalion.ts)) now hands off from the current Pascha to the next one once a date enters next year's Triodion window. Lets Triodion readings resolve correctly without manual year wrangling.
- **Phase D — Troparia/kontakia** ✅ (partial) — original-translation English hymn texts in [content/normalized/calendar/hymns.json](content/normalized/calendar/hymns.json) for movable feasts + all fixed-cycle Great Feasts + ~12 other principal saints.
- **Phase F — Fasting rules** ✅ — Great Lent / Holy Week / Cheesefare / Apostles' Fast / Dormition Fast / Nativity Fast / Sviatki / weekly Wed-Fri logic in [src/lib/calendar/fasts.ts](src/lib/calendar/fasts.ts).
- **Phase C/E — Saint Person records** ✅ (expanding) — 55 `Person` entries (was 7 before this work) covering apostles, evangelists, hierarchs, monastics, equal-to-the-apostles, great-martyrs, modern saints, and OT prophets. `getAllSaints()` returns the saint subset sorted by name for patron-saint browsing; `getPatronSaint()` resolves the profile-stored id.
- **Multi-saint days** ✅ — `MenaionEntry.also` is now `Commemoration[]` (was `string[]`), each entry optionally carrying a saintId link and a short summary. New `DailyCommemoration.additionalCommemorations[]` surfaces every saint commemorated on a date, with movable feasts auto-promoting the Menaion entry into the additional list so the day's saint isn't lost behind a Great Feast. The Daily page renders the list with clickable links where a Person record exists. 81 days carry enrichments.
- **Test suite** ✅ — 56 unit tests in `npm run test:calendar` cover Paschalion correctness, helper symmetry, composer behavior, reading/hymn layering, fasting precedence, and Menaion coverage across all twelve months.

Not yet shipped:

- **Phase C — Saint metadata via Wikidata SPARQL** (decision: editorial Tier-A prose only — Wikidata still useful for QID cross-links and structured facts).
- **Phase E — Long-form saint biographies** — current Menaion summaries are 1-2 sentences and Person summaries are paragraph-length; deeper hagiographical articles still owed.
- **Person coverage expansion** — 85 records cover the principal Apostles, hierarchs, monastics, prophets, Russian/Slavic saints, and modern wonderworkers; the long tail (regional saints, lesser martyrs) is still light.
- **Patron-saint UI** ✅ — picker on Profile page (search + select), `setPatronSaint` action in Zustand, dedicated `/library/saints` browse list.
- **Post-Pentecost weekday lectionary** — Monday–Saturday Romans/Corinthians/Matthew/Luke daily cycles for ordinary time. ~210 reading slots; Lukan jump rules are the subtle bit. (Pentecostarion weekdays are done.)
- **Old Calendar mode + jurisdiction switching** — data model carries the axis; UI surface is deferred.
- **Fasting depth** — current `fastLabel` is a string; could split into a richer record (strictness levels, daily exceptions like Annunciation in Lent, Theophany eve).

The core conclusion: **do not pick one upstream**. Compute the movable cycle ourselves from a tiny algorithm, store the fixed cycle as static JSON we own, and source the *text* of saint lives and hymns from a small set of well-licensed corpora. Any single upstream we depend on becomes a long-term liability — but the underlying liturgical structure is small, stable, public, and well-documented.

---

## 1. Best candidate sources

Ranked by overall promise (breadth × license × stability):

| # | Source | What it gives us | Format | License |
|---|--------|------------------|--------|---------|
| 1 | **orthocal-python** ([github.com/brianglass/orthocal-python](https://github.com/brianglass/orthocal-python)) | Django app: Paschalion math, commemoration database, daily readings, jurisdiction switching | Python + Django fixtures | **MIT** (code), CC BY-NC-SA (orthocal.info content) |
| 2 | **OrthodoxWiki** ([orthodoxwiki.org](https://orthodoxwiki.org)) | ~922 saint articles, feast articles, full liturgical concepts | MediaWiki (HTML + API + XML export) | **CC-BY-SA 2.5 / GFDL dual** |
| 3 | **Hapgood Service Book (1906)** ([archive.org](https://archive.org/details/ServiceBookOfHolyOrthodoxChurchByHapgood)) | Troparia/kontakia of major feasts, complete English service texts | PDF + plain text (OCR) on Internet Archive | **Public domain** (US, pre-1928) |
| 4 | **Wikidata** ([query.wikidata.org](https://query.wikidata.org)) | Structured saint metadata: feast day (P841), death date, region, type | SPARQL endpoint, JSON | **CC0** |
| 5 | **OCA** ([oca.org/saints/lives](https://www.oca.org/saints/lives), [oca.org/readings](https://www.oca.org/readings)) | Daily life-of-saint pages, daily readings, fasting rules | HTML, no API | © OCA; reuse needs permission |
| 6 | **Holy Trinity Russian (ROCOR)** ([holytrinityorthodox.com/calendar](https://www.holytrinityorthodox.com/htc/orthodox-calendar/)) | Daily calendar through 2099, troparia, RSS troparion feed, documented webmaster integration | HTML, parameterized query string, RSS | © site; webmaster integration explicitly offered |
| 7 | **GOARCH "The Planner"** ([goarch.org/chapel/planner](https://www.goarch.org/chapel/planner)) | Full Sept–Aug ecclesiastical year | ICS files | Unclear; published for end-user calendar import |
| 8 | **Antiochian liturgic-day API** (`antiochian-api-prod-wa.azurewebsites.net`) | Daily readings, saints, fasting | JSON (REST) | Unclear; powers third-party plugins |
| 9 | **Prologue from Ohrid — free translation** ([ochrid.com](https://www.ochrid.com)) | Long-form daily saint lives, hymns, reflections, homilies | HTML (273/366 days complete, 25 verified) | **CC BY-SA 4.0** |
| 10 | **Mount-Skete julian-calendar-js** ([github.com/Mount-Skete/julian-calendar-js](https://github.com/Mount-Skete/julian-calendar-js)) | Tiny TS lib: Orthodox Easter + Julian↔Gregorian conversion | TypeScript, GitHub Packages | **MIT** |
| 11 | **paulkachur/orthodox_calendar** ([github.com/paulkachur/orthodox_calendar](https://github.com/paulkachur/orthodox_calendar)) | "pday" abstraction (paschal-relative integer); pericope/reading mapping | PHP + MySQL | **MIT** |
| 12 | **OrthCalKAOV** (`github.com/orthodoxprojects/orthcalkaov`) | Old + New Calendar support for 1925–2099, TS/React/Vite app | TypeScript | Repository now 404; treat as gone |

Honorable mentions: GOARCH chapel readings pages (HTML, daily), Antiochian PDF liturgical chart, orthochristian.com daily calendar pages.

---

## 2. Licensing analysis

The licensing landscape is the single biggest decision driver, because Theosis is intended for the App Store (commercial distribution by Phase 7).

**Categorically safe (use freely, even commercially):**
- **MIT-licensed code**: orthocal-python, julian-calendar-js, paulkachur/orthodox_calendar. We can read, port, and ship their algorithms.
- **Public domain text**: Hapgood Service Book (1906) and other pre-1928 US publications — Isabel Hapgood's translations of major-feast troparia/kontakia are free of any rights claim.
- **Wikidata (CC0)**: structured saint metadata can be freely incorporated.

**Safe with attribution + share-alike obligation:**
- **OrthodoxWiki** (CC-BY-SA 2.5 / GFDL dual): saint biographies can be ingested, but any *adaptation* must remain CC-BY-SA. This is fine for content displayed as-is in a "Saint's Life" panel with attribution — but it contaminates anything tightly intermingled with proprietary editorial content.
- **Prologue from Ohrid free translation** (CC BY-SA 4.0): same posture. Beautiful prose, partial coverage (75% of the year).

**Avoid for production / commercial distribution:**
- **orthocal.info site content** (CC BY-NC-SA 4.0): the NonCommercial clause makes the *content* unusable for a paid app. The MIT-licensed *library* is unaffected — port the algorithm and rebuild the data from PD sources.
- **OCA daily content**: copyrighted, no documented reuse license. The OCA-format fasting rules are factual (not copyrightable) and can be reimplemented; the saint-life prose cannot.
- **GOARCH Planner ICS, Antiochian API, Holy Trinity Russian HTML**: terms not published. Treat as "available for personal calendar use" until we get written confirmation.
- **Modern Prologue translation (Sebastian Press 1999)**: explicitly copyrighted, private use only.

**Architectural implication**: keep a strict cordon between (a) facts/structure (dates, feast names, scripture refs — not copyrightable) and (b) prose (life text, hymn translation — copyrightable). Theosis can compute and own (a) outright; (b) needs sourcing decisions per item.

---

## 3. Technical accessibility analysis

| Source | Bulk export? | Stable schema? | Rate limit risk | One-time vs continuous |
|--------|--------------|----------------|-----------------|------------------------|
| orthocal-python repo | Yes (clone) | Yes (Django models) | None | One-time |
| OrthodoxWiki MediaWiki API | Yes (`api.php`, Special:Export) | Yes (MW format) | Mild — be polite | One-time + periodic refresh |
| Hapgood (Internet Archive) | Yes (PDF + OCR text) | n/a (book) | None | One-time |
| Wikidata SPARQL | Yes (single query) | Yes (RDF) | Mild | One-time + periodic |
| OCA HTML | Scrape only | Per-page templates, brittle | High | Continuous (low quality) |
| Holy Trinity Russian | Webmaster integration documented | Querystring params | None documented | Continuous |
| Antiochian API | Direct JSON | Yes (when reachable) | Unknown — endpoint was unreachable in test | Continuous |
| GOARCH ICS | Yes (file download) | Yes (ICS) | None | One-time per year |
| ochrid.com Prologue | Scrape only | Per-day HTML pages | None | One-time |

**Verdict**: the "real" canonical primary sources are the **MediaWiki API, the GitHub repos, and the Internet Archive book**. Everything else is supplementary or stop-gap.

---

## 4. Recommended canonical source strategy

Theosis owns its own dataset. Upstreams are *seeds*, not *runtime dependencies*.

**For each entity, the canonical source is:**

- **Paschalion (Pascha date, year by year)** → computed by Theosis using the Gauss algorithm. Implementation derived from the MIT-licensed julian-calendar-js or orthocal-python. No upstream needed at runtime.
- **Movable cycle (Triodion / Pentecostarion days)** → computed by Theosis as offsets from Pascha. Port the logic in `orthocal-python/calendarium/liturgics/year.py`. MIT.
- **Fixed feasts (Menaion: name + Julian date)** → static JSON keyed by Julian `MM-DD`. Seeded from orthocal-python fixtures + verified against OrthodoxWiki + the Hapgood index.
- **Saints (identity + feast date)** → cross-walk between orthocal-python commemorations, OrthodoxWiki saint pages, and Wikidata. Wikidata gives stable QIDs; OrthodoxWiki gives prose; we own the consolidated record.
- **Scripture readings (lectionary)** → port the orthocal-python lectionary tables (lectionary structure is factual, not creative — the *reading text* comes from our Bible translations).
- **Troparia / kontakia** → Hapgood (PD) for major feasts is the first-pass corpus. Additional hymns by direct ingestion of OrthodoxWiki feast pages (CC-BY-SA) with attribution surface in the UI. Anything missing stays empty — better than incorrectly sourced.
- **Saint lives (prose)** → fully owned editorial summaries:
  - Wikidata facts (CC0) provide the structural base: name, century, region, type, manner of repose
  - Scripture references (for biblical saints) come from Theosis's own Bible content
  - Hagiographical narrative is written by Theosis maintainers (LLM-assisted is fine if facts are grounded in CC0/PD sources)
  - No ingestion of OrthodoxWiki prose or Prologue from Ohrid prose — both are CC-BY-SA and would contaminate the editorial layer with ShareAlike obligations
  - Trade-off: slower content fill across thousands of saints, but fully owned rights and no attribution surfaces to maintain
- **Fasting rules** → port the OCA-compatible rules from orthocal-python (factual, MIT-implemented).

**Rationale**: this avoids long-term dependence on any single jurisdiction's website, neutralizes the orthocal.info NC-license issue, and means Theosis can ship the calendar to the App Store with clean rights.

---

## 5. Jurisdiction comparison

The practical jurisdictional matrix:

| Jurisdiction | Calendar | Pascha rule | Notes |
|--------------|----------|-------------|-------|
| Russian (ROCOR, MP) | Old (Julian) | Julian | "Slavic" calendar. orthocal.info, Holy Trinity Russian. |
| OCA | New (Revised Julian) | Julian | Some parishes follow Old. Default for English-speaking convert-heavy parishes. |
| Greek (GOARCH, Ecumenical Patriarchate) | New | Julian | Most Greek-speaking world. GOARCH Planner. |
| Antiochian | New | Julian | English liturgical use, US/Canada. Antiochian API. |
| Serbian | Old | Julian | |
| Bulgarian, Romanian | New | Julian | |
| Old Calendarist Greek synods | Old | Julian | Edge case. |
| Finnish Orthodox, Estonian | New | **Western (Gregorian) Easter** | True edge case — only jurisdictions that adopted the Western Easter date. |

The dominant facts:
- **Pascha is computed by the Julian rule in all canonical Orthodox jurisdictions** (Finland/Estonia excepted). Movable feast offsets are jurisdiction-agnostic.
- **Fixed feasts differ by 13 days** between Old and New Calendar. The underlying feast (e.g. Nativity, Dec 25 Julian = Jan 7 Gregorian) is the same. We can store on Julian and display on either.
- **Lectionary differences** between jurisdictions are small but real (Greek vs Slavic uses; what's commemorated on a given day when multiple options exist).

**Recommendation**: Phase 1 ships with **New Calendar + Julian Pascha** (the OCA/Antiochian/Greek mainstream). Add a `jurisdiction` axis to the data model from day one (so future Old Calendar mode is a switch, not a rebuild) but ship one configuration first.

---

## 6. Calendar complexity analysis

The Orthodox liturgical year has three superimposed cycles:

1. **Fixed cycle (Menaion)** — saints and feasts on Julian `MM-DD`. ~12 great feasts plus thousands of commemorated saints. Static. Trivial to store.
2. **Paschal cycle (Triodion + Pentecostarion)** — ten weeks of pre-Lent + Lent (Triodion) starting 10 weeks before Pascha, then Pascha through All Saints (Pentecostarion). Each day has a name relative to Pascha. Trivially computed by integer offset from Pascha. The MIT `pday` concept (`pday=0` is Pascha, `pday=-7` is Palm Sunday, `pday=-77` is Zacchaeus) is the cleanest abstraction.
3. **Weekly Sunday cycle (Octoechos + Sunday lectionary)** — eight tones rotating weekly, plus Sunday Epistle/Gospel readings indexed by "Sunday after Pentecost" or "Sunday of Luke." Includes the "Lukan jump" — a calendar-dependent restart of the Luke cycle around the Sunday before/after Sept 14. Genuinely subtle; port `orthocal-python` logic rather than rederive.

**The minimum algorithm Theosis needs:**

```ts
// 1. Compute Julian Pascha for year Y (Gauss):
//    g = Y mod 19; i = (19g + 15) mod 30; j = (Y + Y/4 + i) mod 7;
//    l = i - j; month = 3 + (l+40)/44; day = l + 28 - 31*(month/4)
// 2. Add 13 days (for 1900-2099) to get Gregorian date of Pascha.
// 3. For any Gregorian date D:
//    - compute pday(D, Y) = days between D and Pascha(Y)
//    - look up movable-cycle entry by pday (in a static JSON table)
//    - convert D to Julian date (subtract 13 days for 1900-2099)
//    - look up fixed-cycle entry by Julian MM-DD
//    - merge: today's commemorations = fixed[julianMMDD] + movable[pday]
// 4. Apply lectionary rules to derive Epistle/Gospel for D.
// 5. Apply fasting rules (function of D and the season).
```

Year-independent storage; per-request composition. This is the right shape for both static site generation and a future API.

---

## 7. Recommended data model

Build on the existing types in [src/domain/content/types.ts](src/domain/content/types.ts). Additions and refinements:

```ts
// NEW — first-class entities (currently only labels on DailyCommemoration)
export type Feast = {
  id: string;                       // e.g. "feast-nativity"
  slug: string;
  name: string;
  rank: "great" | "vigil" | "polyeleos" | "doxology" | "simple";
  cycle: "fixed" | "movable";
  // For fixed feasts: Julian month-day, e.g. "12-25" for Nativity
  fixedJulianDate?: string;
  // For movable feasts: days from Pascha, e.g. -7 for Palm Sunday
  paschalDayOffset?: number;
  summary: string;
  hymnIds: string[];
  topicSlugs: string[];
};

export type Fast = {
  id: string;
  slug: string;
  name: string;                     // "Great Lent", "Apostles' Fast", "Wednesdays and Fridays"
  kind: "great" | "nativity" | "apostles" | "dormition" | "weekly" | "eve";
  // Computed start/end (relative to Pascha or fixed) — store as a rule, not a date
  rule: FastRule;
  strictness: "strict" | "fish" | "wine-and-oil" | "abstinence";
};

export type LiturgicalSeason = {
  id: string;
  slug: string;
  name: string;                     // "Triodion", "Pentecostarion", "Apostles' Fast", "After-feast of Theophany"
  startRule: SeasonBoundaryRule;
  endRule: SeasonBoundaryRule;
};

// Extend Person to carry richer saint metadata
export type Person = {
  // ...existing fields...
  feastJulianDates?: string[];      // Multiple feasts per saint (commemoration + repose + translation of relics, etc.)
  saintType?: "martyr" | "hierarch" | "monastic" | "ascetic" | "apostle"
    | "prophet" | "righteous" | "fool-for-christ" | "wonderworker" | "passion-bearer";
  reposed?: { year?: number; centuryLabel: string };
  region?: string;
  wikidataQid?: string;             // Cross-link to Wikidata for federated facts
};

// Extend DailyCommemoration to track its composition
export type DailyCommemoration = {
  // ...existing fields...
  jurisdiction: "oca" | "goarch" | "antiochian" | "rocor" | "moscow";
  calendarSystem: "old" | "new";
  feastIds: string[];               // Promote feast labels to references
  fastIds: string[];                // Promote fast labels to references
  seasonId?: string;
  // The two component lookups that produced this day:
  julianMonthDay: string;           // "12-25"
  paschalDayOffset?: number;        // null if no Triodion/Pentecostarion alignment
};
```

`DailyCommemoration` becomes a **view-model**, not stored data. We compute it on demand from `Feast` + `Fast` + `Person` + lectionary tables. Materialize per-year if useful for build-time generation.

---

## 8. Recommended acquisition strategy

Phased, no scraping until phase 2.

**Phase A — Algorithm + structural data (no content):**
1. Implement Gauss + Julian↔Gregorian conversion. Reference [Mount-Skete/julian-calendar-js](https://github.com/Mount-Skete/julian-calendar-js) (MIT) for the formula.
2. Port the movable-cycle table from [orthocal-python](https://github.com/brianglass/orthocal-python) (MIT) into `content/normalized/calendar/movable-cycle.json`. This is a fixed list of ~80 entries (Triodion + Pentecostarion days). Verify against OrthodoxWiki Paschalion article.
3. Port the lectionary table (Epistle + Gospel per day) from orthocal-python. ~365 entries.

**Phase B — Fixed-cycle seed (Menaion):**
4. Snapshot orthocal-python's commemoration fixtures (`loaddata calendarium commemorations`) into `content/raw/calendar/orthocal-python/`. Reformat into `content/normalized/calendar/menaion.json` keyed by Julian `MM-DD`. MIT license attribution in source headers.
5. Cross-reference against OrthodoxWiki saint articles for spelling/coverage gaps. MediaWiki API queries logged into `content/raw/calendar/orthodoxwiki/`.

**Phase C — Saint metadata (Wikidata):**
6. One SPARQL query to Wikidata for "instance of saint with religion Eastern Orthodox and feast day": stores `{qid, name_en, name_local, feast_p841, deathDate, region}` into `content/raw/calendar/wikidata/saints.json`. CC0.
7. Cross-walk to the Menaion records by feast date.

**Phase D — Troparia/kontakia (text):**
8. Extract major-feast hymns from Hapgood's 1906 Service Book (Internet Archive) into `content/raw/calendar/hapgood-1906/`. Public domain. Manual OCR-cleaning required.
9. For non-Hapgood hymns: OrthodoxWiki feast pages (CC-BY-SA, attribution).

**Phase E — Saint lives (prose, fully owned):**
10. Generate fact-only stubs from Wikidata (programmatic): name, era, region, type, manner of repose, key relations. Always available, fully owned.
11. Editorial pass on major-feast saints and patrons first; long-tail saints get fact-only display until reached. LLM-assisted drafting is acceptable, but every generated paragraph must be reviewable against CC0/PD source facts before merge.
12. Do **not** ingest OrthodoxWiki or Prologue from Ohrid prose. Their content sits in `content/raw/calendar/` only as cross-reference for editorial work, never promoted to normalized.

**Phase F — Continuous validation:**
13. Cross-check each year's first week against orthocal.info's live API output (manual eyeball — its content is NC, so we don't store it, but we can compare). Treat divergences as bugs to investigate.

---

## 9. Recommended normalization strategy

The pipeline matches existing `content/raw → content/normalized → app-facing` shape.

**`content/raw/calendar/<source>/`** — verbatim downloads with provenance manifest (URL, fetch date, license).

**`content/normalized/calendar/`** — the canonical Theosis dataset, source-agnostic:

```
content/normalized/calendar/
├── manifest.json              # versions of each upstream we ingested
├── menaion.json               # fixed-cycle: {"01-01": [{ feastId, saintIds, ... }, ...]}
├── movable-cycle.json         # paschal-relative: {"-77": "zacchaeus-sunday", ...}
├── lectionary.json            # day → readings, keyed by paschal-day + julian-mm-dd
├── fasting-rules.json         # rule expressions
├── feasts/<feast-slug>.json   # individual feast records
├── saints/<saint-slug>.json   # individual saint records
└── hymns/<hymn-id>.json       # troparion / kontakion records
```

**App-facing** — exposed through `src/lib/content/loader.ts` (the bridge that the audit already identified as the gap). Two queries cover the Daily page:

```ts
getDailyCommemoration(date: Date, jurisdiction: Jurisdiction): DailyCommemoration
getYearCommemorations(year: number, jurisdiction: Jurisdiction): DailyCommemoration[]
```

Both are pure functions over the normalized data + the Paschalion calculator. No upstream HTTP at runtime.

---

## 10. Recommended raw folder structure

```
content/raw/calendar/
├── README.md                  # provenance, license, attribution per source
├── orthocal-python/
│   ├── fixtures/              # Django fixture dumps (commemorations, readings)
│   ├── liturgics/             # day.py, year.py source snapshots
│   └── PROVENANCE.json        # commit SHA, fetch date, MIT license cite
├── orthodoxwiki/
│   ├── api-responses/         # raw MediaWiki API JSON, keyed by page title
│   ├── feasts/                # exported feast articles
│   ├── saints/                # exported saint articles
│   └── PROVENANCE.json        # CC-BY-SA citation, fetch date
├── wikidata/
│   ├── saints-sparql-result.json   # one big SPARQL dump
│   └── PROVENANCE.json        # CC0 citation, query text, fetch date
├── hapgood-1906/
│   ├── service-book.pdf       # Internet Archive copy
│   ├── service-book.txt       # OCR text
│   ├── extracted-troparia/    # cleaned hymn texts per feast
│   └── PROVENANCE.json        # public-domain citation
├── ochrid-prologue/
│   ├── days/                  # per-day prose, where translated
│   └── PROVENANCE.json        # CC-BY-SA 4.0, attribution to Rdr. Marcian Sakarya
├── goarch-planner/
│   ├── 2025-2026.ics          # downloaded ICS for cross-validation
│   └── PROVENANCE.json
└── _reference-only/           # sources we CANNOT redistribute (NC, copyrighted)
    ├── README.md              # explains why these are reference-only
    ├── orthocal-info-samples/ # sample API responses for diff-checking (DO NOT SHIP)
    └── PROVENANCE.json
```

The `_reference-only/` directory exists so we can compare against orthocal.info, OCA pages, etc. without ever copying their content into the shipped dataset. Ensure `.gitignore` or licensing notes prevent accidental promotion to `content/normalized/`.

---

## 11. Risks and edge cases

- **Lukan jump**: the Sunday Gospel cycle restart after September 14 has multiple acceptable rules across jurisdictions. Port whichever orthocal-python uses by default; document the choice; expose as a setting later if users care.
- **Calendar combinatorial explosion**: jurisdiction × Old/New × Greek-vs-Slavic-typikon × parish-level overrides. Phase 1 hard-codes one combination. The data model must already carry the `jurisdiction` axis — adding it later is a migration; adding it now is free.
- **Pre-1900 / post-2100 Gauss correction**: the +13 days Julian-to-Gregorian correction is valid only 1900–2099. The app effectively needs only ~2026–2099. Document the bound; add an assertion.
- **OrthodoxWiki CC-BY-SA contamination**: if we ingest article prose, any user-visible adaptation must remain CC-BY-SA. Keep ingested prose in a dedicated UI region with attribution; do not mix into proprietary editorial copy.
- **Wikidata coverage gaps**: many Orthodox saints lack `P841` (feast day) values. Treat Wikidata as a metadata enricher, not a primary index.
- **Multiple saints per day**: a typical day commemorates 5–20 named saints. UI must rank — primary saint vs "also commemorated." Need a `rank` field on `DailyCommemoration.saintIds[]` (or two arrays).
- **Multi-language naming**: "St. Nicholas" / "Άγιος Νικόλαος" / "Святой Николай". Keep `name` as the primary English label, `aliases: string[]` for variants. Defer i18n; bake structure now.
- **Hymn attribution / variant translations**: a single troparion may have 3+ English translations in use. Store one preferred translation per hymn record, but keep `translatorLabel` and `sourceId` so we can swap later.
- **Movable + fixed collision**: when a fixed feast falls on a Sunday (e.g. Annunciation on Palm Sunday — "Kyriopascha"), specific typikon rules govern. Edge case for Phase 1 — document, defer.
- **Daylight-saving and timezone**: "today" is a user-local concept. Currently `getTodayCommemoration()` uses ISO date matching, which is fine if we resolve "today" in user timezone client-side before the lookup. Document.
- **Source rot**: Antiochian API returned ECONNREFUSED in this research. Holy Trinity Russian site has multiple URL variants. Never depend on a runtime upstream — all data must be embedded in the build.
- **App Store theological vetting**: an app that promotes itself as "Orthodox" should be unambiguous about which tradition it represents (e.g. canonical Eastern Orthodox in communion with Constantinople). Avoid Old Calendarist schismatic sources to keep messaging clean.

---

## 12. Recommended first implementation slice

**Goal**: replace the single hardcoded `daily-2026-03-09` seed with a computed `DailyCommemoration` for any day in May 2026, drawing on a minimum normalized dataset.

**Scope (Phase A only — no Wikidata, no Hapgood, no UI changes):**

1. Create `src/lib/calendar/paschalion.ts`:
   - `getPaschaDate(year: number): Date` — Gauss algorithm, Gregorian output.
   - `julianMonthDay(date: Date): string` — Gregorian date → Julian `MM-DD`.
   - `paschalDayOffset(date: Date): number` — days from Pascha.
   - Pure functions. No I/O. Unit tests against known dates (Pascha 2024, 2025, 2026).
2. Create `content/raw/calendar/orthocal-python/PROVENANCE.json` referencing the upstream commit, MIT license, and the *type* of data we'll port (commemoration fixtures, liturgics tables).
3. Create `content/normalized/calendar/movable-cycle.json` with the ~80 Triodion/Pentecostarion entries (Zacchaeus through All Saints).
4. Create `content/normalized/calendar/menaion.json` keyed by Julian `MM-DD`, populated for May 1–31 only (Julian Apr 18 – May 18 → Gregorian May 1 – May 31). One verse minimum per day: feast/saint name. Adapt from orthocal-python fixtures.
5. Extend `src/lib/content/queries.ts`: `getTodayCommemoration()` composes from the normalized data + Paschalion. Returns a `DailyCommemoration` shape that matches what the existing `/daily` page already renders.
6. Keep the existing seed `daily-2026-03-09` as a *fallback* example, not the source of truth — but only until Phase B fills out more of the year.

**Deliberately out of scope for the first slice:**
- Saint biographies / lives (Phase E)
- Troparia / kontakia (Phase D)
- Jurisdiction switching
- Old Calendar mode
- UI changes — the Daily page already consumes `DailyCommemoration`; this slice just provides a real one

**Acceptance criteria**:
- Visiting `/daily` on any day in May 2026 renders a real commemoration whose name matches what orthocal.info shows for that day (manual eyeball check, not data copy).
- Visiting `/daily` on Pascha 2026 (April 12, 2026 Gregorian = March 30 Julian) shows "Holy Pascha" with `paschalDayOffset=0`.
- Tests pass: Pascha 2024 = May 5; Pascha 2025 = April 20; Pascha 2026 = April 12.

This is the smallest possible slice that proves the architecture: own algorithm, own normalized data, build on existing domain types, no upstream HTTP. Each subsequent phase (lectionary, hymns, lives) adds depth without reshaping the architecture.

---

## Out of this document's scope

- Implementation. Nothing here writes code.
- UI design changes — the Daily page already renders the shape we're producing.
- Bible content acquisition — covered separately in [content-ingestion.md](docs/content-ingestion.md) and the Phase 2 ingestion work.
- Commentary acquisition — Phase 3.

## Next step

Decisions on calendar default and saint-prose strategy are locked (see top of document). Open question for the first implementation slice: confirm scope (May 2026 only, structural-only — Paschalion + movable cycle + Menaion seed, no saint lives, no hymns yet) before code is written.
