# Basil the Great Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Basil the Great HTML corpus downloaded from New Advent. No parser or app code has been written yet. This doc is intended as a complete brief for a separate integration chat that will build the actual ingestion pipeline.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** NPNF (Nicene and Post-Nicene Fathers), **Second Series**, Vol. 8 — Schaff & Wace eds., 1895. Public domain. **Single translator** for the entire Vol. 8: **Blomfield Jackson**. New Advent transcriptions © New Advent LLC.

> **Companion docs:**
> - [`docs/augustine-raw-content-integration-plan.md`](augustine-raw-content-integration-plan.md)
> - [`docs/gregory-of-nyssa-raw-content-integration-plan.md`](gregory-of-nyssa-raw-content-integration-plan.md)
> - [`docs/athanasius-raw-content-integration-plan.md`](athanasius-raw-content-integration-plan.md)
>
> Most HTML patterns are identical across all four corpora. This doc highlights Basil-specific structural notes — the **single-translator monoculture**, the **massive Letters collection** (325 sub-pages), the **Hexaemeron Genesis-commentary structure** (with 9 strong head-verse linking opportunities), and Basil's central Orthodox-tradition role.

---

## 1. Where the Basil files are located

All raw files live in a single directory:

```
content/raw/fathers/basil/
```

Same per-author convention used for Augustine, Gregory of Nyssa, and Athanasius. Sibling Cappadocian fathers live in `content/raw/fathers/gregory-nyssa/` and `content/raw/fathers/gregory-nazianzen/`.

---

## 2. What files were downloaded

**Counts (in `content/raw/fathers/basil/`):**

| Item | Count |
|---|---|
| `*.html` raw files (work indexes + sub-pages) | **337** |
| `provenance_<work_id>.json` files | **3** |
| Legacy `*.md` files (from an earlier processing pipeline, not part of this download) | ~340 |
| **Total raw HTML size** | **~4.14 MB** |

**File-naming convention:**

| Pattern | Meaning | Example |
|---|---|---|
| `NNNN.html` (4-digit) | Work index page OR self-contained work | `3201.html` = Hexaemeron index; `3203.html` = entire *De Spiritu Sancto* |
| `NNNNN.html` (5-digit) | Sub-page of a small multi-section work (1-digit suffix) | `32011.html`–`32019.html` = Hexaemeron Homilies 1–9 |
| `NNNNNNN.html` (7-digit) | Sub-page of a large multi-section work (3-digit zero-padded suffix) | `3202001.html` = Letter 1; `3202366.html` = Letter 366 |
| `provenance_NNNN.json` | Provenance sidecar | `provenance_3201.json` |

> **Regex-fix note:** Hexaemeron uses 1-digit sub-page suffixes (32011–32019) — the same New Advent convention found in Augustine's 1408/1601/etc. and Athanasius's 2808/2815/2816. The downloader regex was widened to `\d{1,3}` on 2026-05-20 (during the Athanasius acquisition) and the Hexaemeron sub-pages downloaded correctly on first attempt for Basil. No re-acquisition needed for this corpus.

**Provenance JSON schema** is identical to the other corpora. Drive iteration from these JSONs, not from filename globbing.

Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T190411.json` — 3 works OK, 0 errors, 337 files.

---

## 3. Major works represented

**All 3 works on New Advent are present.** Basil's New Advent corpus is small in *unique works* but vast in *sub-pages* because of the Letters collection.

| ID | Title | Type | Sub-pages | Size | Notes |
|---|---|---|---|---|---|
| **3201** | Nine Homilies of the Hexaemeron | homily | **9** (Homilies 1–9 on Genesis 1) | 7 KB index + 19–48 KB per homily | **THE foundational patristic creation commentary** — verse-by-verse exposition of Genesis 1:1–26 |
| **3202** | Letters | letter | **325** (numbered 1–366 with gaps) | 24 KB index + 7–50 KB per letter | Vast pastoral, doctrinal, and personal correspondence; includes the canonical letters to Amphilochius |
| **3203** | De Spiritu Sancto (On the Holy Spirit) | treatise | 0 (single 289 KB page, 30 chapters internal) | 289 KB | **The foundational Orthodox pneumatology**; written to Amphilochius of Iconium |

**Total works:** 3 (smallest of the four corpora by unique-work count). **Source volume:** NPNF Series II, Vol. 8 (Blomfield Jackson, 1895).

### Notable absences from this corpus

NPNF Vol. 8 is a relatively limited Basil selection. Many of Basil's most influential writings are **NOT** on New Advent:

- **The Long Rules** (*Asketikon* / *Regulae Fusius Tractatae*) — foundational text of Eastern monasticism, organizing monastic community life. ESSENTIAL for an Orthodox monastic library.
- **The Short Rules** (*Regulae Brevius Tractatae*) — companion to the Long Rules.
- **Moralia** (*Ethika*, the "Morals") — 80 "rules" of Christian conduct compiled from Scripture; very influential pre-monastic catechetical text.
- **Homilies on the Psalms** — exegetical homilies on selected psalms. Critical Orthodox commentary.
- **Address to Young Men on the Right Use of Greek Literature** — Basil's classic on Christian-classical education.
- **Various other homilies** — *On Humility*, *On Envy*, *On Anger*, *On Giving Thanks*, *To the Rich*, *In Time of Famine and Drought*, and others. These constitute a major Orthodox preaching corpus.
- **Liturgy of St. Basil** — used 10 times per Orthodox year. Different from the New Advent corpus (it's a liturgical text, not a treatise). Available from Orthodox liturgical sources.
- **Possibly missing letters** — full critical edition has ~366 letters; we have 325. The gap likely reflects letter numbers that are non-extant or excluded from NPNF rather than letters NPNF omits intentionally.

**Implication:** Basil's New Advent corpus is **dogmatically and exegetically rich** (Hexaemeron + De Spiritu Sancto = the two most theologically formative Basil works) but **ascetically incomplete**. A Phase-2 acquisition for the Rules, Moralia, and homilies should be planned from:
- St. Vladimir's Seminary Press editions (Anna Silvas's translations of the Asketikon)
- *Saint Basil: Ascetical Works* (Fathers of the Church series, Catholic University of America Press)
- Migne PG 29–32 (Greek+Latin, public domain)
- Ancient Christian Writers series

---

## 4. How the files are structured internally

Identical shell to the Augustine/Gregory/Athanasius corpora:

- `<head>` with title, canonical link, `screen6.css`
- Shared header (logo, search, A–Z encyclopedia bar) — junk
- `<div id="mi5">` breadcrumbs
- **`<div id="springfield2">`** main content wrapper (present in **all 337 files**)
- `<h1>` title, Gumroad banner
- Main body
- **`<div class="pub">`** citation footer with `id="src*"` spans (present in **all 337 files**)
- Footer + Cloudflare beacon

The two invariants — `#springfield2` and `id="srctrans"` — hold across the entire corpus.

---

## 5. One file per work? Per section? **Mixed: two index-with-sub-pages works, one self-contained.**

Basil sits structurally between Augustine (mostly multi-sub-page) and Gregory of Nyssa (mostly self-contained):

### Multi-sub-page works (2 of 3)

| Work | Sub-pages | Suffix style |
|---|---|---|
| **3201 Hexaemeron** | 9 | **1-digit** (`32011`–`32019`) — same convention as Augustine's 1408/1601 |
| **3202 Letters** | 325 | 3-digit zero-padded (`3202001`–`3202366` with gaps) |

### Self-contained single-file work (1 of 3)

| Work | File size | Internal structure |
|---|---|---|
| **3203 De Spiritu Sancto** | 289 KB | **30 chapters** as `<h2>Chapter N</h2>` headings. Significantly larger than any other single self-contained file in the four-Father corpus. |

**Parser heuristic:** same as the other corpora. For Basil specifically:
- 3201: parse TOC, fetch 9 sub-pages.
- 3202: parse TOC, fetch 325 sub-pages.
- 3203: treat the index file as the full content; chunk on `<h2>Chapter N</h2>` to produce 30 WorkSectionChapter records.

---

## 6. HTML patterns inside content pages

Patterns are mostly identical to the other corpora. Basil-specific notes below.

### 6.1 Index/TOC pages

**3201 Hexaemeron index** — bare TOC, no descriptive blurbs:

```html
<p>
  <a href="../fathers/32011.htm">Homily I</a>
  <br><a href="../fathers/32012.htm">Homily II</a>
  ...
  <br><a href="../fathers/32019.htm">Homily IX</a>
</p>
```

**3202 Letters index** — long line-broken anchor list of 325 letters, sometimes grouped under `<h2>` sub-headings by chronological period. Same TOC convention as Augustine's Letters (1102).

### 6.2 Content sub-pages and self-contained works

**Section titles** — `<h1>` patterns observed:

| Pattern | Example |
|---|---|
| Bare work title | `<h1>De Spiritu Sancto</h1>` (self-contained) |
| Work + section | `<h1>Hexaemeron (Homily 1)</h1>` (32011) |
| Letter + number | `<h1>Letter N</h1>` (typical) |

**Chapter / section heading styles** — fewer variants than other corpora:

| Style | Example | Used in |
|---|---|---|
| `<h2>Chapter N</h2>` followed by `<p><strong>{topic description}</strong></p>` | `<h2>Chapter 1</h2>` then `<p><strong>Prefatory remarks on the need of exact investigation...</strong></p>` | 3203 *De Spiritu Sancto* — 30 chapters |
| No `<h2>` chapter headings, just `<h1>` + epigraph + numbered paragraphs | `<h1>Hexaemeron (Homily 1)</h1>` then `<p><strong>In the Beginning God made the Heaven and the Earth.</strong></p>` then numbered paragraphs | 3201xxx Hexaemeron homilies |
| Plain `<h1>` + body, no internal structure | Most Letters | 3202xxx sub-pages |

**Note on Hexaemeron structure:** the homilies do NOT use `<h2>` for sub-sections. The opening `<strong>{biblical text}</strong>` line is the **homily's text/pericope** (e.g., Homily 1 = "In the beginning God made the heaven and the earth"). The integration parser should treat this `<p><strong>...</strong></p>` immediately after `<h1>` as the **homily epigraph** — and this epigraph is the **head Bible verse** for that homily. Strong head-verse linking signal.

### 6.3 Paragraph numbering

Basil's NPNF translation (Blomfield Jackson, 1895) uses **leading-Arabic-numeral paragraph numbering** consistently — same style as Augustine NPNF First Series. Examples:

```html
<p>1. It is right that any one beginning to narrate the formation of the world should begin...</p>
<p>2. <q>In the beginning God created the heaven and the earth.</q> ... I stop struck with admiration...</p>
<p>3. Do not then imagine, O man! that the visible world is without a beginning...</p>
```

- **3201 Hexaemeron** (all 9 homilies): paragraphs numbered `1.` through ~11 per homily.
- **3203 De Spiritu Sancto**: numbered paragraphs INSIDE chapters (chapter 1 has paragraphs 1–3; chapter 2 has 4; chapter 3 has 5; etc.). Citation form: "*Spir.* 9.22" = Chapter 9, paragraph 22.
- **3202 Letters**: numbered paragraphs in longer letters; shorter letters often unnumbered.

This is the **most parser-friendly numbering convention of any of the four corpora** — unambiguous one-number-per-paragraph in essentially every file.

### 6.4 Scripture references — `<span class="stiki">`

Same format as other corpora:

```html
<span class="stiki" id="note321368"><a href="../bible/1co002.htm#verse4">1&nbsp;Corinthians&nbsp;2:4</a></span>
```

**Density observed (sample):**

| File | `stiki` count | Notes |
|---|---|---|
| 3203 *De Spiritu Sancto* | **80** | Very dense — Trinitarian/pneumatological proof-texts |
| 32012 *Hexaemeron Homily 2* | 8 | Genesis commentary |
| 32011 *Homily 1* | 7 | Gen 1:1 head verse + supporting refs |
| 32013 *Homily 3* | 6 | |
| 32014–32019 | 4–8 each | |
| 3202xxx Letters | varies widely (some letters have 0 stiki refs; others 5–15) | Doctrinal letters higher-density |

**Estimated corpus-wide total:** ~1500–2000 Bible references across all 337 files (rough projection — Letters dominate volume but vary). Less dense per-file than Augustine's exegetical works, but the **head-verse linking opportunity in Hexaemeron is exceptional** (see §10.1).

### 6.5 Citation footer

Identical layout to other corpora. **Every Basil file is NPNF Series II Vol. 8, Schaff & Wace eds., 1895, translated by Blomfield Jackson.** Single translator monoculture — simpler bibliographic modeling than Augustine (multi-translator) or Athanasius (Newman + Robertson + Atkinson).

---

## 7. How clean is the HTML?

Same level as the other three corpora. **No new edge cases discovered in Basil.**

- Consistent `#springfield2` wrapper
- Consistent `.pub` citation footer
- Predictable scripture-ref tagging
- Consistent paragraph numbering (the cleanest of the four)
- No new CSS classes or markup variants beyond what's already documented for Augustine/Gregory/Athanasius

The **bibliographic consistency is the cleanest** — all 337 files share identical Source attribution (Vol. 8 / Schaff-Wace / 1895 / Jackson). The SourceRecord for the entire corpus could be a single shared row.

---

## 8. Extractable metadata

| Field | Source | Basil example |
|---|---|---|
| Author | Folder + `<title>` parenthetical | `Basil the Great` (or `Basil of Caesarea`) |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `3201` |
| Work title | `<h1>` of index or self-contained file | `Hexaemeron`, `De Spiritu Sancto` |
| Section ID | Filename suffix | `1`–`9` (Hexaemeron homily); `001`–`366` (Letters); chapters inside 3203 |
| Section title | `<h1>` of sub-page | `Hexaemeron (Homily 1)`, `Letter 1` |
| **Homily epigraph (head verse)** | `<p><strong>{text}</strong></p>` immediately after `<h1>` | `In the Beginning God made the Heaven and the Earth.` (Hexaemeron Homily 1) |
| Chapter title | `<h2>Chapter N</h2>` (3203 only) | `Chapter 1` |
| Chapter description | `<p><strong>...</strong></p>` after `<h2>` (3203 only) | `Prefatory remarks on the need of exact investigation...` |
| Paragraph number | Leading Arabic numeral in `<p>` body | `1`, `2`, `127` |
| Source URL | `<link rel="canonical">` or provenance JSON | `https://www.newadvent.org/fathers/3201.htm` |
| Translator | `<span id="srctrans">` | `Translated by Blomfield Jackson.` (uniform across corpus) |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, Second Series` |
| Volume | `<span id="srcvolume">` | `Vol. 8.` |
| Editor | `<span id="srced">` | `Edited by Philip Schaff and Henry Wace.` |
| Year | `<span id="srcyear">` | `1895.` |
| Bible references | `<span class="stiki">` blocks | ~1500–2000 total estimated |
| Work type | provenance JSON `work_type` | `homily`, `letter`, `treatise` |

---

## 9. Normalization to Theosis library records

Mirrors the schemas in the companion docs. Basil specifics:

### Person

```ts
Person {
  id:          "person.basil-the-great"
  display:     "Basil the Great"
  also_known:  ["Basil of Caesarea", "Basilius Magnus", "St. Basil", "Father of Eastern Monasticism"]
  born:        c. 330
  died:        379
  feast_day:   "01-01"      // Orthodox calendar: January 1 (his death)
  feast_alt:   "01-30"      // Three Holy Hierarchs joint feast with Gregory Nazianzen and John Chrysostom
  tradition:   "Bishop of Caesarea; first of the Three Cappadocian Fathers; brother of Gregory of Nyssa and Macrina the Younger; godfather of Eastern monasticism"
  see:         "Caesarea (Cappadocia)"
  relations:   {
    brother_of: ["person.gregory-of-nyssa", "person.macrina-the-younger"],
    friend_of:  "person.gregory-of-nazianzen"
  }
  ecumenical_role: "Defender of Nicene orthodoxy against Arians; architect of the Cappadocian doctrine of the Holy Spirit; author of the Anaphora (Eucharistic prayer) of the Liturgy of St. Basil"
}
```

**Orthodox significance:**
- One of the **Three Holy Hierarchs** (with Gregory Nazianzen and John Chrysostom; joint feast January 30)
- One of the **Four Great Doctors of the Eastern Church** (with Athanasius, Gregory Nazianzen, John Chrysostom)
- **Father of Eastern monasticism** — his Long Rules form the foundation of monastic community life in the East (analogous to Benedict's role in the West)
- **Liturgy of St. Basil** — celebrated 10 times per Orthodox year (Sundays of Great Lent except Palm Sunday; Holy Thursday; Holy Saturday; Christmas Eve; Theophany Eve; his feast day on January 1)
- Author of **De Spiritu Sancto**, the foundational Orthodox pneumatology — established that the Holy Spirit shares the doxological honor of the Father and Son

### Work

3 rows total — the simplest Work table of any of the four corpora.

```ts
Work {
  id:               "work.basil.3201"
  author_id:        "person.basil-the-great"
  title:            "Nine Homilies of the Hexaemeron"
  alt_titles:       ["Hexaemeron", "Homilies on the Six Days of Creation"]
  work_type:        "homily"
  composition_date: "c. 370"
  language_original:"Greek"
  has_subsections:  true
  section_count:    9
  source_id:        "src.newadvent.3201"
  description:      "Nine Lenten homilies preached at Caesarea expounding Genesis 1:1–26"
}
```

### WorkSection

For Basil, **chapter-level granularity matters more than usual** for *De Spiritu Sancto* (30 chapters with classic citation forms like "*Spir.* 9.22"). Recommended approach:

- **3201 Hexaemeron**: one WorkSection per homily (9 rows). Each WorkSection has `head_verse` populated from the `<p><strong>...</strong></p>` epigraph after `<h1>`.
- **3202 Letters**: one WorkSection per letter (325 rows).
- **3203 De Spiritu Sancto**: this is the only one where Option B (chapter-level) is essential. One WorkSection per `<h2>Chapter N</h2>` inside 3203.html → **30 WorkSection rows** (or one WorkSection with 30 nested WorkSectionChapter rows).

```ts
WorkSection {
  id:              "section.basil.3201.01"
  work_id:         "work.basil.3201"
  order_index:     1
  section_type:    "homily"
  short_label:     "Homily 1"
  display_title:   "Hexaemeron (Homily 1)"
  head_verse:      "Genesis 1:1"               // ← unique to Basil among the four corpora
  head_verse_text: "In the beginning God made the heaven and the earth."
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.3201"
  bible_refs:      BibleRef[]
}
```

### SourceRecord

```ts
SourceRecord {
  id:              "src.newadvent.3201"
  work_id:         "work.basil.3201"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/3201.htm"
  translator:      "Blomfield Jackson"
  series:          "Nicene and Post-Nicene Fathers, Second Series"
  volume:          "Vol. 8"
  editor:          "Philip Schaff and Henry Wace"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1895
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/basil/3201.html"
  provenance_json: "content/raw/fathers/basil/provenance_3201.json"
}
```

**Optimization opportunity:** because all 3 Basil works share identical bibliographic data (Vol. 8 / Jackson / 1895 / Schaff-Wace), they can share one `BibliographicEdition` row referenced by 3 SourceRecord rows.

---

## 10. Bible-linking strategy

Basil's New Advent corpus has the **strongest single-work head-verse linking opportunity** of any of the four corpora — the **Hexaemeron** is a precise verse-by-verse commentary on Genesis 1:1–26 that fills the same role for Genesis that Augustine's *Tractates on John* fills for John's Gospel.

### 10.1 Direct verse commentary — **the Hexaemeron is a goldmine**

The 9 Hexaemeron homilies each have a clear head-verse anchor encoded in the opening `<p><strong>...</strong></p>` epigraph:

| Homily | Head verse(s) | Topic |
|---|---|---|
| **Homily 1** (32011) | **Genesis 1:1** | "In the beginning God made the heaven and the earth" — creation ex nihilo, Trinity, refutation of pre-existent matter |
| **Homily 2** (32012) | **Genesis 1:2** | "The earth was invisible and unformed" — formless void, primary darkness |
| **Homily 3** (32013) | **Genesis 1:3–5** | Light and Day One — creation of light |
| **Homily 4** (32014) | **Genesis 1:6–8** | The firmament / "vault of the heavens" — Day Two |
| **Homily 5** (32015) | **Genesis 1:9–13** | The gathering of waters, dry land, vegetation — Day Three |
| **Homily 6** (32016) | **Genesis 1:14–19** | Sun, moon, stars — Day Four |
| **Homily 7** (32017) | **Genesis 1:20–23** | Sea creatures and birds — Day Five (part 1) |
| **Homily 8** (32018) | **Genesis 1:20–25** | Land animals — Day Five (part 2) + Day Six (part 1) |
| **Homily 9** (32019) | **Genesis 1:24–26** | Creation of land animals + the prelude to "Let us make man in our image" |

**This produces 9 STRONG WorkSection-to-Bible head-verse links covering the entire Genesis 1 creation narrative.** A reader opening Genesis 1:14 in the Bible reader gets one-tap access to Basil's Homily 6. This is the single most valuable Bible-linking outcome from the Basil acquisition.

**Note:** Basil's Hexaemeron pairs naturally with **Gregory of Nyssa's *On the Making of Man*** (2914), which was explicitly written to supplement the Hexaemeron by covering the creation of man (Genesis 1:26–27) — Basil died before completing the Hexaemeron and Gregory's *On the Making of Man* fills the gap. These two works should be cross-linked in the library.

### 10.2 Inline scripture refs

Extract all ~1500–2000 `<span class="stiki">` blocks across the 337 files. Same mechanical parsing as the other corpora.

**Top scripture-dense files:**
- **3203 De Spiritu Sancto** — 80 refs (Trinitarian/pneumatological proof-texts; very dense argumentation from Scripture)
- **3201xxx Hexaemeron homilies** — 4–8 refs each plus the head-verse epigraph
- **3202xxx Letters** — varies widely; doctrinal letters higher-density

### 10.3 Thematic Bible-linking — Basil's pneumatology and Trinitarian theology

**De Spiritu Sancto thematic links** (the work organizes Scripture around the doxological honor of the Holy Spirit):

- John 14:16–17, 14:26, 15:26, 16:7–15 (Paraclete discourses)
- Matthew 28:19 (Trinitarian baptismal formula)
- 2 Corinthians 13:14 (Trinitarian benediction)
- 1 Corinthians 12:4–6 (gifts of the Spirit)
- Romans 8:9–17, 26–27 (Spirit-led life)
- Psalm 32 (33):6 LXX ("By the word of the Lord were the heavens made, and all their host by the breath [Spirit] of His mouth")
- Genesis 1:2 ("The Spirit of God moved over the waters") — Basil's exegetical proof of the Spirit's role in creation

**Hexaemeron thematic links** beyond the per-homily head verses:

- John 1:1–3 (the Word in creation — Basil cross-references this with Genesis 1)
- Colossians 1:15–17 (Christ in whom all things hold together)
- Hebrews 11:3 (creation by faith)
- Psalm 18 (19):1 LXX ("The heavens declare the glory of God")
- Romans 1:20 (creation reveals the invisible)

### 10.4 Lectionary linking — Orthodox calendar

This is where Basil is **especially valuable** for the Theosis daily-reading flow:

- **January 1 (Feast of St. Basil)** — surface entire corpus; *De Spiritu Sancto* featured.
- **January 30 (Three Holy Hierarchs)** — joint feast with Gregory Nazianzen and John Chrysostom. Surface Basil's corpus alongside the other two.
- **Great Lent** — the **Liturgy of St. Basil** is served on every Sunday of Great Lent except Palm Sunday. On those Sundays, the app could surface relevant Basil readings.
- **Genesis Lenten cycle** — Orthodox Great Lent reads through Genesis sequentially. **The Hexaemeron homilies map directly to the daily Genesis readings.** This is a powerful daily-flow integration: Day 1 of Lent → Genesis 1:1–13 → Hexaemeron Homily 1.
- **Christmas Eve, Theophany Eve, Holy Thursday, Holy Saturday** — Liturgy of St. Basil is served; calendar-linking opportunity.
- **Pentecost** — *De Spiritu Sancto* is THE natural reading for Pentecost and the entire Paschaltide.

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Hexaemeron head-verse linking** (9 hand-curated WorkSection-to-verse-range entries — the strongest single result). Parse `<p><strong>...</strong></p>` epigraphs to confirm verse anchors.
2. **Pass 2 — Inline `stiki` extraction** across all 337 files. Produces ~1500–2000 `BibleRef` rows mechanically.
3. **Pass 3 — Thematic mapping** for *De Spiritu Sancto* (~15–20 entries) and Hexaemeron's broader theological themes (~10 entries).
4. **Pass 4 — Calendar mapping** for January 1, January 30, the Great Lent Liturgy of St. Basil Sundays, Pentecost, and the Lenten Genesis cycle.

---

## 11. Which Basil works are most useful for the Theosis library

Ranked by Orthodox-tradition importance and reader-engagement potential:

| Rank | Work | Why it's valuable |
|---|---|---|
| 1 | **3201 Nine Homilies of the Hexaemeron** | **The foundational patristic creation commentary.** Verse-by-verse on Genesis 1. Pairs with Gregory of Nyssa's *On the Making of Man* (covers Gen 1:26–27). Daily-Lenten-reading integration potential. 9 strong head-verse links. |
| 2 | **3203 De Spiritu Sancto (On the Holy Spirit)** | **The foundational Orthodox pneumatology.** Established that the Holy Spirit shares the doxological honor of the Father and Son. Long but theologically central. Pentecost-season reading. |
| 3 | **3202 Letters** (selective) | The letters to Amphilochius (188, 199, 217 — the "Canonical Epistles") form the basis of Orthodox canon law. Other doctrinal letters (Letters 8, 9, 38, 52, 125, 234, 261) carry significant theological weight. The personal letters to Gregory Nazianzen and to family members are spiritually formative reading. |

That's the full top tier — only 3 works total in the corpus. Several **individual letters** within 3202 deserve special surfacing:

**Particularly valuable individual Letters:**

| Letter | Recipient / Topic | Significance |
|---|---|---|
| Letter 2 | To Gregory Nazianzen (on the contemplative life) | Classic monastic spiritual reading |
| Letter 8 | To the Caesareans, on Trinitarian formula | Important doctrinal |
| Letter 38 | To Gregory of Nyssa (on hypostasis vs ousia) | Foundational Cappadocian Trinitarian terminology |
| Letter 52 | To the Canonicae (on Trinitarian baptism) | Doctrinal |
| Letter 125 | Transcription of the Nicene faith | Creed-related |
| Letter 188 | First Canonical Epistle to Amphilochius | Foundation of Orthodox canon law |
| Letter 199 | Second Canonical Epistle to Amphilochius | Continuation |
| Letter 217 | Third Canonical Epistle to Amphilochius | Continuation |
| Letter 233 | To Amphilochius (on the limits of human knowledge of God) | Important epistemological/theological |
| Letter 234 | To Amphilochius (on the divine essence and energies) | Foundational for Palamite theology — proto-essence/energies distinction |
| Letter 261 | To the Sozopolitans (on the Incarnation) | Christological |

---

## 12. Which Basil works are mostly general library texts

In Basil's small corpus, there are no purely "library-shelf" works — even the Letters have spiritual reading value. **The closest to background reading is the bulk of the Letters collection** (the ~290 letters outside the doctrinal/canonical highlights listed above) — pastoral correspondence, administrative letters, condolences, recommendations, etc. Historically and biographically valuable, but episodic.

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module already covers ~99% of Basil's parsing needs (the cleanest of the four corpora). Specific additions:

### 13.1 Hexaemeron head-verse extraction (NEW)

Add a parser step that, when processing 3201xxx files, looks for the `<p><strong>...</strong></p>` element immediately following `<h1>`:

```python
def extract_head_verse(soup, work_id, section_id):
    """For Hexaemeron homilies (3201xxx), extract the head verse epigraph."""
    if not work_id.startswith("3201"):
        return None
    h1 = soup.select_one("#springfield2 h1")
    if not h1:
        return None
    # Walk forward to find <p><strong>{text}</strong></p>
    for sibling in h1.next_siblings:
        if sibling.name == "p":
            strong = sibling.find("strong")
            if strong:
                epigraph = strong.get_text(strip=True)
                return epigraph  # e.g., "In the Beginning God made the Heaven and the Earth."
    return None

# Map epigraph → canonical Bible reference (hand-curated for the 9 homilies)
HEXAEMERON_HEAD_VERSES = {
    "32011": {"book": "GEN", "chapter": 1, "verse_start": 1, "verse_end": 1},
    "32012": {"book": "GEN", "chapter": 1, "verse_start": 2, "verse_end": 2},
    "32013": {"book": "GEN", "chapter": 1, "verse_start": 3, "verse_end": 5},
    "32014": {"book": "GEN", "chapter": 1, "verse_start": 6, "verse_end": 8},
    "32015": {"book": "GEN", "chapter": 1, "verse_start": 9, "verse_end": 13},
    "32016": {"book": "GEN", "chapter": 1, "verse_start": 14, "verse_end": 19},
    "32017": {"book": "GEN", "chapter": 1, "verse_start": 20, "verse_end": 23},
    "32018": {"book": "GEN", "chapter": 1, "verse_start": 20, "verse_end": 25},
    "32019": {"book": "GEN", "chapter": 1, "verse_start": 24, "verse_end": 26},
}
```

### 13.2 De Spiritu Sancto chapter chunking

3203.html has 30 `<h2>Chapter N</h2>` headings. Each chapter is followed by:
1. `<p><strong>{descriptive title}</strong></p>` — the chapter's topic title
2. Numbered paragraphs `<p>N. ...</p>`

The parser should:
- Split on `<h2>` to produce 30 chapter records
- Extract the chapter's title from the immediately-following `<p><strong>...</strong></p>`
- Parse numbered paragraphs within each chapter
- Citation form: "*Spir.* 9.22" = Chapter 9, paragraph 22 → preserve this addressing in `WorkSection.short_label` or a dedicated `canonical_citation` field

### 13.3 Letter sub-page handling

3202 Letters has 325 sub-pages. Most are short (7–50 KB). Standard parser handles them as regular WorkSection rows. The interesting metadata:
- **Recipient name**: usually in the body's opening line (e.g., "To Eusebius, my comrade"). Could be extracted with a heuristic; for v1, store the full body and skip recipient extraction.
- **Letter classification** (doctrinal / canonical / personal / pastoral): editorial tag; not extractable from HTML.

### 13.4 Iteration order

Drive from `provenance_*.json`. For 3203 (no sub-pages), treat the index file as content and split on `<h2>`. For 3201 and 3202, iterate `subpages[]`.

### 13.5 Single-translator optimization

Since all 337 files share the same translator (Blomfield Jackson) and bibliographic record, the parser can short-circuit the citation-footer parsing after the first file by detecting the uniform pattern. Trivial optimization, not required.

---

## 14. Risks, edge cases, cleanup issues

Re-read the Augustine companion doc §14 for the shared risk register. Basil-specific items below.

### 14.1 Regex bug — already accounted for

Hexaemeron sub-pages use 1-digit suffixes (32011–32019). The downloader regex was widened to `\d{1,3}` during the Athanasius acquisition (2026-05-20) **before** the Basil download, so Basil acquired correctly on first attempt. No retroactive action needed.

### 14.2 LXX vs MT versification

Same risk as for all the other Greek Fathers. Basil quotes the Septuagint exclusively. The Hexaemeron homilies cite Genesis according to LXX, which agrees with MT for Genesis 1. **But Psalm citations in De Spiritu Sancto and the Letters follow LXX numbering** — same versification issue as Augustine/Gregory/Athanasius. Confirm Theosis Psalter scheme is LXX (likely yes given Orthodox orientation).

**Specific Basil LXX-MT Psalm references** observed:
- Psalm 32:6 LXX = Psalm 33:6 MT ("By the word of the Lord were the heavens made")
- Psalm 18:1 LXX = Psalm 19:1 MT ("The heavens declare the glory of God")
- Many others in De Spiritu Sancto and the Letters

### 14.3 The single-translator caveat (Blomfield Jackson, 1895)

Jackson's NPNF translation is the standard 19th-century English Basil but is now considered **dated** in some scholarly contexts. For Orthodox library purposes, it's perfectly adequate. Modern alternatives:
- Anna Silvas, *The Asketikon of St. Basil the Great* (Oxford) — not in this corpus
- Stephen Hildebrand, *On the Holy Spirit* (SVS Press) — modern translation of 3203
- *Saint Basil: Letters* (Fathers of the Church series, CUA Press) — modern translation of 3202

If the app ever surfaces "modern translation alternatives," these are the canonical recent editions.

### 14.4 Cappadocian cross-references

Basil's works frequently reference (and were referenced by) his brother Gregory of Nyssa and his friend Gregory Nazianzen. **Cross-corpus links to consider:**
- Hexaemeron 3201 ↔ Gregory of Nyssa *On the Making of Man* (2914) — explicit thematic continuation
- De Spiritu Sancto 3203 ↔ Gregory of Nyssa *On the Holy Spirit* (2903) — companion pneumatology
- Letter 38 (on *hypostasis*) ↔ Cappadocian Trinitarian writings broadly
- Letters between Basil and Gregory Nazianzen (Letters 2, 14, 19, 71 in Basil's collection) — pair with Gregory Nazianzen's Letters when that corpus is processed

These cross-references should drive a future **patristic-citation-graph** feature in the app.

### 14.5 Missing major works

As noted in §3, several of Basil's most important works are NOT in this corpus (Long Rules, Short Rules, Moralia, Address to Young Men, Psalm homilies, miscellaneous homilies). Phase-2 acquisition recommended.

### 14.6 Letter numbering gaps

3202's 325 sub-pages span letter numbers 1–366 with gaps. Some numbers are absent because:
- The letter is not extant in Greek manuscript tradition
- Modern critical editions reclassify the letter under a different author
- NPNF (Jackson) omitted the letter

**Iterate `provenance_3202.json subpages[]` literally** — don't try to predict sequentially.

### 14.7 Compute scale

337 files × ~12 KB avg = trivial. Smaller than Augustine; comparable to Athanasius+Gregory.

---

## 15. Recommended next step for a separate integration chat

> **"Build the four-Father patristic ingestion pipeline."**
>
> 1. Read all four planning docs (Augustine, Gregory of Nyssa, Athanasius, Basil).
> 2. Read the Theosis library schema; confirm or amend Person/Work/WorkSection/SourceRecord/BibleRef shapes.
> 3. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py`.
> 4. Confirm Psalter versification (LXX vs MT) with the user.
> 5. Build `scripts/parse_newadvent/` as a shared module. Test on **four end-to-end cases** (one per Father):
>    - Augustine **1101** (Confessions) — index + 13 sub-pages
>    - Gregory **2914** (On the Making of Man) — self-contained with 30 internal chapters
>    - Athanasius **2802** (On the Incarnation) + **28161** (Discourse 1 vs Arians) — 4-digit self-contained + 5-digit sub-page
>    - Basil **3201** (Hexaemeron index) + **32011** (Homily 1) + **3203** (De Spiritu Sancto self-contained with 30 chapters) — 5-digit sub-page + head-verse epigraph + nested chapter parsing
> 6. Expand to all 87 works = **48 Augustine + 15 Gregory + 21 Athanasius + 3 Basil = 1323 HTML files**:
>    - 863 Augustine
>    - 45 Gregory
>    - 78 Athanasius
>    - 337 Basil
> 7. Bible-linking passes:
>    - Mechanical `stiki` extraction across all four corpora.
>    - Augustine head-verse linking (1601/1602/1701/1702/1801).
>    - Athanasius head-verse linking (2805).
>    - **Basil Hexaemeron head-verse linking (9 verse-range entries — the strongest single result)**.
>    - Thematic editorial tags (~200 hand-curated entries across all four).
> 8. Calendar tags:
>    - Augustine: feast day August 28 in the West (June 15 in some Orthodox calendars).
>    - Gregory of Nyssa: feast day January 10.
>    - Athanasius: feast day January 18.
>    - **Basil: feast day January 1 + Three Holy Hierarchs January 30 + Liturgy of St. Basil days + Pentecost (for De Spiritu Sancto) + Lenten Genesis cycle (for Hexaemeron)**.
> 9. **Cross-corpus links:**
>    - Basil's Hexaemeron 3201 ↔ Gregory of Nyssa's On the Making of Man 2914
>    - Basil's De Spiritu Sancto 3203 ↔ Gregory of Nyssa's On the Holy Spirit 2903
>    - Cappadocian Letters cross-referencing
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files in any author folder
> - Phase-2 acquisition (Basil's Asketikon, Moralia, Psalm homilies, miscellaneous homilies; Gregory's Life of Moses, Beatitudes, Lord's Prayer commentary; etc.)
> - The Gregory Nazianzen corpus (already partially downloaded — completes the Three Holy Hierarchs set with Basil and a future John Chrysostom acquisition)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/basil/`
- Files: 337 `.html` + 3 `provenance_*.json` (+ ~340 legacy `.md` files to ignore)
- Total raw HTML: ~4.14 MB
- Works: 3 (entire New Advent Basil corpus = NPNF Series II Vol. 8)
- Single largest file: `3203.html` 289 KB (De Spiritu Sancto — single page, 30 chapters)
- Largest sub-pages: `3202008.html` 50 KB (Letter 8), `32016.html` 49 KB (Hexaemeron Homily 6)
- Smallest sub-pages: ~7 KB (very short letters)
- Multi-sub-page works: 2 (Hexaemeron: 9 homilies; Letters: 325 sub-pages)
- Self-contained works: 1 (De Spiritu Sancto)
- Translator: Blomfield Jackson (uniform across corpus — single translator)

## Appendix B — Acquisition log

`content/raw/_index/acquisition_log_phase1_20260520T190411.json`
(3 works OK, 0 errors, 337 files downloaded on 2026-05-20.)

## Appendix C — Sample files inspected for this plan

- `3201.html` (Hexaemeron index) — TOC for 9 homilies
- `32011.html` (Hexaemeron Homily 1, 42 KB) — head-verse epigraph pattern, numbered paragraphs, dense Genesis 1:1 commentary
- `32012.html` (Hexaemeron Homily 2) — same structure, Gen 1:2
- `3202.html` (Letters index) — TOC for 325 letters
- `3203.html` (De Spiritu Sancto, 289 KB) — single-file self-contained, 30 `<h2>Chapter N</h2>` sections, `<p><strong>topic</strong></p>` titles, numbered paragraphs throughout
- `provenance_3201.json`, `provenance_3202.json`, `provenance_3203.json` — provenance schemas
