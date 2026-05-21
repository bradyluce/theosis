# John Chrysostom Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw John Chrysostom HTML corpus downloaded from New Advent. No parser or app code has been written yet. This doc is intended as a complete brief for a separate integration chat that will build the actual ingestion pipeline.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** NPNF (Nicene and Post-Nicene Fathers), **First Series**, Vols. 9–14 — Philip Schaff ed., 1889. Public domain. Multiple 19th-century translators (W.R.W. Stephens, George Prevost, Gross Alexander, T.W. Chambers, John A. Broadus, et al.). New Advent transcriptions © New Advent LLC.

> **Companion docs:**
> - [`docs/augustine-raw-content-integration-plan.md`](augustine-raw-content-integration-plan.md)
> - [`docs/gregory-of-nyssa-raw-content-integration-plan.md`](gregory-of-nyssa-raw-content-integration-plan.md)
> - [`docs/athanasius-raw-content-integration-plan.md`](athanasius-raw-content-integration-plan.md)
> - [`docs/basil-raw-content-integration-plan.md`](basil-raw-content-integration-plan.md)
>
> Most HTML patterns are identical across all five corpora. This doc highlights what's special about Chrysostom: **the largest Bible-commentary corpus in patristic literature, with explicit verse-anchor hyperlinks embedded in each homily** — making it the strongest Bible-linking opportunity in the entire library.

---

## 1. Where the Chrysostom files are located

All raw files live in a single directory:

```
content/raw/fathers/chrysostom/
```

Same per-author convention as the other four Fathers.

---

## 2. What files were downloaded

**Counts (in `content/raw/fathers/chrysostom/`):**

| Item | Count |
|---|---|
| `*.html` raw files (work indexes + sub-pages) | **552** |
| `provenance_<work_id>.json` files | **36** |
| Legacy `*.md` files (from earlier processing pipeline, not part of this download) | ~500 |
| **Total raw HTML size** | **~21.14 MB** |

**File-naming convention** (covers all three width variants):

| Pattern | Meaning | Example |
|---|---|---|
| `NNNN.html` (4-digit) | Work index page OR self-contained work | `2001.html` = Matthew Homilies index; `1903.html` = entire *Two Letters to Theodore* |
| `NNNNN.html` (5-digit, 1-digit suffix) | Sub-page of a 2–9 section work | `19221.html` = On the Priesthood Book I; `23101.html` = Galatians Homily 1 |
| `NNNNNN.html` (6-digit, 2-digit suffix) | Sub-page of a 10–99 section work | `200101.html` = Matthew Homily 1; `190101.html` = Statues Homily 1 |
| `provenance_NNNN.json` | Provenance sidecar | `provenance_2001.json` |

The regex fix from the Athanasius/Basil acquisitions correctly handles all three width variants. No re-acquisition needed.

Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T192746.json` — 36 works OK, 0 errors, 552 files.

---

## 3. Major works represented

All 36 New Advent Chrysostom works are present. The corpus spans **NPNF First Series Vols. 9–14** — six different physical books, each with potentially different translators.

### Scripture Commentary Homilies (the "crown jewels")

| ID | Title | Sub-pages | NPNF Vol. | Notes |
|---|---|---|---|---|
| **2001** | Homilies on the Gospel of Matthew | **90** | Vol. 10 | Verse-by-verse through Matthew; one of Chrysostom's longest series |
| **2401** | Homilies on the Gospel of John | **88** | Vol. 14 | The other Gospel commentary series |
| **2101** | Homilies on Acts | **55** | Vol. 11 | Verse-by-verse through Acts |
| **2201** | Homilies on First Corinthians | **45** | Vol. 12 | |
| **2402** | Homilies on the Epistle to the Hebrews | **35** | Vol. 14 | |
| **2102** | Homilies on Romans | **32** | Vol. 11 | |
| **2202** | Homilies on Second Corinthians | **30** | Vol. 12 | |
| **2301** | Homilies on Ephesians | **25** | Vol. 13 | |
| **2306** | Homilies on First Timothy | **19** | Vol. 13 | |
| **2302** | Homilies on Philippians | **16** | Vol. 13 | |
| **2303** | Homilies on Colossians | **12** | Vol. 13 | |
| **2304** | Homilies on First Thessalonians | **11** | Vol. 13 | |
| **2307** | Homilies on Second Timothy | **10** | Vol. 13 | |
| **2308** | Homilies on Titus | **6** | Vol. 13 | |
| **2310** | Commentary on Galatians | **6** | Vol. 13 | One sub-page per Galatians chapter (chapters 1–6) |
| **2305** | Homilies on Second Thessalonians | **5** | Vol. 13 | |
| **2309** | Homilies on Philemon | **4** (3 homilies + intro) | Vol. 13 | |

**Total Scripture commentary sub-pages:** ~489 homilies across **17 NT books**. Chrysostom's NT coverage:
- ✅ Matthew, John (Gospels)
- ✅ Acts
- ✅ Romans, 1–2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1–2 Thessalonians, 1–2 Timothy, Titus, Philemon (all 13 Pauline epistles!)
- ✅ Hebrews
- ❌ Mark, Luke (Gospels) — Chrysostom did not preach systematically on these
- ❌ James, 1–2 Peter, 1–3 John, Jude, Revelation (Catholic Epistles + Revelation) — same

### Other Works (NPNF Vol. 9)

| ID | Title | Sub-pages | Notes |
|---|---|---|---|
| **1922** | On the Priesthood (*De Sacerdotio*) | 6 books | **Foundational text on Christian ministry** — dialogue with his friend Basil (a different Basil, not the Cappadocian) |
| **1901** | Homilies on the Statues (Ad Populum Antiochenum) | 21 homilies | Preached during the 387 Antioch riot; classic Chrysostom rhetorical-pastoral preaching |
| **1908** | Instructions to Catechumens | 0 (single 85 KB page) | Pre-baptismal catechesis |
| **1916** | Four Letters to Olympias | 0 (single 99 KB page) | Letters to his deaconess friend during his exile |
| **1903** | Two Letters to Theodore After His Fall | 0 (single 167 KB page) | Letters urging a fallen friend back to repentance |
| **1919** | Three Homilies on the Power of Satan (*Adversus Daemones*) | 0 (single 102 KB page) | |
| **1915** | Second Homily on Eutropius | 0 (single 89 KB page) | The famous "Vanity of vanities" homily on the fall of the imperial chamberlain Eutropius |
| **1902** | No One Can Harm the Man Who Does Not Injure Himself | 0 (single 85 KB page) | Ethical treatise written from exile |
| **1907** | Homily Concerning "Lowliness of Mind" | 0 (single 54 KB page) | On humility |
| **1911** | Homily on the Paralytic Lowered Through the Roof | 0 (single 71 KB page) | Sermon on Mark 2:1–12 / Luke 5:17–26 |
| **1912** | Homily on "If your enemy hunger, feed him" | 0 (single 63 KB page) | Sermon on Romans 12:20 |
| **1913** | Homily Against Publishing the Errors of the Brethren | 0 (single 51 KB page) | |
| **1914** | First Homily on Eutropius | 0 (single 27 KB page) | First sermon when Eutropius took refuge in the church |
| **1910** | Homily on "Father, if it be possible..." | 0 (single 51 KB page) | Christological sermon on Matt 26:39 |
| **1904** | Letter to a Young Widow | 0 (single 51 KB page) | Pastoral letter |
| **1905** | Homily on St. Ignatius | 0 (single 45 KB page) | Panegyric for Ignatius of Antioch |
| **1906** | Homily on St. Babylas | 0 (single 27 KB page) | Panegyric |
| **1918** | Correspondence with Pope Innocent I | 0 (single 40 KB page) | Letters from exile |
| **1917** | Letter to Some Priests of Antioch | 0 (single 11 KB page) | |

**Total works:** 36. **Translators (varies by work):** W.R.W. Stephens (Priesthood, Statues), George Prevost (Matthew), T.P. Brandram (Acts), J.B. Morris and W.H. Simcox (Romans), Talbot W. Chambers (1 & 2 Corinthians), Gross Alexander (Galatians, Ephesians, Philippians), John A. Broadus and Philip Schaff (some others), and others.

### Notable absences from this corpus

NPNF Vol. 9–14 is a substantial Chrysostom selection but **many major works are missing**:

- **Homilies on Genesis** (67 homilies) — Chrysostom's other massive OT commentary project. **The single biggest absence.**
- **Commentaries on the Psalms** (selected psalms)
- **Homilies on Isaiah**
- **The Paschal Homily** — read at every Orthodox Pascha midnight service; one of the most famous Chrysostom texts in liturgical use
- **The Divine Liturgy of St. John Chrysostom** — the most-used Orthodox liturgy (most Sundays of the year). This is a liturgical text, not a sermon.
- **Eight Homilies Against the Jews** (*Adversus Judaeos*) — historically controversial polemical homilies; likely intentionally omitted from New Advent due to anti-Jewish content. A scholarly Orthodox library would need to acknowledge their existence (with appropriate context).
- **Twelve Homilies on the Incomprehensible Nature of God** (*Adversus Anomoeos*) — anti-Anomoean theology
- **Demonstration Against the Pagans That Christ is God**
- **Many of his pastoral homilies from his daily Antioch and Constantinople preaching** — Chrysostom preached daily for ~12 years; only a fraction survived.

**Implication:** Chrysostom's New Advent corpus is **strongly weighted toward NT exegesis and pastoral preaching**. The OT preaching is largely absent. A Phase-2 acquisition for Homilies on Genesis (especially), Psalms, and Isaiah is the most strategic supplement, sourceable from:
- St. Vladimir's Seminary Press (Robert Hill translations of Genesis Homilies — *Saint John Chrysostom: Homilies on Genesis 1-17* and *18-45*)
- Fathers of the Church series (CUA Press)
- Migne PG 47–64 (Greek+Latin, public domain)

---

## 4. How the files are structured internally

Identical shell to the other four corpora:

- `<head>` with title, canonical link, `screen6.css`
- Shared header (logo, search, A–Z encyclopedia bar) — junk
- `<div id="mi5">` breadcrumbs
- **`<div id="springfield2">`** main content wrapper (present in **all 552 files**)
- `<h1>` title, Gumroad banner
- Main body
- **`<div class="pub">`** citation footer with `id="src*"` spans (present in **all 552 files**)
- Footer + Cloudflare beacon

The two invariants — `#springfield2` and `id="srctrans"` — hold across the entire corpus.

---

## 5. One file per work? Per section? **Mixed: 17 Scripture-commentary works with sub-pages, 2 small multi-section works, 17 self-contained single-file works.**

### Multi-sub-page works (19 of 36)

| Work | Sub-pages | Suffix style |
|---|---|---|
| **2001 Matthew** | 90 | 2-digit (200101–200190) |
| **2401 John** | 88 | 2-digit (240101–240188) |
| **2101 Acts** | 55 | 2-digit (210101–210155) |
| **2201 1 Corinthians** | 45 | 2-digit |
| **2402 Hebrews** | 35 | 2-digit |
| **2102 Romans** | 32 | 2-digit |
| **2202 2 Corinthians** | 30 | 2-digit |
| **2301 Ephesians** | 25 | 2-digit |
| **1901 Statues** | 21 | 2-digit (190101–190121) |
| **2306 1 Timothy** | 19 | 2-digit |
| **2302 Philippians** | 16 | 2-digit |
| **2303 Colossians** | 12 | 2-digit |
| **2304 1 Thessalonians** | 11 | 2-digit |
| **2307 2 Timothy** | 10 | 2-digit |
| **2308 Titus** | 6 | 1-digit (23081–23086) |
| **2310 Galatians** | 6 | 1-digit (23101–23106) |
| **1922 On the Priesthood** | 6 | 1-digit (19221–19226) |
| **2305 2 Thessalonians** | 5 | 1-digit |
| **2309 Philemon** | 4 | 1-digit |

### Self-contained single-file works (17 of 36)

The 17 "other works" (1902–1919 except 1901 and 1922) are all delivered as single files, ranging from 11 KB (1917 Letter to Antioch priests) to 167 KB (1903 Two Letters to Theodore).

---

## 6. HTML patterns inside content pages

Patterns are mostly identical to the other corpora. **Chrysostom-specific structural features below — especially the Bible-link epigraph pattern, which is the single most exploitable feature for verse-linking.**

### 6.1 Index/TOC pages

**Bare TOC style** (e.g., 2310 Galatians):

```html
<p>
  <a href="../fathers/23101.htm">Chapter 1</a>
  <br><a href="../fathers/23102.htm">Chapter 2</a>
  ...
</p>
```

**Longer TOC with homily numbers** (Matthew, John, Acts, etc.): same line-broken anchor list with "Homily N" labels.

### 6.2 Content sub-pages — **the Bible-link epigraph pattern**

This is the **most important structural feature for the Theosis integration**:

**Many Chrysostom homilies open with one of two epigraph patterns identifying the pericope being expounded:**

#### Pattern A — Direct verse hyperlink (Galatians, some others):

```html
<h1>Homily 1 on Galatians</h1>
<p><em>... Gumroad banner ...</em></p>

<p><a href="../bible/gal001.htm#verse1">Verse 1-3</a></p>     <!-- ← head-verse hyperlink -->
<p><q>Paul, an Apostle, ... Grace to you and peace ...</q></p>  <!-- ← pericope text -->

<p>The exordium is full of a vehement and lofty spirit...</p>    <!-- commentary begins -->
```

#### Pattern B — Topic intro followed by `<a href="../bible/...">` hyperlink (Statues, occasional homilies):

```html
<h1>Homily 1 on the Statues</h1>
<p><em>... Gumroad ...</em></p>

<p><strong><em>This Homily was delivered ... upon that saying of the Apostle,</em>
<a href="../bible/1ti005.htm#verse23">1 Timothy 5:23</a>
<em>, <q>Drink a little wine for your stomach's sake, ...</q></em></strong></p>

<p>1. You have heard the Apostolic voice ...</p>   <!-- commentary begins -->
```

**Both patterns include an explicit `<a href="../bible/<book><chapter>.htm#verseN">` hyperlink** to the Bible verse being expounded. The parser can extract the head-verse for each homily **deterministically** from the HTML — no hand-curated lookup table needed (unlike Basil's Hexaemeron which requires hand-curation, and unlike the other Fathers where head verses are inferable but not always explicitly hyperlinked).

**This is the cleanest Bible-linking pattern in any of the five corpora.** Hundreds of head-verse links can be extracted mechanically.

**Caveat:** not all Chrysostom homilies have a clear epigraph. The first homily on each NT book is often a **Preface** (e.g., 200101 *Homily 1 on Matthew* is titled "Homily 1 on Matthew (Preface)" and has no specific verse epigraph). Beyond the Preface, subsequent homilies typically do follow Pattern A or B.

### 6.3 Chapter heading style — variable

| Style | Example | Used in |
|---|---|---|
| No `<h2>` chapter headings — just `<h1>` + paragraph-numbered body | `<h1>Homily 1 on Matthew</h1>` then `<p>1. ...</p>` | Matthew Homilies (200101) |
| No `<h2>` headings — `<h1>` + numbered body | `<h1>On the Priesthood (Book I)</h1>` then numbered paragraphs | On the Priesthood books (19221–19226) |
| `<h2>Letter 1</h2>` / `<h2>Letter 2</h2>` as section markers | `<h2>Letter 1</h2>` then body | 1903 *Two Letters to Theodore* — two letters concatenated into one HTML file |

Most Chrysostom sub-pages do NOT have `<h2>` chapter headings — they're single continuous discourses. The parser handles this by treating each sub-page as one WorkSection with numbered paragraphs internally.

### 6.4 Paragraph numbering

Chrysostom NPNF First Series translation uses **leading Arabic numeral paragraph numbering consistently** — same convention as Augustine and Basil. Every paragraph begins `<p>N. ...</p>` where N is the paragraph number within the homily. Extremely parser-friendly.

### 6.5 Scripture references — `<span class="stiki">`

Same format as other corpora. **Density observed (sample):**

| File | `stiki` count | Notes |
|---|---|---|
| 23101 *Galatians Homily 1* | 23 | Anti-Pelagian/Christological dense |
| 240101 *John Homily 1* | 7 | Lower for Preface; later homilies much higher |
| 200101 *Matthew Homily 1* | 4 | Preface |
| 23102 *Galatians Homily 2* | 13 | Higher in subsequent homilies |
| 23103 *Galatians Homily 3* | 10 | |

**Estimated corpus-wide total:** ~10,000+ `<span class="stiki">` references across 552 files. Chrysostom's Bible-citation density is the highest of any patristic Father — his sermons are constructed almost entirely from Scripture quotations.

### 6.6 Citation footer — multi-volume bibliography

Unlike Gregory (single Vol. 5) or Basil (single Vol. 8), Chrysostom **spans 6 NPNF volumes** (9–14):

| Volume | Works | Year |
|---|---|---|
| Vol. 9 | 1901–1919, 1922 (Priesthood, Statues, miscellaneous) | 1889 |
| Vol. 10 | 2001 (Matthew) | 1888 |
| Vol. 11 | 2101 (Acts), 2102 (Romans) | 1889 |
| Vol. 12 | 2201, 2202 (1 & 2 Corinthians) | 1889 |
| Vol. 13 | 2301–2310 (Galatians through Philemon) | 1889 |
| Vol. 14 | 2401 (John), 2402 (Hebrews) | 1889 |

**Each work's citation footer correctly identifies its volume** (extractable from `<span id="srcvolume">`). The translator varies by volume — there is **no single-translator monoculture** here (unlike Basil's Jackson or Gregory of Nyssa's Moore/Wilson/Ogle).

---

## 7. How clean is the HTML?

Same level as the other four corpora. **Chrysostom adds one significant POSITIVE feature: the explicit head-verse hyperlinks in homily epigraphs** (§6.2). This is the cleanest Bible-linking signal in any of the five corpora.

No new edge cases or markup variants observed.

---

## 8. Extractable metadata

| Field | Source | Chrysostom example |
|---|---|---|
| Author | Folder + `<title>` parenthetical | `John Chrysostom` (Greek: *Chrysostomos* = "Golden Mouth") |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `2401` |
| Work title | `<h1>` of index or self-contained file | `Homilies on the Gospel of John` |
| Section ID | Filename suffix | `01`–`90` (Matthew homilies), `1`–`6` (Galatians), etc. |
| Section title | `<h1>` of sub-page | `Homily 1 on the Gospel of John (Preface)` |
| **Head-verse hyperlink** | First `<a href="../bible/...">` after `<h1>` | `<a href="../bible/gal001.htm#verse1">Verse 1-3</a>` (Galatians Homily 1) |
| **Pericope text** | First `<q>...</q>` following the head-verse link | `"Paul, an Apostle, ... Grace to you and peace ..."` |
| Paragraph number | Leading Arabic numeral in `<p>` body | `1`, `2`, `127` |
| Source URL | `<link rel="canonical">` or provenance JSON | `https://www.newadvent.org/fathers/2401.htm` |
| Translator | `<span id="srctrans">` | `Translated by Gross Alexander.` (Galatians) — varies by volume |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, First Series` |
| Volume | `<span id="srcvolume">` | `Vol. 13.` (varies by work — see §6.6) |
| Editor | `<span id="srced">` | `Edited by Philip Schaff.` |
| Year | `<span id="srcyear">` | `1889.` (all Chrysostom Vols.) |
| Bible references | `<span class="stiki">` blocks | ~10,000+ total estimated |
| Work type | provenance JSON `work_type` | `homily`, `commentary`, `treatise`, `letter` |

---

## 9. Normalization to Theosis library records

Mirrors the schemas in the companion docs. Chrysostom specifics:

### Person

```ts
Person {
  id:          "person.john-chrysostom"
  display:     "John Chrysostom"
  also_known:  ["St. John Chrysostom", "Ioannes Chrysostomos", "John the Golden-Mouthed", "John of Antioch", "Patriarch John"]
  born:        c. 347
  died:        407
  feast_day:   "11-13"      // Orthodox calendar: November 13 (commemoration)
  feast_alt:   ["01-27", "01-30"]   // Jan 27 = Translation of relics; Jan 30 = Three Holy Hierarchs
  feast_west:  "09-13"      // Catholic Western feast day (Sept 13)
  tradition:   "Archbishop of Constantinople; greatest preacher of the Eastern Church; one of the Three Holy Hierarchs; doctor of the Church"
  see:         "Constantinople (formerly Antioch presbyter)"
  ecumenical_role: "Author of the Divine Liturgy of St. John Chrysostom — the most common Orthodox liturgy; foundational biblical exegete in the Antiochene tradition"
  epithet:     "Chrysostomos (Golden-Mouthed)"
}
```

**Orthodox significance:**
- One of the **Three Holy Hierarchs** with Basil the Great and Gregory the Theologian (Nazianzen); joint feast January 30
- One of the **Four Great Doctors of the Eastern Church** (with Athanasius, Basil, Gregory Nazianzen)
- **Author of the Divine Liturgy of St. John Chrysostom** — the most frequently celebrated Eucharistic liturgy in the Orthodox Church (used on most Sundays of the year)
- **The single most influential patristic biblical exegete in the Orthodox tradition** — his NT homilies form the backbone of Orthodox biblical interpretation
- His **Paschal Homily** ("Let no one mourn that he has fallen again and again...") is read at every Orthodox Pascha midnight service

### Work

36 rows total — moderate-sized Work table.

**Type breakdown:**
- `commentary` / `homily` on Scripture: 17 works covering 17 NT books
- `treatise`: ~3 (Priesthood, No One Can Harm, etc.)
- `homily` (occasional sermons): ~10
- `letter`: ~5 (Theodore, Olympias, Pope Innocent, etc.)

### WorkSection

The chapter-level granularity question (Option A flat vs Option B deep):

- For the **17 Scripture commentary series**, each sub-page is one homily — one WorkSection per homily is the natural granularity. ~489 WorkSection rows for Scripture commentaries.
- For **1901 Homilies on the Statues**: 21 WorkSection rows.
- For **1922 On the Priesthood**: 6 WorkSection rows (one per book).
- For **17 self-contained works**: one WorkSection each (17 rows).
- **Total WorkSection rows: ~533** — by far the largest patristic WorkSection table.

```ts
WorkSection {
  id:              "section.chrysostom.2310.01"
  work_id:         "work.chrysostom.2310"
  order_index:     1
  section_type:    "homily"
  short_label:     "Homily 1 on Galatians"
  display_title:   "Homily 1 on Galatians"
  head_verse:      "Galatians 1:1–3"               // ← extracted from <a href="../bible/gal001.htm#verse1">Verse 1-3</a>
  head_verse_text: "Paul, an Apostle, ... Grace to you and peace ..."  // ← extracted from <q>...</q>
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.2310"
  bible_refs:      BibleRef[]
}
```

### SourceRecord

**Six different volume bibliographic records** for the Chrysostom corpus (one per NPNF Vol. 9–14). Each work's SourceRecord references the appropriate volume:

```ts
SourceRecord {
  id:              "src.newadvent.2310"
  work_id:         "work.chrysostom.2310"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/2310.htm"
  translator:      "Gross Alexander"            // varies by volume
  series:          "Nicene and Post-Nicene Fathers, First Series"
  volume:          "Vol. 13"
  editor:          "Philip Schaff"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1889
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/chrysostom/2310.html"
  provenance_json: "content/raw/fathers/chrysostom/provenance_2310.json"
}
```

**Optimization:** create six shared `BibliographicEdition` rows (one per NPNF Vol. 9–14) and reference them from the 36 SourceRecords.

---

## 10. Bible-linking strategy

**Chrysostom is the strongest Bible-linking opportunity in the entire patristic library.** Three converging factors:

1. **Scope:** 17 NT books covered with verse-by-verse homiletic commentary
2. **Density:** ~10,000+ inline `stiki` Bible references across 552 files
3. **Explicit head-verse hyperlinks:** the epigraph pattern (§6.2) lets the parser extract the head-verse for each homily **automatically** — no hand-curated lookup table needed

### 10.1 Head-verse linking — ~489 strong WorkSection→Bible links extractable mechanically

For each Scripture commentary homily (17 series × varying homily count = ~489 homilies):

1. Parse the homily HTML
2. Find the first `<a href="../bible/<book><chapter>.htm[#verseN]">` link inside `#springfield2` that appears **before** any numbered paragraph (`<p>1. ...`)
3. Parse the href to extract canonical Bible reference: book code + chapter + verse(s)
4. Parse the link's display text and any following `<q>...</q>` to capture the verse range (e.g., "Verse 1-3" → verses 1–3)
5. Store as the WorkSection's `head_verse` and `head_verse_text` fields

**Estimated direct head-verse extraction:**

| Book | Homily count | Head-verse links extractable |
|---|---|---|
| Matthew | 90 | ~89 (Homily 1 is a Preface — no verse) |
| John | 88 | ~87 |
| Acts | 55 | ~54 |
| Romans | 32 | ~31 |
| 1 Cor | 44 (45 sub-pages - 1 intro) | ~43 |
| 2 Cor | 30 | ~29 |
| Galatians | 6 (chapters 1–6) | 6 |
| Ephesians | 24 | ~23 |
| Philippians | 15 | ~14 |
| Colossians | 12 | ~11 |
| 1 Thes | 11 | ~10 |
| 2 Thes | 5 | ~4 |
| 1 Tim | 18 | ~17 |
| 2 Tim | 10 | ~9 |
| Titus | 6 | ~5 |
| Philemon | 3 | ~3 |
| Hebrews | 34 | ~33 |
| **Total** | **~478** | **~478** |

This produces **~478 strong head-verse WorkSection→Bible links covering the entire New Testament minus the Catholic Epistles, Mark, Luke, and Revelation.** This is the largest single Bible-linking outcome in the library.

### 10.2 Inline scripture refs — ~10,000+ BibleRef rows

Extract all `<span class="stiki">` blocks across the 552 files. Same mechanical parsing as the other corpora. Chrysostom's sermons cite Scripture **constantly** — every paragraph typically has 1–3 supporting verses.

### 10.3 Thematic / topical homily links

Many Chrysostom homilies are **topically anchored** to specific Scripture passages. The 17 self-contained occasional homilies (1901–1919) have themes:

| Work | Anchor passage |
|---|---|
| **1910** Homily on "Father, if it be possible..." | Matthew 26:39 (Gethsemane prayer) |
| **1911** Homily on the Paralytic Lowered Through Roof | Mark 2:1–12 / Luke 5:17–26 |
| **1912** Homily on "If your enemy hunger, feed him" | Romans 12:20 |
| **1914** First Homily on Eutropius | (no specific verse — political occasion) |
| **1915** Second Homily on Eutropius | (no specific verse — but contains the famous "vanity of vanities" reflection) |

### 10.4 Lectionary linking — Orthodox calendar

Chrysostom is **the most calendar-linkable Father in the corpus**:

- **November 13 (Feast of St. John Chrysostom)** — surface entire corpus.
- **January 27 (Translation of Relics)** — surface biographical/personal works.
- **January 30 (Three Holy Hierarchs)** — joint feast with Basil and Gregory Nazianzen.
- **Pascha midnight (Easter Vigil)** — Chrysostom's Paschal Homily is read at every Orthodox Pascha. **Note: this homily is NOT in the New Advent corpus** — Phase 2 acquisition.
- **The Liturgy of St. John Chrysostom** is celebrated nearly every Sunday and weekday throughout the year — pervasive integration potential.
- **Every Sunday of the year** — the Gospel and Epistle readings for the day map to Chrysostom homilies on those passages. **This is the killer feature**: open the Bible to today's Gospel reading → surface Chrysostom's homily on that exact passage. Made possible by the ~478 head-verse links.

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Head-verse linking** (mechanical extraction from epigraph hyperlinks): produces ~478 strong WorkSection→Bible links covering essentially the entire NT-minus-Catholic-Epistles. **This is THE highest-priority pass in the entire library integration.**
2. **Pass 2 — Inline `stiki` extraction** across all 552 files. Produces ~10,000+ `BibleRef` rows.
3. **Pass 3 — Topical anchor tagging** for the 17 occasional homilies (~10 hand-curated entries).
4. **Pass 4 — Calendar mapping** for Chrysostom's feast (Nov 13), Three Hierarchs (Jan 30), Sunday lectionary cycle (massive — every Sunday reading has a Chrysostom homily).
5. **Pass 5 — Liturgy-of-Chrysostom integration** — link relevant homilies to liturgical practice (longer-term).

---

## 11. Which Chrysostom works are most useful for the Theosis library

**For Bible-reader integration (top priority):**

| Rank | Work | Why it's valuable |
|---|---|---|
| 1 | **2401 Homilies on the Gospel of John** | 88 homilies on the most theologically dense Gospel; explicit head-verse linking; foundational Orthodox exegesis |
| 2 | **2001 Homilies on the Gospel of Matthew** | 90 homilies; covers the Sermon on the Mount, the Beatitudes, the Lord's Prayer, all the parables, the Passion narrative |
| 3 | **2101 Homilies on Acts** | 55 homilies; the only patristic verse-by-verse Acts commentary of this scope |
| 4 | **2102 Homilies on Romans** | 32 homilies on Paul's theological masterwork |
| 5 | **2402 Homilies on Hebrews** | 35 homilies on the priestly Christology epistle |
| 6 | **2201, 2202 Homilies on 1 & 2 Corinthians** | 75 homilies total on the most pastorally-rich Pauline epistles |
| 7 | **2301 Homilies on Ephesians** | 25 homilies on ecclesiology and Christian marriage |
| 8 | **2310 Galatians Commentary** | 6 chapter-by-chapter homilies; foundational on Pauline soteriology |
| 9 | **All other Pauline homilies** (2302–2309) | Complete patristic coverage of the Pauline corpus |

**For dogmatic / pastoral reading (high value):**

| Rank | Work | Why it's valuable |
|---|---|---|
| 1 | **1922 On the Priesthood** | **The foundational Orthodox treatise on Christian ministry.** 6 books in dialogue form. Essential for clergy/seminary reading. |
| 2 | **1901 Homilies on the Statues** | 21 homilies of classic Chrysostom rhetoric; on Christian conduct under crisis; pastoral preaching at its finest |
| 3 | **1908 Instructions to Catechumens** | Pre-baptismal catechesis; valuable for catechetical / preparation-for-baptism use |
| 4 | **1916 Four Letters to Olympias** | Spiritual letters during exile; profound on suffering and providence |
| 5 | **1903 Two Letters to Theodore** | On repentance after a fall; pastoral counseling |
| 6 | **1915 Second Homily on Eutropius** | The famous "vanity of vanities" sermon on the fall from imperial power |
| 7 | **1907 Lowliness of Mind** | On humility |
| 8 | **1919 Three Homilies on the Power of Satan** | Spiritual warfare |
| 9 | **1902 No One Can Harm the Man Who Does Not Injure Himself** | Ethical treatise on inner freedom |

---

## 12. Which Chrysostom works are mostly general library texts

Within Chrysostom's corpus, the lowest-priority works (still useful but less central) are:

- **1905, 1906** — short panegyrics for Sts. Ignatius and Babylas (~1 each); biographical/devotional rather than theological
- **1913, 1917, 1918** — minor letters; episodic
- **1904** — pastoral letter to a young widow (specific situation)
- **1910, 1911, 1912** — occasional sermons on specific Bible passages; valuable but topical, smaller scope than the major commentaries

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module handles ~95% of Chrysostom. Specific additions:

### 13.1 Head-verse epigraph extractor (HIGH PRIORITY)

This is the most impactful Chrysostom-specific parser feature:

```python
def extract_head_verse_chrysostom(soup, work_id, section_id):
    """
    Extract the head-verse for a Chrysostom NT commentary homily.
    Returns: BibleReference or None.

    Strategy: find the first <a href="../bible/..."> link inside #springfield2
    that appears AFTER the <h1> and BEFORE the first numbered paragraph.
    """
    content = soup.select_one("#springfield2")
    if not content:
        return None

    h1 = content.select_one("h1")
    if not h1:
        return None

    # Walk forward from h1 looking for a bible link before the first <p>N.
    for elem in h1.next_siblings:
        if elem.name == "p":
            # Check if this paragraph is the first numbered body paragraph
            text = elem.get_text(strip=True)
            if re.match(r"^\d+\.\s", text):
                # Reached the commentary body without finding a head-verse epigraph
                return None
            # Check if this paragraph contains a Bible link
            bible_link = elem.find("a", href=re.compile(r"\.\./bible/"))
            if bible_link:
                return parse_bible_link(bible_link)

    return None

def parse_bible_link(a_tag):
    href = a_tag["href"]  # e.g., "../bible/gal001.htm#verse1"
    display = a_tag.get_text(strip=True)  # e.g., "Verse 1-3" or "Galatians 1:1"

    m = re.match(r"\.\./bible/([a-z123]{3})(\d{3})\.htm(?:#verse(\d+))?", href)
    if not m:
        return None
    book = NEWADVENT_TO_OSIS.get(m.group(1))
    chapter = int(m.group(2))
    verse_start = int(m.group(3)) if m.group(3) else None

    # Parse display text for verse range (e.g., "Verse 1-3" → 1..3)
    range_match = re.search(r"(\d+)\s*[-–]\s*(\d+)", display)
    if range_match:
        verse_start = int(range_match.group(1))
        verse_end = int(range_match.group(2))
    else:
        verse_end = verse_start

    return BibleReference(book, chapter, verse_start, verse_end, display)
```

Run this extractor over all 478 NT-commentary homily files. Expect ~470 successful extractions, ~8 failures (Preface homilies without verse anchors).

### 13.2 Pericope-text extraction (companion to head-verse)

Immediately after the head-verse `<a>` link, there's often a `<p><q>...</q></p>` containing the scripture text being expounded. Extract this as `WorkSection.head_verse_text`:

```python
def extract_pericope_text(soup, head_verse_link_elem):
    """Find the <q>...</q> following the head-verse link."""
    parent_p = head_verse_link_elem.find_parent("p")
    if not parent_p:
        return None
    next_p = parent_p.find_next_sibling("p")
    if not next_p:
        return None
    q = next_p.find("q")
    if q:
        return q.get_text(" ", strip=True)
    return None
```

### 13.3 Multi-volume citation footer

Each Chrysostom work's citation footer correctly identifies its NPNF volume (9–14). Standard `<span id="srcvolume">` extraction suffices. **No special handling needed beyond what's already in the shared parser.**

### 13.4 Iteration order

Drive from `provenance_*.json` files. For Chrysostom: 17 multi-sub-page works + 19 self-contained works.

---

## 14. Risks, edge cases, cleanup issues

Re-read the Augustine companion doc §14 for the shared risk register. Chrysostom-specific items below.

### 14.1 Regex bug — already handled

The downloader's `\d{1,3}` regex (fixed during Athanasius acquisition) correctly captures Chrysostom's mixed-width sub-page IDs (5-digit for Galatians/Priesthood/etc., 6-digit for Matthew/John/Acts/etc.). No retroactive action needed.

### 14.2 LXX vs MT versification

Same risk as for all the other Greek Fathers. Chrysostom's NT homilies use NT Greek directly (no LXX issue for NT). His occasional OT citations follow LXX numbering and may differ from MT for Psalms (same caveat as other Greek Fathers).

### 14.3 Multi-translator complexity

Unlike Basil's Jackson-only translation, Chrysostom's NPNF translation involves **at least 8 different translators across 6 volumes**:
- W.R.W. Stephens (Priesthood, Statues, some misc. — Vol. 9)
- George Prevost (Matthew — Vol. 10)
- T.P. Brandram (Acts — Vol. 11)
- J.B. Morris, W.H. Simcox (Romans — Vol. 11)
- Talbot W. Chambers (1 & 2 Corinthians — Vol. 12)
- Gross Alexander (Galatians, Ephesians, Philippians — Vol. 13)
- John A. Broadus (Colossians, Thessalonians, Timothy, Titus, Philemon — Vol. 13)
- Philip Schaff (John, Hebrews — Vol. 14, partially)

The translator quality and style varies — Stephens (Priesthood) is generally considered the most readable; Prevost (Matthew) is older and more wooden. For library purposes, all are adequate. If the app ever surfaces "translation quality notes," this could be a future feature.

### 14.4 First Homily-as-Preface convention

For most NT commentary series, the **first homily is a Preface or Introduction** that has no specific Bible verse anchor — it discusses the book's context, the author, the purpose of writing. The head-verse extractor should expect `None` for these:
- 200101 (Matthew Homily 1) — Preface
- 240101 (John Homily 1) — Preface
- 210101 (Acts Homily 1) — Argument/Preface
- And similar for several Pauline series

This is normal and not an error. ~8 Preface homilies expected; ~470 head-verse extractions expected from ~478 total NT-commentary homilies.

### 14.5 Two-letters-in-one-file edge case (1903)

*Two Letters to Theodore* (1903) packages both letters into a single HTML file with `<h2>Letter 1</h2>` and `<h2>Letter 2</h2>` as section markers. The parser should chunk on these `<h2>`s to produce two WorkSection rows (rather than one giant section). This is the only Chrysostom file with this pattern.

### 14.6 Anti-Jewish content NOT in this corpus

Chrysostom's **Eight Homilies Against the Jews** (*Adversus Judaeos*) are **deliberately NOT on New Advent**. These homilies contain harsh polemic against Judaizing Christians that has been historically misused. The Theosis library should:
- Acknowledge their existence in any "complete Chrysostom" bibliography
- If ever sourced separately, present them with substantial historical-context framing
- For v1, simply not surface them

### 14.7 Multi-volume bibliographic complexity

The 36 Chrysostom works span 6 different NPNF volumes (9–14). Each volume is a separate physical book with potentially different translators, different publication year (1888 for Vol. 10; 1889 for the others), and different editor-assistant credits. The SourceRecord schema should support this — recommend a shared `BibliographicEdition` row per volume.

### 14.8 The Paschal Homily absence

Chrysostom's most famous text — the **Paschal Homily** (read at every Orthodox Easter midnight service) — is **NOT in this corpus**. It's a short text (one page) often printed in Orthodox prayer books. Sourceable from any Orthodox liturgical book or *The Pascha of Our Lord Jesus Christ* (SVS Press). Phase 2 acquisition.

### 14.9 Genesis homilies absence

Chrysostom preached **67 homilies on Genesis** — comparable in scope to his NT homily series. **None of them are in this corpus.** Major absence. Phase 2 acquisition essential for OT coverage.

### 14.10 Compute scale

552 files × ~38 KB avg = trivial in parse time. Output volume (with ~10,000 BibleRef rows) is larger than other corpora but still well under 50 MB JSONL.

---

## 15. Recommended next step for a separate integration chat

> **"Build the five-Father patristic ingestion pipeline."**
>
> 1. Read all five planning docs (Augustine, Gregory of Nyssa, Athanasius, Basil, Chrysostom).
> 2. Read the Theosis library schema; confirm or amend Person/Work/WorkSection/SourceRecord/BibleRef shapes (esp. the optional `head_verse` and `head_verse_text` fields needed for Chrysostom).
> 3. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py`.
> 4. Confirm Psalter versification (LXX vs MT) with the user.
> 5. Build `scripts/parse_newadvent/` as a shared module. Test on **five end-to-end cases** (one per Father):
>    - Augustine **1101** (Confessions) — index + 13 sub-pages
>    - Gregory **2914** (On the Making of Man) — self-contained with 30 internal chapters
>    - Athanasius **2802** (On the Incarnation) + **28161** (Discourse 1 vs Arians)
>    - Basil **3201** (Hexaemeron index) + **32011** (Homily 1) + **3203** (De Spiritu Sancto)
>    - **Chrysostom 2310 (Galatians) + 23101 (Galatians Homily 1)** — exercises the head-verse epigraph extraction pattern
> 6. Expand to all 123 works = **48 Augustine + 15 Gregory + 21 Athanasius + 3 Basil + 36 Chrysostom = 1875 HTML files**:
>    - 863 Augustine
>    - 45 Gregory
>    - 78 Athanasius
>    - 337 Basil
>    - **552 Chrysostom**
> 7. Bible-linking passes (in priority order):
>    - **PASS 1 (HIGHEST PRIORITY): Chrysostom head-verse extraction** — ~470 strong head-verse links across the NT
>    - Pass 2: Augustine head-verse linking (Tractates on John, Enarrations on Psalms, etc.)
>    - Pass 3: Basil Hexaemeron head-verse linking (9 Genesis links)
>    - Pass 4: Athanasius head-verse linking (2805)
>    - Pass 5: Mechanical `stiki` extraction across all five corpora (~25,000+ BibleRef rows)
>    - Pass 6: Thematic editorial tags
> 8. Calendar tags:
>    - Augustine, Gregory of Nyssa, Athanasius, Basil, Chrysostom feast days
>    - Three Holy Hierarchs (January 30) — joint surface of Basil + Gregory Nazianzen + Chrysostom
>    - Pascha cycle + Lent Genesis lectionary
>    - Sunday lectionary cycle → Chrysostom homily on the Gospel reading (**the killer feature enabled by Chrysostom's ~470 head-verse links**)
> 9. Cross-corpus links:
>    - Cappadocian cluster (Basil + Gregory of Nyssa + Gregory Nazianzen when acquired)
>    - Three Holy Hierarchs cluster (Basil + Gregory Nazianzen + Chrysostom)
>    - Augustine ↔ Chrysostom on Pauline letters (different traditions, parallel commentary)
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files in any author folder
> - Phase-2 acquisition (Chrysostom's Genesis Homilies, Paschal Homily, Liturgy text; missing Basil works; missing Gregory mystical works; Adversus Judaeos with appropriate framing)
> - The Gregory Nazianzen corpus (already partially downloaded — completes the Three Holy Hierarchs set)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/chrysostom/`
- Files: 552 `.html` + 36 `provenance_*.json` (+ ~500 legacy `.md` files to ignore)
- Total raw HTML: ~21.14 MB
- Works: 36 (entire New Advent Chrysostom corpus = NPNF First Series Vols. 9–14)
- Largest single file: `1903.html` 167 KB (Two Letters to Theodore)
- Largest commentary homily file: largest homilies are typically 30–60 KB
- Multi-sub-page works: 19 (17 Scripture commentary series + Statues + Priesthood)
- Self-contained works: 17
- Translators: 8+ across 6 NPNF volumes (multi-translator corpus, unlike Basil's Jackson monoculture)

## Appendix B — Acquisition log

`content/raw/_index/acquisition_log_phase1_20260520T192746.json`
(36 works OK, 0 errors, 552 files downloaded on 2026-05-20.)

## Appendix C — Sample files inspected for this plan

- `200101.html` (Matthew Homily 1 / Preface) — numbered paragraphs, no head-verse (Preface)
- `240101.html` (John Homily 1 / Preface) — same pattern
- `23101.html` (Galatians Homily 1) — **EXPLICIT HEAD-VERSE LINK + PERICOPE TEXT pattern**: `<a href="../bible/gal001.htm#verse1">Verse 1-3</a>` + `<q>Paul, an Apostle...</q>`
- `190101.html` (Statues Homily 1) — **EXPLICIT HEAD-VERSE LINK pattern (Pattern B)**: `<a href="../bible/1ti005.htm#verse23">1 Timothy 5:23</a>` embedded in `<strong><em>` epigraph
- `19221.html` (On the Priesthood Book I) — no head-verse (philosophical dialogue), numbered paragraphs
- `1903.html` (Two Letters to Theodore) — `<h2>Letter 1</h2>` / `<h2>Letter 2</h2>` section markers in single file
- `2310.html` (Galatians index) — bare TOC for 6 chapter-by-chapter homilies
- `1922.html` (On the Priesthood index) — bare TOC for 6 books
- `2001.html` (Matthew index) — bare TOC for 90 homilies
- `provenance_2001.json`, `provenance_2310.json`, `provenance_1922.json` — provenance schemas
