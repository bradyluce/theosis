# Gregory of Nyssa Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Gregory of Nyssa HTML corpus downloaded from New Advent. No parser or app code has been written yet. This doc is intended as a complete brief for a separate integration chat that will build the actual ingestion pipeline.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** NPNF (Nicene and Post-Nicene Fathers), **Second Series**, Vol. 5 — Schaff & Wace eds., 1893. Public domain. Translators: W. Moore, H.A. Wilson, H.C. Ogle. New Advent transcriptions © New Advent LLC; usage subject to their terms.

> **Companion doc:** [`docs/augustine-raw-content-integration-plan.md`](augustine-raw-content-integration-plan.md). Most HTML patterns are identical between the two corpora — this doc highlights Gregory-specific structural differences and Orthodox-tradition relevance.

---

## 1. Where the Gregory of Nyssa files are located

All raw files live in a single directory:

```
content/raw/fathers/gregory-nyssa/
```

Same per-author convention used for Augustine and other Fathers. Sibling Cappadocian fathers live in `content/raw/fathers/basil/` and `content/raw/fathers/gregory-nazianzen/`.

---

## 2. What files were downloaded

**Counts (in `content/raw/fathers/gregory-nyssa/`):**

| Item | Count |
|---|---|
| `*.html` raw files (work indexes + sub-pages + self-contained works) | **45** |
| `provenance_<work_id>.json` files (one per work) | **15** |
| Legacy `*.md` files (from an earlier processing pipeline, not part of this download) | ~45 |
| **Total raw HTML size** | **~2.96 MB** |

**File-naming convention** (same as Augustine):

| Pattern | Meaning | Example |
|---|---|---|
| `NNNN.html` (4-digit) | Work index page OR self-contained work (see §5) | `2901.html` = Against Eunomius index; `2904.html` = entire *On the Holy Trinity* |
| `NNNNNN.html` (6-digit) | Sub-page of a multi-section work | `290101.html` = Against Eunomius Book I; `291103.html` = Letter 3 |
| `provenance_NNNN.json` | Provenance sidecar for the work | `provenance_2901.json` |

**Provenance JSON schema** is identical to Augustine — see the companion doc §2. Key fields: `work_id`, `title`, `source_url`, `work_type`, `subpages[]`, `downloaded_at`. **Drive iteration from these files**, not by glob.

Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T182141.json` — 15/15 OK, 0 errors, 45 files.

---

## 3. Major works represented

All 15 works listed on New Advent's Gregory of Nyssa index page are present. All are translations from NPNF Second Series, Vol. 5 (a single source volume — unlike Augustine which spans NPNF First Series Vols. 1–8).

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **2901** | Against Eunomius | treatise | 12 books | Anti-Arian polemic; defends Basil after his death |
| **2902** | Answer to Eunomius' Second Book | treatise | 0 (single 408 KB page) | Companion to 2901 |
| **2903** | On the Holy Spirit (Against the Followers of Macedonius) | treatise | 0 | Pneumatology |
| **2904** | On the Holy Trinity, and of the Godhead of the Holy Spirit (To Eustathius) | treatise | 0 | Single-page letter-treatise |
| **2905** | On "Not Three Gods" (To Ablabius) | treatise | 0 | Famous Trinitarian text |
| **2906** | On the Faith (To Simplicius) | treatise | 0 | Trinitarian |
| **2907** | On Virginity | treatise | 0 (24 chapters in one 150 KB page) | Asceticism; ch. 1 outlines theology of virginity-as-deification |
| **2908** | The Great Catechism | treatise | 0 (chapters in one page) | Systematic Christian theology — Christology, Incarnation, sacraments |
| **2909** | Funeral Oration on Meletius | homily | 0 | Single oration; high rhetorical density, biographical |
| **2910** | On the Baptism of Christ (Sermon for the Day of Lights) | homily | 0 | Liturgical sermon on Theophany |
| **2911** | Letters | letter | 18 letters | Festal letters, pastoral correspondence |
| **2912** | On Infants' Early Deaths | treatise | 0 | Eschatology / theodicy |
| **2913** | On Pilgrimages | treatise | 0 (single short page) | Pastoral letter against pilgrimage-piety |
| **2914** | On the Making of Man | treatise | 0 (30 chapters in one 245 KB page) | Anthropology — completes Basil's *Hexaemeron*; key text for Orthodox personhood |
| **2915** | On the Soul and the Resurrection | treatise (dialogue) | 0 (single 211 KB page) | Dialogue with his sister Macrina; foundational Orthodox eschatology |

**Total works:** 15. **Source volume:** NPNF Series II, Vol. 5 (single volume covers all of Gregory).

### Notable absences from this corpus (NOT on New Advent)

New Advent only has the NPNF Vol. 5 selection. Several major Gregory texts central to Orthodox spirituality are **NOT available in this corpus** and would need to be sourced elsewhere (St. Vladimir's Seminary Press editions, Migne PG, or modern critical editions):

- **The Life of Moses** (*De Vita Moysis*) — Gregory's mystical-ascetical masterwork. Not in NPNF.
- **Commentary on the Song of Songs** (15 homilies) — Foundational allegorical-mystical text.
- **The Beatitudes** (8 homilies) — Gregory's Sermon-on-the-Mount commentary.
- **On the Lord's Prayer** (5 homilies) — Catechetical / liturgical.
- **On the Inscriptions of the Psalms** — Psalter exegesis.
- **Catechetical Oration (Oratio Catechetica Magna)** — actually **IS** in this corpus as 2908 "The Great Catechism"; just noting the naming difference.
- **On the Beatitudes** and **On Ecclesiastes** homilies.

**Implication:** Gregory of Nyssa's New Advent corpus is heavier on his **anti-heretical / dogmatic** works (Against Eunomius, On the Holy Trinity, On "Not Three Gods") and his **anthropology** (On the Making of Man, On the Soul and the Resurrection), but **lighter on his Scripture exegesis and mystical-ascetic homilies** — which are arguably his most distinctive contributions to Eastern Christian spirituality. The integration plan should flag a Phase-2 acquisition for these missing texts from a different source.

---

## 4. How the files are structured internally

Every file is a standalone New Advent HTML page with the **same shell as the Augustine corpus**:

- `<head>` with title, canonical link, `screen6.css`
- Shared header (logo, search, A–Z encyclopedia bar, tab nav) — junk to drop
- `<div id="mi5"><span class="breadcrumbs">…</span></div>` — breadcrumb trail
- **`<div id="springfield2">`** — main content wrapper (verified present in all 45 files)
- `<h1>` work or section title
- "Please help support" Gumroad banner (`<p><em><a href="https://gumroad.com/l/na2">…</a></em></p>`) — drop
- Main body
- **`<div class="pub">`** — citation footer with `id="src*"` spans
- Footer + Cloudflare beacon

**Two key invariants verified across the corpus:**

- `<div id="springfield2">` appears in **all 45 files**.
- `<span id="srctrans">` appears in **all 45 files** — citation footer is consistently present.

See companion Augustine doc §4 for the complete skeleton. Identical here.

---

## 5. One file per work? Per section? **Mostly one file per work.**

**This is the biggest structural difference vs Augustine.** For Augustine, almost every multi-section work has an index page plus N content sub-pages. For Gregory, the inverse is true: **the majority of works are self-contained in a single large `NNNN.html` file** with chapter headings inside.

### Multi-sub-page works (2 of 15)

| Work ID | Sub-pages |
|---|---|
| **2901** Against Eunomius | 12 (one per book) |
| **2911** Letters | 18 (one per letter) |

### Single-page works (13 of 15)

All other works are delivered as one HTML page. The longest ones embed many chapters as `<h2>` headings inside one file:

| Work ID | Title | File size | Internal structure |
|---|---|---|---|
| **2902** Answer to Eunomius II | 408 KB | Chapters as `<h2>1.</h2>`, `<h2>2.</h2>`, ... |
| **2914** On the Making of Man | 245 KB | 30 chapters as `<h2>I.</h2>` through `<h2>XXX.</h2>` |
| **2915** On the Soul and the Resurrection | 211 KB | No chapter headings; one long dialogue with paragraph breaks |
| **2907** On Virginity | ~150 KB | 24 chapters as `<h2>Chapter 1</h2>` ... `<h2>Chapter 24</h2>` |
| **2908** The Great Catechism | ~100 KB | Chapters as `<h2>`s |
| **2912** On Infants' Early Deaths | ~60 KB | Continuous flow, no chapter markers |
| **2909** Funeral Oration on Meletius | ~12 KB | Continuous oration, no internal headings |
| **2904** On the Holy Trinity | ~6 KB | Single letter-treatise, no headings |
| **2905** On "Not Three Gods" | ~6 KB | Single short treatise |
| **2906** On the Faith | ~9 KB | Single short treatise |
| **2910** On the Baptism of Christ | ~7 KB | Single sermon |
| **2913** On Pilgrimages | ~4 KB | Single short letter |
| **2903** On the Holy Spirit | ~1 KB | **Very short — possibly only a fragment or stub on New Advent** |

**Parser heuristic:** for each work, after parsing the index `NNNN.html`, check:
- If TOC anchors to `NNNNNN.htm` exist → it's a multi-sub-page work (only 2901, 2911 for Gregory).
- If `<h2>` headings exist inside `#springfield2` and there's substantial body text → it's a self-contained work with internal chapters; parse those `<h2>`s as `WorkSectionChapter` records.
- If there are no `<h2>` headings and the body is one long stream of `<p>` tags → it's a single-section work (e.g., 2909 Funeral Oration, 2904 On the Holy Trinity); treat the whole thing as one WorkSection.

---

## 6. HTML patterns inside content pages

The patterns are **identical to Augustine** with a few important quirks. Cross-reference the Augustine doc §6 for the full pattern catalog. Gregory-specific notes follow.

### 6.1 Index/TOC pages

Used only for **2901** and **2911**:

- `<h1>` = work title (`<h1>Against Eunomius</h1>`)
- TOC entries as line-broken anchors:
  ```html
  <p><a href="../fathers/290101.htm">Book I</a>
  <br><a href="../fathers/290102.htm">Book II</a>
  ...</p>
  ```
- 2911 (Letters) lists letters numerically: `<p><a href="../fathers/291101.htm">Letter 1</a><br>...</p>`
- No descriptive blurbs on TOC entries (Augustine's Confessions had blurbs; Gregory's TOCs are bare).

### 6.2 Content sub-pages and self-contained works

**Section titles** — `<h1>` patterns observed:

| Pattern | Example |
|---|---|
| Bare work title | `<h1>On the Holy Trinity</h1>` (single-page works) |
| Work + book number | `<h1>Against Eunomius (Book I)</h1>` (290101) |
| Letter number | `<h1>Letter 1</h1>` (291101) |
| Bare title | `<h1>On the Making of Man</h1>` (2914 — title is bare even though 30 chapters follow inside) |

**Chapter heading styles** — Gregory's chapters are more varied than Augustine's:

| Style | Example | Used in |
|---|---|---|
| `<h2>Chapter N</h2>` (simple numbered) | `<h2>Chapter 1</h2>` | 2907 *On Virginity* |
| `<h2>N. Description.</h2>` (number + title combined) | `<h2>1. Preface. — It is useless to attempt to benefit those who will not accept help.</h2>` | 290101 *Against Eunomius Bk I* — note the em-dash separator |
| `<h2>RomanNumeral. <em>Italicized description</em></h2>` | `<h2>I. <em>Wherein is a partial inquiry into the nature of the world...</em></h2>` | 2914 *On the Making of Man* |
| `<h2>Note</h2>`, `<h2>Introduction</h2>` | Untitled prologue/intro blocks | 2914 has both a `<h2>Note</h2>` summary and `<h2>Introduction</h2>` before chapter I |
| `<h2>First prefatory letter</h2>`, `<h2>Second prefatory letter</h2>` | Preambles before main body | 290101 *Against Eunomius Bk I* |
| No `<h2>` at all | Single flowing text | 2909 *Funeral Oration*, 2904 *On the Holy Trinity*, 2913 *On Pilgrimages*, 2915 *On the Soul* |

**Paragraph numbering:**

- Unlike Augustine NPNF First Series (which numbers paragraphs `1. ...`, `2. ...`), Gregory NPNF Second Series is **less consistent**.
- 2914 *On the Making of Man* uses `<p>1. ...</p>`, `<p>2. ...</p>` inside each chapter (Augustine-style).
- 2907 *On Virginity* uses unnumbered paragraphs.
- 290101 *Against Eunomius Bk I* uses unnumbered paragraphs.
- 2909 *Funeral Oration* uses unnumbered paragraphs.
- 2915 *On the Soul and the Resurrection* uses unnumbered paragraphs (it's a dialogue).
- **Parser implication:** the leading-numeral extraction logic from the Augustine parser will yield `None` for most Gregory paragraphs. That's fine — record `paragraph_number = null` and rely on document-order indexing.

### 6.3 Scripture references — `<span class="stiki">`

Same format as Augustine:

```html
<span class="stiki" id="note290063"><a href="../bible/1co002.htm#verse1">1&nbsp;Corinthians&nbsp;2:1-8</a></span>
```

**Density: 233 total occurrences across all 45 files** — far lower than Augustine. Distribution:

| File | `stiki` count |
|---|---|
| 290102 *Against Eunomius Bk II* | 35 |
| 2914 *On the Making of Man* | 35 |
| 2902 *Answer to Eunomius II* | 29 |
| 290101 *Against Eunomius Bk I* | 23 |
| 2907 *On Virginity* | 15 |
| 290103, 290104, 290105, 290106 *Against Eunomius* Bks III–VI | 9–10 each |
| Most other files | 1–7 each |
| 291109, 291113 (Letters) | 0–1 |

The lower density reflects the genre: Gregory's works are **theological treatises and dogmatic polemic**, not exegetical commentary. Scripture is cited illustratively, not expounded verse-by-verse.

### 6.4 Footnotes / editor notes — `<span class="fisk">`

Present but rare. Same format as Augustine — bracketed editor notes, often containing Greek transliterations or interpretive asides.

### 6.5 Other patterns (identical to Augustine corpus)

- `<q>...</q>` inline quotes
- `<blockquote><p>...</p></blockquote>` for indented quotations
- `<a href="../cathen/...">` Catholic Encyclopedia links (strip; keep inner text)
- `<a href="../bible/index.html">Scripture</a>` — generic "Scripture" link with no specific verse anchor; cosmetic, can be stripped or kept as plain text
- `<em>` for Latin terms and emphasis
- Ad divs interspersed mid-content (`catholicadnet-728x90`, `CMtag_300x250`, `CANBMDDisplayAD`)
- One observed Gregory quirk: in 291101 and 2909, an ad div (`<div class="CMtag_300x250">`) is *inside* the `<div class="pub">` citation block — the citation-footer parser should be robust to extra junk children inside `.pub`.

### 6.6 Citation footer — uniform across the corpus

```html
<div class="pub">
  <p id="src">
    <strong>Source.</strong>
    <span id="srctrans">Translated by William Moore and Henry Austin Wilson.</span>
    From <span id="srcwork">Nicene and Post-Nicene Fathers, Second Series</span>,
    <span id="srcvolume">Vol. 5.</span>
    <span id="srced">Edited by Philip Schaff and Henry Wace.</span>
    (<span id="srcpublisher">Buffalo, NY: Christian Literature Publishing Co.,</span>
    <span id="srcyear">1893.</span>)
    <span id="kk">Revised and edited for New Advent by Kevin Knight.</span>
    <span id="srcurl">…</span>
  </p>
</div>
```

**Every file in the Gregory of Nyssa corpus is NPNF Series II, Vol. 5, Schaff & Wace eds., 1893.** Single source.

Translator names observed:
- W. Moore (most works)
- H.A. Wilson (alternating with Moore on many)
- H.C. Ogle (Against Eunomius collaborator; primary translator for some Letters)
- William Moore and Henry Austin Wilson (Funeral Oration)

---

## 7. How clean is the HTML?

Same level of clean-ness as Augustine — **parseable with confidence, with the same caveats**:

Pros (same as Augustine):
- Consistent `#springfield2` wrapper
- Consistent `.pub` citation footer with `id="src*"` spans
- Scripture refs uniformly tagged with `class="stiki"`
- UTF-8 encoding consistent

Gregory-specific cleanliness notes:
- **More varied `<h2>` heading styles** — parser must accept several patterns (number+title, Roman+italics, plain "Chapter N", and absent).
- **Some content junk inside `.pub`** — observed `<div class="CMtag_300x250">` as a child of the citation footer. Decompose ads *before* parsing the citation block.
- **Some `<p>` paragraphs are extremely long** — Against Eunomius Bk I's chapter 1 has a single `<p>` running for thousands of words. This is just NPNF translation style. No parsing impact.
- **One Funeral Oration `<h1>` is followed immediately by `<p>` with no chapters** — Gregory's homilies have no internal structure other than paragraph breaks.

---

## 8. Extractable metadata

Same approach as Augustine corpus. All fields below are deterministically extractable:

| Field | Source | Example |
|---|---|---|
| Author | Folder name + `<title>` parenthetical | `Gregory of Nyssa` |
| Work ID | Filename first 4 chars + `<body id>` + `<link rel=canonical>` | `2901` |
| Work title | `<h1>` of index or self-contained file | `Against Eunomius` |
| Section ID | Filename chars 5+ | `01` (Book I), `18` (Letter 18) |
| Section title | `<h1>` of sub-page or self-contained file | `Against Eunomius (Book I)`, `Letter 1` |
| Chapter title | `<h2>` headings inside `#springfield2` | `Chapter 1`, `I. Wherein is...`, `1. Preface. — ...` |
| Source URL | `<link rel="canonical">` or provenance JSON | `https://www.newadvent.org/fathers/2901.htm` |
| New Advent source ID | Work ID (4-digit) | `2901` |
| Translator | `<span id="srctrans">` | `Translated by W. Moore, H.A. Wilson and H.C. Ogle.` |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, Second Series` |
| Volume | `<span id="srcvolume">` | `Vol. 5.` |
| Editor | `<span id="srced">` | `Edited by Philip Schaff and Henry Wace.` |
| Publisher | `<span id="srcpublisher">` | `Buffalo, NY: Christian Literature Publishing Co.,` |
| Year | `<span id="srcyear">` | `1893.` |
| Bible references | `<span class="stiki">` blocks | ~233 total across corpus |
| Work type | provenance JSON `work_type` | `treatise`, `homily`, `letter` |

---

## 9. Normalization to Theosis library records

Mirrors the Augustine schema in the companion doc §9. Specifics for Gregory:

### Person

```ts
Person {
  id:          "person.gregory-of-nyssa"
  display:     "Gregory of Nyssa"
  also_known:  ["Gregorius Nyssenus", "St. Gregory of Nyssa", "Gregory the Younger"]
  born:        c. 335
  died:        c. 395
  feast_day:   "01-10"           // Orthodox calendar — January 10
  tradition:   "Cappadocian Father; one of the Three Holy Hierarchs of Orthodoxy alongside Basil and Gregory Nazianzen (their joint feast is Jan 30)"
  see:         "Nyssa (Cappadocia)"
  relations:   { brother_of: "person.basil-the-great",
                 brother_of: "person.macrina-the-younger" }   // optional
}
```

**Orthodox significance:** Gregory is one of the **Cappadocian Fathers** and a major architect of Trinitarian theology (Nicene/Constantinopolitan settlement). His theology of *theosis* (deification) is foundational to Orthodox soteriology. He is the brother of St. Basil the Great and St. Macrina the Younger.

### Work

One row per `provenance_NNNN.json` — **15 Gregory of Nyssa works total.**

Same shape as Augustine — see companion doc §9. Note that `section_count` for most Gregory works will be either `1` (self-contained) or equal to internal `<h2>` count (e.g., 30 for *On the Making of Man*).

### WorkSection

Two granularity options, same as Augustine:

- **Option A (flat):** one row per HTML file. Yields ~45 rows for Gregory.
- **Option B (deep):** one row per `<h2>` chapter inside a file. Yields ~150 rows because the long self-contained works decompose into many chapters.

**Recommendation: Option B is more attractive for Gregory** than for Augustine, because Gregory's self-contained works (e.g., *On the Making of Man* with 30 chapters) would otherwise be one giant WorkSection that's hard to navigate. Aim for chapter-level WorkSection rows when chapters exist; whole-file WorkSection when they don't (Funeral Oration, etc.).

### SourceRecord

```ts
SourceRecord {
  id:              "src.newadvent.2901"
  work_id:         "work.gregory-nyssa.2901"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/2901.htm"
  translator:      "W. Moore, H.A. Wilson, H.C. Ogle"
  series:          "Nicene and Post-Nicene Fathers, Second Series"
  volume:          "Vol. 5"
  editor:          "Philip Schaff and Henry Wace"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1893
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/gregory-nyssa/2901.html"
  provenance_json: "content/raw/fathers/gregory-nyssa/provenance_2901.json"
}
```

Note: every Gregory SourceRecord shares NPNF Series II Vol. 5 / Schaff-Wace 1893 — could be normalized to a shared `BibliographicEdition` row referenced by all SourceRecords. Optimization, not required for v1.

---

## 10. Bible-linking strategy

Gregory of Nyssa is **fundamentally different from Augustine for Bible-linking purposes**:

- **No verse-commentary works** in this corpus (no Tractates-on-John equivalent).
- **No psalm-commentary** (Gregory's *On the Inscriptions of the Psalms* is NOT in NPNF).
- **No homily-on-pericope** series like Augustine's *Sermons on Selected Lessons*.

What's here is **theological treatise with inline citations**. Bible-linking is therefore a **single pass** — extracting `<span class="stiki">` references — without the head-verse layer that Augustine offered.

### 10.1 Direct verse commentary

**None in this corpus.** The closest thing is *On the Making of Man* (2914), which is structured as an extended meditation on Genesis 1:26–27 and the *Hexaemeron* — but it's not verse-by-verse. Could be tagged thematically as `commentary_on: "Genesis 1:26-27, Genesis 2:7"` at the work level.

### 10.2 Inline scripture refs

All 233 `<span class="stiki">` blocks should be extracted and stored as `BibleRef` rows. Same parsing logic as Augustine:

```ts
BibleRef {
  id:               "bref.gregory-nyssa.2914.0001"
  work_section_id:  "section.gregory-nyssa.2914.00"   // or chapter-level if Option B
  bible_book:       "GEN"
  chapter:          1
  verse_start:      26
  verse_end:        26
  display_text:     "Genesis 1:26"
  position_in_text: 12345
  citation_type:    "direct"
  raw_anchor_url:   "../bible/gen001.htm#verse26"
}
```

### 10.3 Thematic Bible-linking — Gregory's most useful contribution

Where Gregory shines is **theological-thematic linking**. The integration should add an editorial layer that maps Gregory's works to the Bible passages they unpack at the *concept* level:

| Work | Linked passages (thematic) |
|---|---|
| **2914 On the Making of Man** | Genesis 1:26–27 ("in our image"), Genesis 2:7, 1 Cor 15:35–54, 2 Cor 4:16 |
| **2915 On the Soul and the Resurrection** | 1 Thess 4:13–18, 1 Cor 15, John 11, 2 Cor 5 |
| **2907 On Virginity** | Matt 19:12, 1 Cor 7, Rev 14:4, Eph 5:25–32 |
| **2908 The Great Catechism** | John 1:1–14 (Incarnation), Phil 2:5–11 (kenosis), Rom 5–6 (sacramental theology), Matt 28:19 (Trinitarian baptism) |
| **2901 Against Eunomius** | John 1:1–14, Phil 2:5–11, Heb 1, Col 1:15–20 (Christology) |
| **2904 On the Holy Trinity** | Col 2:9, Rom 1:20, Matt 28:19 (Trinitarian formula) |
| **2905 On "Not Three Gods"** | Deut 6:4 (Shema), John 17 (unity of Father and Son), 1 Cor 8:4–6 |
| **2903 On the Holy Spirit** | John 14–16 (Paraclete discourses), Acts 2, 1 Cor 12 |
| **2910 On the Baptism of Christ** | Matt 3:13–17, Mark 1:9–11, Luke 3:21–22 (Theophany pericopes) |
| **2912 On Infants' Early Deaths** | Matt 18:1–10, Wisdom 4:7–17 |

This thematic layer is **editorial / hand-curated** but small enough (15 works × ~3–5 passages = ~50 thematic links) to be done by a single person in an afternoon.

### 10.4 Lectionary linking — Orthodox calendar

This is where Gregory becomes uniquely valuable for the Theosis daily-reading flow:

- **2910 On the Baptism of Christ** is a sermon for **Theophany (January 6)** — Orthodox feast day. Tag it for that calendar date.
- **2909 Funeral Oration on Meletius** — historical, less calendar-useful.
- **2914 On the Making of Man** — meditative reading for **Genesis Lenten cycle** (Orthodox Great Lent reads Genesis on weekdays).
- **2907 On Virginity** — pairs with feasts of virgin saints, Annunciation (March 25).
- **2915 On the Soul and the Resurrection** — reading for Pascha (Easter) season, the period from Pascha to Pentecost.
- **Gregory's feast day** (Jan 10): surface the whole corpus as "today's featured Father."

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Inline `stiki` extraction** (single mechanical pass). Produces ~233 `BibleRef` rows.
2. **Pass 2 — Thematic / work-level mapping** (editorial, ~50 manual entries). Drives the "Gregory commentary on this passage" feature.
3. **Pass 3 — Calendar mapping** (editorial, ~5–10 entries). Drives the "Today's reading from Gregory" feature on feast days.

---

## 11. Which Gregory of Nyssa works are most useful for the Theosis library

Ranked by Orthodox-tradition importance and reader-engagement potential:

| Rank | Work | Why it's valuable |
|---|---|---|
| 1 | **2915 On the Soul and the Resurrection** | Foundational Orthodox eschatology; the dialogue form is reader-friendly; pairs with Pascha. |
| 2 | **2914 On the Making of Man** | Anthropology / theology of personhood; explains the Orthodox understanding of *imago Dei*. Complements Basil's *Hexaemeron*. |
| 3 | **2908 The Great Catechism (*Catechetical Oration*)** | Systematic Christian doctrine; one of the most important catechetical texts of the patristic era. |
| 4 | **2907 On Virginity** | Ascetic theology; vital for monastic readers and a window into Orthodox spirituality of celibacy / virginity-as-deification. |
| 5 | **2901 Against Eunomius** | Trinitarian theology; the long-form defense of Nicene faith against Anomoean Arianism. Dense but theologically formative. |
| 6 | **2905 On "Not Three Gods"** | Short, accessible Trinitarian classic; ideal for "Father quote of the day"-style surfacing. |
| 7 | **2910 On the Baptism of Christ** | Liturgical sermon for Theophany — high seasonal relevance. |
| 8 | **2903 On the Holy Spirit** | Pneumatology against Macedonians. Companion to Basil's *On the Holy Spirit*. |
| 9 | **2904 On the Holy Trinity (To Eustathius)** | Short Trinitarian letter; pairs with 2905. |
| 10 | **2906 On the Faith (To Simplicius)** | Short doctrinal letter. |

---

## 12. Which Gregory works are mostly general library texts

These belong in the library but are less central / less reader-accessible:

- **2902 Answer to Eunomius' Second Book** — 408 KB of dense polemic, mainly for scholars.
- **2909 Funeral Oration on Meletius** — Beautiful rhetoric but specific to its 4th-century moment; biographical/historical value.
- **2911 Letters** — 18 pastoral/festal letters; episodic, scattered topical relevance. Mostly biographical-historical reading.
- **2912 On Infants' Early Deaths** — Important but narrow topic (theodicy).
- **2913 On Pilgrimages** — Short pastoral letter discouraging Holy-Land pilgrimage as a piety requirement; interesting historical artifact.

---

## 13. Recommended parser strategy

The Augustine parser plan (companion doc §13) covers ~95% of Gregory's parsing needs. Adjustments for Gregory:

### 13.1 Module sharing

A single `scripts/parse_newadvent/` module should handle both Augustine and Gregory (and future Fathers). The corpus differences are data, not code. Suggested folder:

```
scripts/parse_newadvent/
├── __init__.py
├── manifest.py           # generic provenance-driven iteration
├── extract.py            # generic BeautifulSoup extractor (works for both corpora)
├── normalize.py          # generic Person/Work/WorkSection/SourceRecord builder
├── bible_refs.py         # generic stiki extractor + OSIS book-code mapper
├── book_codes.py         # shared
├── chapter_heading.py    # generic — handle the four chapter-heading styles (§6.2)
├── write_records.py      # emit JSONL or DB upsert
└── tests/
    ├── fixtures/
    │   ├── augustine/    # snapshots
    │   └── gregory-nyssa/
    └── test_*.py
```

### 13.2 Chapter-heading parser must handle four styles

```python
import re

CHAPTER_PATTERNS = [
    # "Chapter 1" or "Chapter VI"
    re.compile(r"^Chapter\s+([IVXLCDM]+|\d+)\.?\s*(.*)", re.I),
    # "1. Title." — number-period-title (Gregory's Against Eunomius style)
    re.compile(r"^(\d+)\.\s*(.+?)\.?\s*$"),
    # "I. <em>Description</em>" — Roman + italic (On the Making of Man style)
    re.compile(r"^([IVXLCDM]+)\.\s*(.*)"),
    # Section labels with no numbering ("Preface", "Introduction", "Note", "First prefatory letter")
    None,  # fallback: store text as-is, set chapter_number=None
]

def parse_chapter_heading(text: str):
    for pat in CHAPTER_PATTERNS:
        if pat is None: continue
        m = pat.match(text.strip())
        if m:
            num_raw, title = m.groups()
            return ChapterHeading(number=normalize_number(num_raw),
                                  title=title.strip().rstrip("."))
    return ChapterHeading(number=None, title=text.strip())
```

### 13.3 Paragraph numbering — make it optional

Gregory's paragraphs are unnumbered most of the time. Don't fail on missing leading numeral; just record `paragraph_number = null`.

### 13.4 Citation footer parser must be robust to ad junk

Observed in 291101 and 2909 — a `<div class="CMtag_300x250">` ad div nested inside `<div class="pub">`. Decompose all ad selectors before extracting citation spans.

### 13.5 Single-page-work handling

For multi-chapter self-contained works (e.g., 2914 with 30 `<h2>` chapters), the parser should:

1. Treat the whole file as one "section" at the WorkSection level **if using Option A**.
2. Or split on `<h2>` to produce N WorkSectionChapter / N WorkSection rows **if using Option B**.

Either way, the extracted chapters list should preserve document order via an `order_index` field.

### 13.6 Iteration order

```python
for prov in sorted(gregory_dir.glob("provenance_*.json")):
    data = json.loads(prov.read_text("utf-8"))
    work = build_work(data)
    if data["subpages"]:
        for order, sub_id in enumerate(data["subpages"], start=1):
            yield extract(gregory_dir / f"{sub_id}.html", work, order)
    else:
        # Self-contained — the NNNN.html IS the content
        yield extract(gregory_dir / f"{data['work_id']}.html", work, 1)
```

Note the branch: Gregory needs the `else` branch for self-contained works; Augustine almost never hits it.

---

## 14. Risks, edge cases, cleanup issues

Same risk register as Augustine — re-read companion doc §14. Gregory-specific additions:

### 14.1 NPNF Series **Second** vs First

Gregory is **NPNF Series II, Vol. 5**, not Series I. Make sure the SourceRecord schema records "Second Series" — otherwise citations will be ambiguous (NPNF Series I Vol. 5 is Augustine's anti-Pelagian works, an entirely different volume).

### 14.2 Multi-translator entry for some works

Several Gregory works credit two or three translators jointly (e.g., "W. Moore, H.A. Wilson and H.C. Ogle" on *Against Eunomius*). The `translator` field should accept a comma-or-and-separated string OR an array of names.

### 14.3 Self-contained works with many internal chapters

Works like 2914 *On the Making of Man* (30 chapters in one file) and 2907 *On Virginity* (24 chapters in one file) need chapter-level segmentation to be useful. If the parser only stores them as single WorkSection rows, the reader UI can't deep-link to "On the Making of Man, Chapter 16" — which is the standard scholarly citation form.

### 14.4 Funeral Oration / single-paragraph works

2909 *Funeral Oration* and 2904 *On the Holy Trinity* are essentially single flowing texts with no internal structure. Parsing them as a single WorkSection with no chapters is fine. The reader UI should handle "no chapter outline" gracefully.

### 14.5 The 2903 stub problem

*On the Holy Spirit (Against the Followers of Macedonius)* — file is only ~1 KB. May be a New Advent stub / extract rather than the full work. Worth manually verifying after parsing whether the body is meaningful or just a placeholder. If it's a stub, the integration should mark this work `coverage: "fragment"` and source the full text elsewhere later.

### 14.6 Missing major works

As noted in §3, the New Advent corpus does NOT include:
- *The Life of Moses* (mystical-ascetic masterwork)
- *Commentary on the Song of Songs*
- *On the Beatitudes* (8 homilies)
- *On the Lord's Prayer* (5 homilies)
- *On the Inscriptions of the Psalms*

**These are arguably Gregory's most important works for Orthodox spirituality.** A Phase-2 acquisition is recommended:
- Source: St. Vladimir's Seminary Press editions (recent translations, not public domain)
- OR Migne PG 44–46 (public domain Greek+Latin, no English)
- OR Hans Boersma's translations (CWS / Crestwood)
- The plan should flag this gap explicitly to the reader: "*Gregory's Scripture exegesis (Beatitudes, Lord's Prayer, Song of Songs, Life of Moses) is not yet available in the Theosis library.*"

### 14.7 Greek / Latin terms inline

Gregory's NPNF translation occasionally transliterates Greek terms inline (e.g., `<em>cor nostrum inquietum...</em>` Latin phrase, or `<em>quarumdam escarum cerimoniæ</em>`). Use `&aelig;`, `&euml;`, `&oelig;` ligatures. BeautifulSoup decodes these correctly; just ensure the normalized text preserves them.

### 14.8 Dialogue formatting (2915)

*On the Soul and the Resurrection* is a dialogue. The text alternates between Gregory's voice and his sister Macrina ("the Teacher"). Speaker attribution is inline (e.g., "Why, what is the special pain you feel, asked the Teacher"). The parser need not extract speakers as structured data, but a future enhancement could render dialogue with speaker styling (similar to how Plato dialogues are typeset).

### 14.9 LXX vs MT versification

Gregory cites the Septuagint (he was a Greek Father). His Psalm citations follow LXX numbering. **Same LXX-vs-MT versification landmine as Augustine** (see companion doc §14.1). Since Gregory cites psalms less frequently than Augustine, the impact is smaller — but still must be confirmed with the Theosis Psalter scheme before parsing.

### 14.10 Catholic-vs-Orthodox attribution

Gregory of Nyssa is venerated as a Saint in both East and West. **He is one of the Three Holy Hierarchs of Orthodoxy** (with Basil and Gregory Nazianzen, joint feast January 30). His Orthodox standing is significantly higher than Augustine's in the Eastern tradition. The library can present Gregory without disclaimer flags (unlike Augustine where predestination teaching is contested in the East).

### 14.11 Volume / compute scale

45 files × ~67 KB avg = trivial parse time. Storage of normalized output well under 10 MB. Insignificant compared to Augustine corpus.

---

## 15. Recommended next step for a separate integration chat

> **"Build the Cappadocian + Augustine ingestion pipeline."**
>
> 1. Read both planning docs:
>    - `docs/augustine-raw-content-integration-plan.md`
>    - `docs/gregory-of-nyssa-raw-content-integration-plan.md`
> 2. Read the Theosis library schema (Person, Work, WorkSection, SourceRecord, BibleRef) — confirm shape and amend §9 of both docs as needed.
> 3. Read `scripts/process_fetch.py` and `scripts/newadvent_downloader.py` for pipeline conventions.
> 4. Confirm Psalter versification (LXX vs MT) with the user.
> 5. Build `scripts/parse_newadvent/` as a shared module (not author-specific). Test on **two end-to-end cases**:
>    - Augustine **1101** (Confessions) — exercises the index + sub-pages pattern + numbered paragraphs + chapter `<h2>`s.
>    - Gregory **2914** (On the Making of Man) — exercises the self-contained-with-many-internal-chapters pattern + Roman-numeral chapters + italicized chapter descriptions.
> 6. If both pass, expand to all 48 Augustine + 15 Gregory works = **63 works, 873 HTML files**.
> 7. Bible-linking passes:
>    - Mechanical `stiki` extraction across both corpora.
>    - Augustine head-verse linking for 1601/1602/1701/1702/1801 (see Augustine doc §10).
>    - Gregory thematic linking (~50 hand-curated entries — see Gregory doc §10.3).
> 8. Calendar tags for Theophany sermon (2910), Pascha-season reading (2915), etc.
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files in either author folder
> - Phase-2 acquisition of Gregory's missing works (Life of Moses, Beatitudes, Song of Songs commentary) — separate sourcing task
> - The Basil and Gregory Nazianzen corpora (sibling Cappadocians, already partially downloaded in adjacent folders)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/gregory-nyssa/`
- Files: 45 `.html` + 15 `provenance_*.json` (+ legacy `.md` files to ignore)
- Total raw HTML: ~2.96 MB
- Works: 15 (entire New Advent Gregory of Nyssa corpus = NPNF Series II Vol. 5)
- Largest single file: `2902.html` ~408 KB (Answer to Eunomius II)
- Smallest content file: `2903.html` ~1 KB (may be a stub — verify)
- Multi-sub-page works: 2 (Against Eunomius with 12 books; Letters with 18 letters)
- Self-contained works: 13

## Appendix B — Acquisition log

Full per-work download summary:
`content/raw/_index/acquisition_log_phase1_20260520T182141.json`
(15 works OK, 0 errors, 45 files downloaded on 2026-05-20.)

## Appendix C — Sample files inspected for this plan

- `2901.html` (Against Eunomius index) — pure TOC, 12-book line-broken anchors
- `290101.html` (Against Eunomius Book I, 380 KB) — large sub-page with prefatory letters + numbered-title chapters
- `2902.html` (Answer to Eunomius II, 408 KB) — single-file self-contained work
- `2904.html` (On the Holy Trinity) — short letter-treatise, no chapter headings
- `2907.html` (On Virginity) — single-file with `<h2>Chapter 1</h2>`-style headings
- `2909.html` (Funeral Oration on Meletius) — single oration, no internal structure, ad div inside `.pub`
- `2914.html` (On the Making of Man) — single-file 30-chapter work with Roman-numeral + italic chapter headings; opens with summary `<h2>Note</h2>` + `<h2>Introduction</h2>`
- `2915.html` (On the Soul and the Resurrection) — dialogue form, no chapters
- `291101.html` (Letter 1) — short letter sub-page
- `provenance_2901.json`, `provenance_1701.json` (Augustine for comparison) — schema is identical
