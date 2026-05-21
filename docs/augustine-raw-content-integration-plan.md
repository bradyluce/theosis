# Augustine Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Augustine HTML corpus downloaded from New Advent. No parser or app code has been written yet. This doc is intended as a complete brief for a separate integration chat that will build the actual ingestion pipeline.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** Predominantly NPNF (Nicene and Post-Nicene Fathers), First Series, Philip Schaff ed., late 19th c. — public domain. New Advent transcriptions © New Advent LLC; usage subject to their terms.

---

## 1. Where the Augustine files are located

All raw files live in a single directory:

```
content/raw/fathers/augustine/
```

This is the existing per-author folder under the project's `content/raw/` tree (not a new `theosis/raw/commentary/` path — the user-typed path was resolved to the existing per-author location during the original download decision).

Sibling directories of note:
- `content/raw/fathers/<other-author>/` — other Church Fathers downloaded via the same pipeline (Chrysostom, Athanasius, Basil, etc.)
- `content/raw/commentary/` — biblical commentary corpus (Catena Aurea text files, Chrysostom Scripture commentary in markdown). **Augustine works are NOT here.**
- `content/raw/_index/acquisition_log_phase2_20260520T134112.json` — top-level acquisition log for this batch

---

## 2. What files were downloaded

**Counts (in `content/raw/fathers/augustine/`):**

| Item | Count |
|---|---|
| `*.html` raw files (work indexes + sub-pages) | **863** |
| `provenance_<work_id>.json` files (one per work) | **48** |
| Legacy `*.md` files (from an earlier processing pipeline, not part of this download) | 97 |
| **Total raw HTML size** | **~34.0 MB** |

> **Acquisition history:** initial download on 2026-05-20 produced 828 files but **missed 35 sub-pages** across 10 works due to a regex bug (see §14.x). The bug was discovered during the Athanasius acquisition, the regex was widened, and the 10 affected Augustine works were re-processed on the same day. Final corpus state reflected above.

**File-naming convention:**

| Pattern | Meaning | Example |
|---|---|---|
| `NNNN.html` (4-digit) | Work index page (TOC) | `1101.html` = Confessions index |
| `NNNNN.html` (5-digit) | Sub-page of a small multi-section work (1-digit suffix) | `14081.html` = On Baptism Book 1; `16011.html` = Sermon on the Mount Book I; `12020.html` = Christian Doctrine PREFACE |
| `NNNNNN.html` (6-digit) | Sub-page of a work with ≤99 sections (2-digit suffix) | `110101.html` = Confessions Book I |
| `NNNNNNN.html` (7-digit) | Sub-page of a work with ≥100 sections (3-digit suffix) | `1701001.html` = Tractate 1 on John, `1801150.html` = Exposition on Psalm 150 |
| `provenance_NNNN.json` | Provenance sidecar for the work | `provenance_1101.json` |

The first 4 digits are the New Advent work ID. The remaining digits are a zero-padded section index. There is **no leading separator** — the full filename is a concatenation.

**Provenance JSON schema** (every work has one):

```json
{
  "schema": "theosis-provenance-v1",
  "work_id": "1101",
  "title": "Confessions",
  "source": "New Advent — newadvent.org/fathers/",
  "source_url": "https://www.newadvent.org/fathers/1101.htm",
  "dest_folder": "fathers/augustine",
  "work_type": "treatise",
  "downloaded_at": "2026-05-20T13:19:55.277490+00:00",
  "subpages": ["110101", "110102", ..., "110113"],
  "license_note": "...",
  "normalization_status": "raw"
}
```

This is the **canonical source of truth for the work manifest and sub-page ordering** — the integration pipeline should drive itself from these JSON files, not by scanning filenames.

---

## 3. Major works represented

All 48 works listed on New Advent's Augustine index page are present. Grouped by NPNF volume / theme:

### Confessions & Letters (NPNF Series I, Vol. 1)
| ID | Title | Sub-pages |
|---|---|---|
| 1101 | Confessions | 13 (one per book) |
| 1102 | Letters | 161 |

### City of God & Christian Doctrine (NPNF I, Vol. 2)
| ID | Title | Sub-pages |
|---|---|---|
| 1201 | City of God | 22 books, each as one sub-page |
| 1202 | On Christian Doctrine | 4 books |

### Doctrinal treatises (NPNF I, Vol. 3)
| ID | Title |
|---|---|
| 1301 | On the Holy Trinity (15 books) |
| 1302 | The Enchiridion |
| 1303 | On the Catechising of the Uninstructed |
| 1304 | On Faith and the Creed |
| 1305 | Concerning Faith of Things Not Seen |
| 1306 | On the Profit of Believing |
| 1307 | On the Creed: A Sermon to Catechumens |
| 1308–1316 | Continence; Good of Marriage; Holy Virginity; Good of Widowhood; Lying; To Consentius: Against Lying; Work of Monks; Patience; Care to be Had for the Dead |

### Anti-Manichaean works (NPNF I, Vol. 4)
1401–1407 (morals, two souls, Fortunatus, Faustus, etc.), 1406 = *Reply to Faustus* (33 sub-pages — large)

### Anti-Donatist works (NPNF I, Vol. 4)
1408 (On Baptism, 7 books / sub-pages), 1409 (Answer to Letters of Petilian)

### Anti-Pelagian works (NPNF I, Vol. 5)
1501–1513 (Merits and Remission; Spirit and Letter; Nature and Grace; Perfection in Righteousness; Proceedings of Pelagius; Grace of Christ and Original Sin; Marriage and Concupiscence; Soul and its Origin; Against Two Letters of the Pelagians; Grace and Free Will; Predestination of the Saints; Rebuke and Grace)

### Scripture commentary & homilies (NPNF I, Vols. 6–8) — **the Bible-linking sweet spot**
| ID | Title | Sub-pages | Notes |
|---|---|---|---|
| 1601 | Our Lord's Sermon on the Mount | 2 books | Verse-by-verse commentary on Matt 5–7 |
| 1602 | The Harmony of the Gospels | 4 books | Gospel synopsis |
| 1603 | Sermons on Selected Lessons of the New Testament | 97 sermons | Each sermon keys to a Gospel/Epistle pericope |
| 1701 | Tractates on the Gospel of John | 124 tractates | Verse-by-verse, deeply Bible-linked |
| 1702 | Homilies on the First Epistle of John | 10 homilies | Verse-by-verse |
| 1703 | Soliloquies | 2 books | Philosophical dialogue, less scripture-heavy |
| 1801 | Expositions on the Psalms (*Enarrationes in Psalmos*) | 150 psalms | One sub-page per Psalm |

Full acquisition summary: `content/raw/_index/acquisition_log_phase2_20260520T134112.json` (48 OK, 0 errors, 828 files).

---

## 4. How the files are structured internally

Every file in the corpus is a **complete, standalone New Advent HTML page** as served by `newadvent.org/fathers/<id>.htm`. They share a uniform skeleton:

```
<!DOCTYPE html>
<html lang="en">
<head>
  <title>CHURCH FATHERS: <Work or Section Title> (Augustine)</title>
  <link rel="canonical" href="https://www.newadvent.org/fathers/<id>.htm">
  <meta name="description" ...>
  <link rel="stylesheet" href="../utility/screen6.css">
</head>
<body class="fathers" id="<id>.htm">
  <!-- shared header: logo, tabs, A–Z encyclopedia bar (~30 lines of table-based nav) -->
  <div id="mi5"><span class="breadcrumbs">Home > Fathers of the Church > ... > <current></span></div>
  <div id="springfield2">
    <h1>...</h1>
    <p><em>...Please help support... gumroad...</em></p>
    <!-- MAIN CONTENT (see §6) -->
    <div class="pub">
      <h2>About this page</h2>
      <p id="src"><strong>Source.</strong> <span id="srctrans">Translated by ...</span>
         From <span id="srcwork">NPNF, First Series</span>, <span id="srcvolume">Vol. N.</span>
         <span id="srced">Edited by Philip Schaff.</span>
         (<span id="srcpublisher">...</span> <span id="srcyear">YYYY.</span>)
         <span id="kk">Revised and edited for New Advent by Kevin Knight.</span>
         <span id="srcurl">&lt;https://www.newadvent.org/fathers/<id>.htm&gt;.</span></p>
      <p id="contactus">...</p>
    </div>
  </div>
  <!-- footer + cloudflare beacon -->
</body>
```

**Two key invariants verified across the corpus:**

- `<div id="springfield2">` appears in **all 828 files** — this is the reliable main-content wrapper.
- `<span id="srctrans">` appears in **all 828 files** — citation footer is consistently present and machine-parseable.

---

## 5. One file per work? Per section? Mixed.

**Mixed structure — but with a predictable shape:**

- **For multi-section works** (the majority): one **index page** (`NNNN.html`) acts as a Table of Contents linking to N **content sub-pages** (`NNNNNN.html` or `NNNNNNN.html`). The index has TOC entries with descriptive blurbs; the sub-pages carry the actual text.
- **For short single-page works** (e.g., 1305 *Concerning Faith of Things Not Seen*, 1307 *On the Creed: A Sermon to Catechumens*, 1703 *Soliloquies*): the `NNNN.html` index page is **just a thin TOC pointing to 2–3 sub-pages**, or in some cases the work is entirely captured in a few sub-pages with a vestigial index.
- **Short single-file works**: a handful of small treatises appear to be self-contained in the `NNNN.html` index itself (size ~7–10 KB), where the body is the entire work rather than a TOC. The integration pipeline should treat any `NNNN.html` whose content has substantial paragraphs (not just TOC links) as a self-contained work.

**Heuristic for the parser:** parse the index page. If it contains TOC anchors to `NNNNNN.htm` sub-pages → it's a multi-section work, recurse into sub-pages. If the body has paragraph content with no sub-page links → it's a single-page work.

---

## 6. HTML patterns inside content pages

These are the patterns the parser must recognize. I've cited specific files where you can verify each.

### 6.1 Index/TOC pages (e.g., `1101.html`, `1102.html`, `1603.html`)

- `<h1>` = the work title (e.g., `<h1>The Confessions</h1>`)
- TOC entries are rendered as either:
  - **Block style (paragraphs):** `<p><a href="../fathers/110101.htm"><strong>BOOK 1</strong></a> {descriptive blurb}</p>` (Confessions pattern)
  - **List style (line-broken):** `<p><a href="../fathers/1102001.htm"><strong>Letter 1</strong></a> (386) From Augustine to Hermogenianus<br>...</p>` (Letters pattern)
- Sometimes TOC is grouped under `<h2>` sub-headers (e.g., Letters has `<h2>First division (AD 386-396)</h2>`)

### 6.2 Content sub-pages

| Pattern | Example | Notes |
|---|---|---|
| `<h1>` section title | `<h1>The Confessions (Book I)</h1>`<br>`<h1>Tractate 1 (John 1:1-5)</h1>`<br>`<h1>Exposition on Psalm 1</h1>` | **Title may encode the Bible passage** for commentary works (Tractates, Psalms). |
| `<p class="h1a">{...}</p>` | Book summary blurb (Confessions Books) | Optional, appears in some treatises. |
| `<h2>Chapter N. {Title}.</h2>` | `<h2>Chapter 1. He Proclaims the Greatness of God...</h2>` | Chapter heading. Both numbered chapters in long books and unnumbered section breaks. Some works use `<h2>Chapter N [Roman]. — {Title}</h2>` (anti-Pelagian works). |
| `<h2>{scripture pericope}</h2>` | `<h2>1 John 1:1-2:11</h2>` | In homilies, an `<h2>` sometimes carries the pericope being preached. |
| `<p>N. {body}</p>` | `<p>1. Great are You, O Lord...</p>` | Paragraphs start with an Arabic numeral followed by `. ` — this is the **NPNF paragraph number**. Critical for citation. |
| Inline quotes | `<q>...</q>` | Inline scripture and other quoted text. Sometimes runs continuously through a paragraph. |
| Block quotes / poetry | `<blockquote><p>line<br>line</p></blockquote>` | Used for poetry (Virgil, Terence quotes in Confessions Book I) and indented prose. |

### 6.3 Scripture references — `<span class="stiki">`

This is **the most important pattern for Bible-linking**.

```html
<span class="stiki" id="note110125"><a href="../bible/rom010.htm#verse14">Romans&nbsp;10:14</a></span>
```

Components:
- `class="stiki"` — the marker class
- `id="noteNNNNNN"` — internal anchor (corresponds to a footnote target somewhere in the doc; the numbering scheme appears to be `noteWWWXX` where WWW is the work ID and XX is a counter)
- `<a href="../bible/<book><chapter>.htm#verse<N>">{Display Text}</a>` — the actual Bible link
  - `<book>` uses 3-letter abbreviations: `rom`, `mat`, `1co`, `1jo`, `psa`, `gen`, `joh`, `luk`, `eph`, etc.
  - `<chapter>` is zero-padded to 3 digits: `010`, `001`, `001`
  - `#verse<N>` is the verse anchor (sometimes a range or just a chapter, e.g., `gen001.htm` with no verse anchor)
- Display text uses non-breaking space: `Romans&nbsp;10:14`

**Variant — psalm-exposition citation marker:** in *Expositions on the Psalms* (1801xxx), the verse-being-expounded is also tagged with `class="stiki"` but lacks the `id="noteXXX"` attribute:

```html
<span class="stiki"><a href="../bible/psa001.htm#verse1">Psalm 1:1</a></span>
```

The parser should treat these the same for linking purposes but may want to flag the first one in each paragraph as the "head verse" being expounded — this is the strongest verse↔commentary link.

### 6.4 Editorial / scholarly footnotes — `<span class="fisk">`

```html
<span class="fisk" id="note110124">[cor nostrum <em>inquietum</em> est donec <em>requiescat</em> in Te]</span>
```

- `class="fisk"` — marker class
- Content is bracketed text — typically Latin original, editor's note, or interpretive aside
- Appears far less frequently than `stiki` (Confessions Book I has 3; most files have 0–5)

### 6.5 Translation emphasis — `<span class="prefisk">`

```html
<span class="prefisk">our hearts are restless until they rest in You</span>
```

A famous-line emphasis style — the parser can map this to italic or distinguished rendering. Rare.

### 6.6 Catholic Encyclopedia hyperlinks

Throughout the body, key theological terms are linked to Catholic Encyclopedia pages:

```html
<a href="../cathen/14004b.htm">sin</a>
<a href="../cathen/06608a.htm">God</a>
```

These are **not Bible references**. The parser should either strip them or, if a future Theosis glossary feature emerges, map them to internal glossary entries. For phase 1, strip them and keep the text.

### 6.7 Navigation & breadcrumbs

```html
<div id="mi5"><span class="breadcrumbs">
  <a href="../">Home</a> > <a href="../fathers/">Fathers of the Church</a>
  > <a href="../fathers/1101.htm">The Confessions</a> > Book I
</span></div>
```

The breadcrumbs encode the parent work title (useful for verifying parent linkage) and the current section title.

### 6.8 Ads & junk

- `<div class='catholicadnet-728x90' id='fathers-728x90-top'>` — top banner ad slot
- `<div class="CMtag_300x250">` — in-content ad slots (interspersed between paragraphs)
- `<ins class="CANBMDDisplayAD">` — sticky footer ad
- `<script src="https://dtyry4ejybx0.cloudfront.net/js/cmp/cleanmediacmp.js">` — analytics/CMP
- Header `<table>` block with logo, search form, A–Z encyclopedia bar (~30 lines)
- Footer copyright bar

**All of this is non-content noise that the parser must drop.**

### 6.9 Citation footer — `<div class="pub">`

The single most valuable structured metadata block. Present in every file:

```html
<div class="pub">
  <h2>About this page</h2>
  <p id="src">
    <strong>Source.</strong>
    <span id="srctrans">Translated by J.G. Pilkington.</span>
    From <span id="srcwork">Nicene and Post-Nicene Fathers, First Series</span>,
    <span id="srcvolume">Vol. 1.</span>
    <span id="srced">Edited by Philip Schaff.</span>
    (<span id="srcpublisher">Buffalo, NY: Christian Literature Publishing Co.,</span>
    <span id="srcyear">1887.</span>)
    <span id="kk">Revised and edited for New Advent by Kevin Knight.</span>
    <span id="srcurl">&lt;https://www.newadvent.org/fathers/1101.htm&gt;.</span>
  </p>
  <p id="contactus">...</p>
</div>
```

Every field is wrapped in a `<span id="src...">` — directly parseable into a SourceRecord.

---

## 7. How clean is the HTML?

**Clean enough to parse with confidence; far from semantically pristine.**

Pros:
- Consistent `<div id="springfield2">` wrapper isolates content
- Consistent `<div class="pub">` citation footer with discrete `id="src*"` spans
- Scripture references uniformly tagged (`class="stiki"`)
- DOCTYPE present, valid-ish HTML5
- Heading hierarchy mostly sensible (`<h1>` for title, `<h2>` for chapters)
- File encoding: served as UTF-8 (header `<meta charset="utf-8">`); the downloader handles UTF-16 BOM where it occurs, so files on disk are UTF-8 text
- Display text in `stiki` spans uses non-breaking spaces (`&nbsp;`) — predictable

Cons:
- Heavy table-based legacy markup for headers/nav (mid-2000s style)
- Inline scripts and ad divs interleaved with body content (must be stripped mid-paragraph in some cases)
- HTML entities mix decimal and named (`&#151;`, `&mdash;`, `&euml;`, `&AElig;`)
- Encyclopedia hyperlinks blanket the body and visually fragment paragraph text
- Some `<h2>` headings double as both chapter titles **and** scripture pericope headers — must be disambiguated by content
- The `id="note..."` numbering schemes (`note110125`, `note170003`, `note180007`) are inconsistent (`note110XYZ` for Confessions, `note17000X` for Tractates, `note180007` for Psalms) — not a stable cross-doc identifier
- Some letters that don't exist on the source (e.g., Letter 12 in 1102 series) are simply skipped — sub-page numbering has gaps
- A handful of source pages have `<h1>` titles that differ from the title used in the index TOC (e.g., index says "BOOK 1", sub-page says "The Confessions (Book I)") — the parser must reconcile these
- TOC entries use either `<p>...<br>...<br>...</p>` line-broken lists OR one `<p>` per entry — both patterns must be handled

**Overall verdict:** parseable with BeautifulSoup or lxml + targeted CSS selectors. Plan on ~80% of files following the "core" pattern and ~20% requiring small-pattern variants.

---

## 8. Extractable metadata

For every file the parser can deterministically extract:

| Field | Source | Example |
|---|---|---|
| Author | Inferred from folder (`fathers/augustine`) or `<title>` parenthetical | `Augustine of Hippo` |
| Work ID | Filename first 4 chars; also in `<body id="NNNN.htm">` and `<link rel="canonical">` | `1101` |
| Work title | `<h1>` of the index page; also in `<title>` tag of every sub-page | `The Confessions` |
| Section ID | Filename chars 5+ (zero-padded section number) | `01` (Book 1), `124` (Tractate 124) |
| Section title | `<h1>` of the sub-page | `The Confessions (Book I)`, `Tractate 1 (John 1:1-5)` |
| Section summary | `<p class="h1a">` if present | (Confessions Book 1 summary) |
| Document order | The `subpages` array in `provenance_<work_id>.json` preserves source order. Also derivable from filename sorting since IDs are zero-padded. | — |
| Source URL | `<link rel="canonical">` in the file, OR `provenance_<work_id>.json` `source_url`, OR `<span id="srcurl">` in the citation footer | `https://www.newadvent.org/fathers/110101.htm` |
| New Advent source ID | Work ID (4-digit) is the canonical New Advent identifier | `1101` |
| Translator | `<span id="srctrans">` | `Translated by J.G. Pilkington.` |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, First Series` |
| Volume | `<span id="srcvolume">` | `Vol. 1.` |
| Editor | `<span id="srced">` | `Edited by Philip Schaff.` |
| Publisher | `<span id="srcpublisher">` | `Buffalo, NY: Christian Literature Publishing Co.,` |
| Year | `<span id="srcyear">` | `1887.` |
| Bible references | All `<span class="stiki">` blocks, each containing an `<a href="../bible/...">` link | `Romans 10:14`, normalized to `ROM 10:14` |
| Paragraph number | Leading Arabic numeral at the start of each `<p>` body, e.g., `<p>1. ...` | `1`, `2`, `27` |
| Chapter heading | Each `<h2>Chapter N. {Title}</h2>` | `(1, "He Proclaims the Greatness of God...")` |
| Work type | From `provenance_<work_id>.json` `work_type` field | `treatise`, `commentary`, `homily`, `letter` |
| License note | From provenance JSON | (public-domain disclaimer) |

For *Tractates on John* and *Expositions on the Psalms* specifically, the **head Bible reference** can be parsed from the `<h1>` title directly: `Tractate 1 (John 1:1-5)` → JHN 1:1–5, `Exposition on Psalm 1` → PSA 1.

---

## 9. Normalization to Theosis library records

The eventual library schema (working assumption — adjust to actual Prisma/SQL model if it differs):

### Person
One row for Augustine of Hippo.

```ts
Person {
  id:          "person.augustine-of-hippo"
  display:     "Augustine of Hippo"
  also_known:  ["Aurelius Augustinus", "Saint Augustine", "St. Augustine"]
  born:        354
  died:        430
  feast_day:   "06-15"   // Orthodox calendar (June 15)
  tradition:   "Western Father; venerated in both Orthodox and Catholic traditions"
  see:         "Hippo Regius"
}
```

### Work
One row per `provenance_<id>.json` — **48 Augustine works total.**

```ts
Work {
  id:               "work.augustine.1101"          // stable, derived from source ID
  author_id:        "person.augustine-of-hippo"
  title:            "Confessions"
  alt_titles:       ["Confessiones", "The Confessions"]
  work_type:        "treatise" | "commentary" | "homily" | "letter"
  composition_date: "c. 397-400"                   // looked up; not in source
  language_original:"Latin"
  has_subsections:  true
  section_count:    13
  source_id:        "src.newadvent.1101"
  description:      ""                              // optional, from TOC blurb
}
```

### WorkSection
One row per **sub-page**. ~828 rows total for Augustine — but with the index pages excluded, ~780 content rows.

```ts
WorkSection {
  id:              "section.augustine.1101.01"     // work + zero-padded order
  work_id:         "work.augustine.1101"
  order_index:     1                                // 1-based, from provenance subpages array
  section_type:    "book" | "chapter" | "tractate" | "psalm" | "homily" | "letter" | "sermon"
  short_label:     "Book I"                         // or "Tractate 1", "Psalm 1", "Letter 5", "Sermon 12"
  display_title:   "The Confessions (Book I)"       // from <h1>
  summary:         "Commencing with the invocation of God..." // from <p class="h1a"> or TOC blurb
  body_html:       "<...cleaned content...>"        // normalized
  body_text:       "..."                             // plain text for search indexing
  chapters:        Chapter[]                         // optional nested array — see below
  source_id:       "src.newadvent.1101.01"
  bible_refs:      BibleRef[]                        // see §10
}
```

For works with chapters inside a book (Confessions, City of God, Trinity), each `WorkSection` body contains multiple `<h2>Chapter N</h2>` segments. Two modeling options:
- **Option A (flat):** one `WorkSection` per sub-page, store `chapters` as JSON inside.
- **Option B (deep):** one `WorkSection` per `<h2>` chapter inside a sub-page. Generates ~5,000+ rows but enables verse-level deep linking.

Recommendation: **start with Option A** (one row per sub-page); add a finer-grained `WorkSectionChapter` table later if needed for citations like "Confessions 1.3.3" (Book 1, Chapter 3, Para 3).

### SourceRecord
One row per work, carrying the bibliographic + license info from the citation footer:

```ts
SourceRecord {
  id:              "src.newadvent.1101"
  work_id:         "work.augustine.1101"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/1101.htm"
  translator:      "J.G. Pilkington"
  series:          "Nicene and Post-Nicene Fathers, First Series"
  volume:          "Vol. 1"
  editor:          "Philip Schaff"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1887
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/augustine/1101.html"
  provenance_json: "content/raw/fathers/augustine/provenance_1101.json"
}
```

### Foreign-key flow

```
Person (1) ──< Work (48) ──< WorkSection (~780) ──< BibleRef (thousands)
                  │
                  └── SourceRecord (48)
```

---

## 10. Bible-linking strategy

The Augustine corpus is one of the strongest patristic Bible-linking opportunities in the entire library — partly because Augustine cited Scripture constantly, and partly because New Advent has already done the heavy lifting of tagging every reference.

### 10.1 Direct verse commentary (one-to-one mapping)

For works where the section title encodes a Bible passage, the integration pipeline can produce **strong, unambiguous link records:**

| Work | Linking strategy |
|---|---|
| **1701 Tractates on the Gospel of John** | Parse `<h1>Tractate N (John A:B-C)</h1>` → link this WorkSection to John A:B–C inclusive. **124 strong section-level links.** |
| **1702 Homilies on the First Epistle of John** | Use the `<h2>1 John X:Y-Z</h2>` pericope subtitle → link to that range. **10 strong links** (plus the homily contains its own dense `stiki` refs). |
| **1801 Expositions on the Psalms** | Parse `<h1>Exposition on Psalm N</h1>` → link to Psalm N (whole psalm). **150 strong links — one per psalm.** This alone covers the entire Psalter with Augustinian commentary. |
| **1601 Our Lord's Sermon on the Mount** | Whole work pegged to Matt 5–7. Sub-page level — parse `<h1>` and chapter headings to identify which verses of Matt 5–7 are being expounded. |
| **1602 The Harmony of the Gospels** | Augustine walks through Gospel parallels. Sub-page level pegging is plausible but requires content analysis. |
| **1603 Sermons on Selected Lessons of the New Testament** | Each of the 97 sermons opens with a Gospel/Epistle text. Parse the opening `<h2>` or first paragraph for the lesson reference. |

### 10.2 Scripture references inside the text (many-to-many mapping)

Across all 828 files, every `<span class="stiki">` is a **citation record** that should produce a link from a `WorkSection` to a Bible verse/range. Estimate: tens of thousands of references corpus-wide.

```ts
BibleRef {
  id:               "bref.augustine.110101.0001"
  work_section_id:  "section.augustine.1101.01"
  bible_book:       "ROM"                            // normalized 3-letter code
  chapter:          10
  verse_start:      14
  verse_end:        14                                // null/equal for single verse
  display_text:     "Romans 10:14"
  position_in_text: 1234                              // char offset into the cleaned body
  citation_type:    "direct"   // "direct" | "head_verse" | "allusion"
  raw_anchor_url:   "../bible/rom010.htm#verse14"
}
```

Notes:
- New Advent's book abbreviations need mapping to a canonical OSIS-style scheme: `1co` → `1CO`, `joh` → `JHN`, `psa` → `PSA`, `mat` → `MAT`. Build a one-time lookup table.
- Verse ranges sometimes appear as `#verse11` (single) or display-text `1 John 1:9-10` (range encoded in text but linked to a single verse anchor). Parse the **display text** for range; use the anchor for the start verse.
- The display text can deceive: `Genesis viii` (a Roman-numeral chapter without verse) means whole chapter — keep `verse_start = null` in that case.

### 10.3 Thematic links

Beyond verse-level citations, Augustine's anti-Pelagian works (1501–1513) are a thematic powerhouse for Romans, Galatians, John, and the Wisdom literature. A "thematic tag" pass could mark, e.g., *On the Spirit and the Letter* (1502) as commentary on 2 Cor 3:6 ("the letter kills, but the spirit gives life") — this is the **organizing verse** of the work, even though it's only one cited verse among many. This kind of thematic linking is editorial and shouldn't block the verse-level pass.

### 10.4 Homily / sermon links

Augustine's *Sermons* (1603) and the two homily series (1702 on 1 John, plus much of 1801) are natural fits for the Theosis daily-reading flow:
- If a user is reading John 6 today, surface *Tractate 25–27* (the Bread-of-Life tractates).
- If today's Psalm is Psalm 51 in the Orthodox lectionary, surface Augustine's *Exposition on Psalm 50* (LXX numbering — see §14 for the LXX/MT versification risk).

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Head-verse linking**: parse `<h1>` titles for works 1601, 1602, 1701, 1702, 1801. Produces ~280 strong section-level Bible refs.
2. **Pass 2 — Inline `stiki` extraction**: walk every content sub-page; produce a `BibleRef` row per `<span class="stiki">`. Massive but mechanical.
3. **Pass 3 — Pericope parsing for sermons (1603)**: open each sermon; extract the lesson text from the opening section.
4. **Pass 4 — Thematic editorial tags**: hand-curated, post-launch.

---

## 11. Which Augustine works are most useful for Bible-linking

Ranked by linking strength and breadth of biblical coverage:

| Rank | Work | Why it's valuable |
|---|---|---|
| 1 | **1801 Expositions on the Psalms** (150 sub-pages) | 100% Psalter coverage — one commentary section per psalm. Single most useful Augustinian source for a Bible reader. |
| 2 | **1701 Tractates on the Gospel of John** (124 sub-pages) | Verse-by-verse exposition of the entire Gospel of John. |
| 3 | **1702 Homilies on the First Epistle of John** (10 sub-pages) | Complete verse-by-verse commentary on 1 John. |
| 4 | **1601 Our Lord's Sermon on the Mount** (2 books) | Definitive Augustinian commentary on Matt 5–7 — Beatitudes and Lord's Prayer. |
| 5 | **1603 Sermons on Selected Lessons of the NT** (97 sermons) | Each sermon keys to a Gospel/Epistle reading, often matching lectionary cycles. |
| 6 | **1602 Harmony of the Gospels** (4 books) | Useful for Gospel parallels and harmonization questions. |
| 7 | **1502 On the Spirit and the Letter** | Anti-Pelagian — but built around 2 Cor 3:6 and saturated with Romans / Galatians citations. |
| 8 | **1301 On the Holy Trinity** (15 books) | Dense with Genesis, John, Paul citations; the foundation for Trinitarian exegesis. |
| 9 | **1101 Confessions** | High Psalm density throughout; the prayer-and-Scripture voice. Books 11–13 are direct Genesis 1 exegesis. |
| 10 | **1201 City of God** (22 books) | Sweeping; Books 11–18 cover salvation history with heavy OT exegesis. |

---

## 12. Which Augustine works are mostly general library texts

These belong in the library but are unlikely to drive verse-level Bible-linking. They're best surfaced via topical browsing, author pages, or thematic suggestions.

- **1102 Letters** (161 sub-pages) — biographical, pastoral, sometimes doctrinal. Scripture-cited but episodic. Searchable corpus rather than a commentary.
- **1308–1316** — short ethical / pastoral treatises (Continence, Good of Marriage, Lying, Patience, Care for the Dead). Library reading material, low verse-linking density.
- **1401–1407** Anti-Manichaean treatises — historical-polemical; few clean verse anchors.
- **1408–1409** Anti-Donatist works — ecclesiology-focused.
- **1703 Soliloquies** — philosophical dialogue; very low scripture density (`stiki` count near zero in the index).
- **1302 The Enchiridion** — handbook of faith/hope/love; topical, not exegetical.
- **1303 On the Catechising of the Uninstructed** — methodology, not commentary.

---

## 13. Recommended parser strategy

**Language: Python (recommended)** — BeautifulSoup or lxml are battle-tested for this. The existing `scripts/newadvent_downloader.py` and `scripts/process_fetch.py` are already in Python, so this fits the established pipeline.

### 13.1 Modules

```
scripts/parse_augustine/
├── manifest.py           # read provenance_*.json, produce work + section order
├── extract.py            # BeautifulSoup-based extractor for a single HTML file
├── normalize.py          # map raw → Person/Work/WorkSection/SourceRecord/BibleRef shapes
├── bible_refs.py         # extract & normalize <span class="stiki"> blocks
├── book_codes.py         # New Advent abbrev → OSIS map (rom→ROM, joh→JHN, etc.)
├── write_records.py      # emit JSONL or upsert into Theosis DB
└── tests/
    ├── fixtures/         # snapshot of 5-10 representative HTML files
    └── test_*.py         # unit tests against fixtures
```

### 13.2 Core extraction algorithm (per file)

```python
def extract(html_path: Path) -> ParsedSection:
    soup = BeautifulSoup(html_path.read_text("utf-8"), "lxml")

    # Isolate the content wrapper — present in 100% of files
    content = soup.select_one("#springfield2")

    # Remove ads, scripts, the "Please help support" banner
    for sel in [".catholicadnet-728x90", ".CMtag_300x250", "script", "ins",
                "p:has(a[href*='gumroad.com'])"]:
        for tag in content.select(sel):
            tag.decompose()

    # Pull citation footer BEFORE removing it
    pub = content.select_one(".pub")
    source = parse_pub(pub) if pub else None
    if pub: pub.decompose()

    # Pull the section title
    h1 = content.select_one("h1")
    title = h1.get_text(strip=True) if h1 else None
    if h1: h1.decompose()

    # Walk chapters (h2) and paragraphs
    chapters = []
    current = {"title": None, "paragraphs": []}
    for el in content.children:
        if el.name == "h2":
            if current["paragraphs"]:
                chapters.append(current)
            current = {"title": el.get_text(strip=True), "paragraphs": []}
        elif el.name == "p":
            current["paragraphs"].append(parse_paragraph(el))
    if current["paragraphs"]:
        chapters.append(current)

    return ParsedSection(title, chapters, source, bible_refs=collect_stiki(content))
```

### 13.3 Paragraph parsing

```python
def parse_paragraph(p_tag) -> Paragraph:
    # NPNF paragraph number: leading Arabic numeral
    raw = p_tag.get_text(" ", strip=True)
    m = re.match(r"^(\d+)\.\s+(.*)", raw)
    para_num = int(m.group(1)) if m else None
    body_text = m.group(2) if m else raw

    # Collect inline stiki refs in document order with character offsets
    refs = []
    for span in p_tag.select("span.stiki"):
        a = span.select_one("a")
        if a:
            refs.append(parse_bible_ref(a.get("href"), a.get_text(" ", strip=True)))

    return Paragraph(num=para_num, text=body_text, html=str(p_tag), bible_refs=refs)
```

### 13.4 Bible reference normalization

```python
NEWADVENT_TO_OSIS = {
    "gen": "GEN", "exo": "EXO", "psa": "PSA",
    "mat": "MAT", "mar": "MRK", "luk": "LUK", "joh": "JHN",
    "act": "ACT", "rom": "ROM", "1co": "1CO", "2co": "2CO",
    "gal": "GAL", "eph": "EPH", "phi": "PHP", "col": "COL",
    "1th": "1TH", "2th": "2TH", "1ti": "1TI", "2ti": "2TI",
    "tit": "TIT", "phm": "PHM", "heb": "HEB", "jam": "JAS",
    "1pe": "1PE", "2pe": "2PE", "1jo": "1JN", "2jo": "2JN",
    "3jo": "3JN", "jud": "JUD", "rev": "REV",
    # deuterocanon (Augustine cites Sirach, Wisdom)
    "wis": "WIS", "sir": "SIR", "tob": "TOB", "jdt": "JDT",
    "1ma": "1MA", "2ma": "2MA", "bar": "BAR",
    # ...build out incrementally; log unknowns
}

def parse_bible_ref(href: str, display: str) -> BibleRef:
    # href is like ../bible/rom010.htm#verse14
    m = re.match(r"\.\./bible/([a-z123]{3})(\d{3})\.htm(?:#verse(\d+))?", href)
    if not m: return None
    book = NEWADVENT_TO_OSIS.get(m.group(1))
    chapter = int(m.group(2))
    verse = int(m.group(3)) if m.group(3) else None
    # display sometimes encodes a range like "1 John 1:9-10" — parse for verse_end
    range_match = re.search(r":\s*\d+\s*[-–]\s*(\d+)", display)
    verse_end = int(range_match.group(1)) if range_match else verse
    return BibleRef(book, chapter, verse, verse_end, display)
```

### 13.5 Iteration order

Always drive the corpus from the **provenance JSON files**, not the filesystem:

```python
for prov in sorted(augustine_dir.glob("provenance_*.json")):
    data = json.loads(prov.read_text("utf-8"))
    work = build_work(data)
    yield work
    for order, sub_id in enumerate(data["subpages"], start=1):
        sub_path = augustine_dir / f"{sub_id}.html"
        parsed = extract(sub_path)
        yield build_section(work, order, parsed)
```

This guarantees correct document order and avoids filename-sort surprises.

### 13.6 Output format

For a first pass, emit **JSONL** to `content/normalized/fathers/augustine/`:
- `works.jsonl` — 48 lines
- `sections.jsonl` — ~780 lines
- `bible_refs.jsonl` — many thousands of lines
- `sources.jsonl` — 48 lines

A separate loader can then upsert these into the actual Theosis DB. Keeps parsing and DB-writing decoupled and re-runnable.

---

## 14. Risks, edge cases, cleanup issues

### 14.0 Downloader regex bug — FIXED retroactively

The original `extract_subpage_links()` regex in `scripts/newadvent_downloader.py` was `\d{2,3}`, which required 2- or 3-digit suffixes for sub-page IDs. **10 Augustine works use 1-digit suffixes** (5-digit total sub-page IDs) and were originally captured as TOC-only stubs:

| Work ID | Title | Sub-pages affected |
|---|---|---|
| 1202 | On Christian Doctrine | `12020`–`12024` (5: PREFACE + 4 books) |
| 1408 | On Baptism Against the Donatists | `14081`–`14087` (7 books) |
| 1409 | Answer to Letters of Petilian | `14091`–`14093` (3 books) |
| 1501 | Merits and Remission of Sin, and Infant Baptism | `15011`–`15013` (3 books) |
| 1506 | On the Grace of Christ and Original Sin | `15061`–`15062` (2 books) |
| 1507 | On Marriage and Concupiscence | `15070`–`15072` (3 sub-pages) |
| 1508 | On the Soul and its Origin | `15081`–`15084` (4 books) |
| 1509 | Against Two Letters of the Pelagians | `15091`–`15094` (4 books) |
| 1512 | The Predestination of the Saints / Gift of Perseverance | `15121`–`15122` (2 parts) |
| 1601 | Our Lord's Sermon on the Mount | `16011`–`16012` (2 books) |

**Status:** the regex was widened to `\d{1,3}` and all 35 missing sub-pages were re-acquired on 2026-05-20. The final corpus state is reflected in §2 and Appendix A. **This impacts the Bible-linking pass positively:** `16011`/`16012` (*Sermon on the Mount*) was previously a 0.6 KB stub and is now a complete verse-by-verse commentary on Matthew 5–7 (~287 KB total across the two books) — directly usable as head-verse linking material.

### 14.1 Versification — Septuagint (LXX) vs. Masoretic (MT) Psalms

**This is the biggest landmine for the Bible-linking pass on the Psalter (1801).**

NPNF translates from the Latin Vulgate, which follows LXX Psalm numbering. Augustine's "Exposition on Psalm 9" actually covers two MT Psalms (LXX 9 = MT 9 + 10). MT and LXX diverge from Psalm 10 through Psalm 147:
- LXX Pss 10–112 = MT Pss 11–113 (offset by one)
- LXX Ps 113 = MT Pss 114 + 115 (combined)
- LXX Pss 114–115 = MT Ps 116 (split)
- LXX Pss 116–145 = MT Pss 117–146
- LXX Ps 146 = MT Ps 147:1–11; LXX Ps 147 = MT Ps 147:12–20
- LXX Pss 148–150 = MT 148–150

**Theosis is an Orthodox app — LXX numbering is canonical.** If the Theosis Psalter follows LXX (it should, given the Orthodox orientation), then Augustine's Psalm numbering aligns natively and no remapping is needed. If the app exposes both, the integration should store both `LXX_num` and `MT_num` on each Psalm WorkSection. **Confirm Psalter versification scheme with the Bible reader before parsing 1801.**

### 14.2 Mixed deuterocanonical citations

Augustine cites Sirach ("Ecclesiasticus"), Wisdom, Tobit, Judith, 1–2 Maccabees, Baruch freely. The book-code map must cover them.

### 14.3 Roman vs. Arabic numerals

Some `<h2>` headings use Roman numerals: `<h2>Chapter VI [IV.]&mdash; ...</h2>`. The parser should handle both, or just store the heading text verbatim and not try to extract a number.

### 14.4 Sub-page numbering gaps

Letters has gaps (Letter 12 missing → `1102011.htm` exists, no `1102012.htm`, `1102013.htm` exists). This is intentional — those letters aren't extant or aren't included in the NPNF selection. The integration should not panic on gaps; iterate the provenance `subpages` array literally.

### 14.5 Sermons (1603) numbering offset

NPNF's "Sermons on Selected Lessons" uses a New-Advent sermon-index numbering that does **not** equal the canonical Latin Sermones numbering (where Augustine left ~500 sermons). Cross-referencing to other patristic editions (PL, CCSL) is out of scope for this raw HTML — but worth noting.

### 14.6 Confessions duplicates and `.md` legacy files

The directory currently contains 97 legacy `.md` files alongside the 828 `.html` files. They were produced by an earlier markdown-conversion pipeline and have different naming (`1101.md`, `110101.md`, etc.). The integration should **read only `.html` files** and ignore the `.md`s. A separate cleanup task should decide whether to delete them or move to `content/raw/_legacy/`.

### 14.7 Ad placement breaks paragraph continuity

`<div class="CMtag_300x250">` ads are sometimes injected **between paragraphs in the middle of a chapter**. They are sibling elements to `<p>` tags inside `#springfield2`. The decompose step should run **before** chapter/paragraph walking — otherwise the walker has to skip over them.

### 14.8 Cross-paragraph quotes

Some long block quotes in *Confessions* are `<blockquote><p>...</p></blockquote>`. The parser should treat blockquote children as quoted poetry/prose, not as new paragraphs in the main numbering.

### 14.9 Encyclopedia link spam

Every `<a href="../cathen/...">` adds visual noise and would be a broken link if dropped into the app naively. Strip the `<a>` but keep the inner text. Optionally, log a frequency table of cathen URLs to inform a future glossary build.

### 14.10 Encoding glitches

`&#151;` (em-dash) and stray `&` entities appear. BeautifulSoup decodes most of them; a final pass to normalize whitespace and entities (`&#151;` → `—`, `&nbsp;` → ` `) is cheap insurance.

### 14.11 New Advent ToS / attribution

The transcriptions are © New Advent LLC. The integration pipeline must:
- Carry the citation footer data into every WorkSection's `SourceRecord`
- Display source attribution on every reader screen (e.g., "Translation: NPNF Vol. 1 (Schaff ed., 1887), revised by Kevin Knight for New Advent. Public domain.")
- Avoid presenting the text as the app's own work

The underlying NPNF translation is public domain (pre-1928 US publication); only the New Advent transcription/markup is © New Advent.

### 14.12 Bible reference anchors not in the Theosis Bible reader

If the Theosis Bible reader uses a different chapter/verse anchor convention (e.g., `?ref=rom.10.14` vs. `#verse14`), the migration only needs the book/chapter/verse triple in the `BibleRef` record — the anchor format is reconstructed at render time.

### 14.13 Catholic-vs-Orthodox doctrinal markers

Augustine is venerated in Orthodoxy (June 15), but his anti-Pelagian works (especially predestination in 1512, original sin in 1506) are read differently in East and West. The library should expose the texts without editorializing, but **the app may want metadata flags** like `controversy: ["pelagianism", "predestination"]` on certain works to drive contextual reading notes.

### 14.14 Compute scale

828 files × ~36 KB avg = a few seconds of parse time. Trivial. The bigger cost is the **storage of normalized output** (probably ~50–100 MB JSONL once paragraphs are expanded) and **DB write throughput** if doing live inserts.

---

## 15. Recommended next step for a separate integration chat

Hand the next chat a focused task:

> **"Build the Augustine ingestion pipeline."**
>
> 1. Read this plan: `docs/augustine-raw-content-integration-plan.md`.
> 2. Read the actual Theosis library schema (Person, Work, WorkSection, SourceRecord, BibleRef tables) — confirm or amend the assumed shape in §9.
> 3. Read `scripts/process_fetch.py` and `scripts/newadvent_downloader.py` to understand the existing pipeline conventions.
> 4. Confirm Psalter versification with the user (LXX vs. MT) — see §14.1.
> 5. Build `scripts/parse_augustine/` per §13. Start with a **single-work end-to-end test** on `1101` (Confessions): produce `works.jsonl`, `sections.jsonl`, `bible_refs.jsonl`, `sources.jsonl` for that one work.
> 6. Validate the output (paragraph numbering preserved, all `stiki` refs captured, citation footer extracted, no ad junk in body) on Confessions Book I (`110101.html`) — see the inspected sample.
> 7. Then expand to all 48 works. Estimate 1 working session for the pipeline + 1 for end-to-end validation.
> 8. The Bible-linking pass for Psalms (1801) and Tractates on John (1701) should be **explicit milestones** — they unlock the highest-value reader features (one-tap commentary from a verse).
>
> **Out of scope for that chat:**
> - The Bible reader UI itself
> - Daily-calendar integration
> - Search indexing
> - Any cleanup of the legacy `.md` files

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/augustine/`
- Files: 863 `.html` + 48 `provenance_*.json` (+ 97 legacy `.md` to ignore)
- Total raw HTML: ~34.0 MB
- Works: 48 (full New Advent Augustine corpus)
- Single largest sub-page: `140622.html` ~292 KB (Reply to Faustus, Book 22)
- Smallest single-page work: `1703.html` ~7 KB (Soliloquies index — only 2 sub-pages, both small)
- Heaviest works by sub-page count:
  - 1102 Letters: 161
  - 1801 Expositions on the Psalms: 150
  - 1701 Tractates on John: 124
  - 1603 Sermons on the NT: 97
- Works with 1-digit (5-digit total) sub-page IDs (10 works, 35 sub-pages — see §14.0):
  - 1202 (5), 1408 (7), 1409 (3), 1501 (3), 1506 (2), 1507 (3), 1508 (4), 1509 (4), 1512 (2), 1601 (2)

## Appendix B — Acquisition log

Full per-work download summary:
`content/raw/_index/acquisition_log_phase2_20260520T134112.json`
(48 works OK, 0 errors, 828 files downloaded on 2026-05-20.)

## Appendix C — Sample files inspected for this plan

- `1101.html` (Confessions index) — multi-section TOC pattern
- `110101.html` (Confessions Book I) — treatise-with-chapters pattern
- `1701001.html` (Tractate 1 on John) — Bible-commentary pattern with title-encoded reference
- `1801001.html` (Exposition on Psalm 1) — Psalter exposition pattern, head-verse `stiki`
- `170201.html` (Homily 1 on 1 John) — homily-on-pericope pattern with `<h2>` passage label
- `1502.html` (On the Spirit and the Letter) — short anti-Pelagian treatise, `<h2>` chapters with Roman numerals
- `1102.html` (Letters index) — `<br>`-separated TOC style with grouped `<h2>` sections
- `1603.html` (Sermons on the NT index) — `<br>`-separated TOC, 97 sermons
- `1703.html` (Soliloquies index) — minimal 2-sub-page work
- `provenance_1101.json`, `provenance_1701.json` — provenance schema samples
