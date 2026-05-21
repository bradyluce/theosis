# Ignatius of Antioch Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Ignatius of Antioch HTML corpus downloaded from New Advent. No parser or app code has been written yet. This doc is intended as a complete brief for a separate integration chat that will build the actual ingestion pipeline.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** **Ante-Nicene Fathers (ANF), Vol. 1** — Alexander Roberts & James Donaldson eds., 1885 (A. Cleveland Coxe American editor). Public domain. **Single translator pair: Roberts & Donaldson.** New Advent transcriptions © New Advent LLC.

> **Companion docs:**
> - [`docs/augustine-raw-content-integration-plan.md`](augustine-raw-content-integration-plan.md)
> - [`docs/gregory-of-nyssa-raw-content-integration-plan.md`](gregory-of-nyssa-raw-content-integration-plan.md)
> - [`docs/athanasius-raw-content-integration-plan.md`](athanasius-raw-content-integration-plan.md)
> - [`docs/basil-raw-content-integration-plan.md`](basil-raw-content-integration-plan.md)
> - [`docs/chrysostom-raw-content-integration-plan.md`](chrysostom-raw-content-integration-plan.md)
> - [`docs/gregory-nazianzen-raw-content-integration-plan.md`](gregory-nazianzen-raw-content-integration-plan.md)
>
> **The first ANF (Ante-Nicene Fathers) corpus in the library.** Most HTML patterns are identical to the NPNF corpora, but this doc highlights:
> 1. The **switch from NPNF to ANF** as the source series (different translators, different publisher/year metadata)
> 2. The **unique `<h2 class="chapterN">` chapter-marker convention** that doesn't appear in any of the six NPNF corpora
> 3. **Mixed `class=` vs `id=` attribute usage** (Epistle to the Romans uniquely uses `id="chapter1"`)
> 4. Ignatius's **earliest-Christian-text** historical-tradition significance — these are the earliest non-canonical Christian writings (c. 107 AD)

---

## 1. Where the Ignatius files are located

All raw files live in a single directory:

```
content/raw/fathers/ignatius/
```

Same per-author convention as the other six Fathers.

---

## 2. What files were downloaded

**Counts (in `content/raw/fathers/ignatius/`):**

| Item | Count |
|---|---|
| `*.html` raw files | **9** (no multi-sub-page works) |
| `provenance_<work_id>.json` files | **9** |
| Legacy `*.md` files | ~9 |
| **Total raw HTML size** | **~0.29 MB** |

**File-naming convention** — all works are self-contained, no sub-pages:

| Filename | Work |
|---|---|
| `0104.html` | Epistle to the Ephesians |
| `0105.html` | Epistle to the Magnesians |
| `0106.html` | Epistle to the Trallians |
| `0107.html` | Epistle to the Romans |
| `0108.html` | Epistle to the Philadelphians |
| `0109.html` | Epistle to the Smyrnaeans |
| `0110.html` | Epistle to Polycarp |
| `0114.html` | The Spurious Epistles (single 103 KB file packaging multiple inauthentic letters) |
| `0123.html` | The Martyrdom of Ignatius |

Acquisition log: `content/raw/_index/acquisition_log_phase3_20260520T211359.json` — 9 works OK, 0 errors.

---

## 3. Major works represented

**All 9 New Advent Ignatius works are present.** This is the entire ANF Vol. 1 Ignatius selection.

### The Seven Authentic Epistles (Middle Recension)

| ID | Title | Size | Significance |
|---|---|---|---|
| **0104** | Epistle to the Ephesians | 36 KB | Longest authentic letter; contains the famous "Eucharist as the medicine of immortality" (§20). 21 chapters. |
| **0105** | Epistle to the Magnesians | 23 KB | On unity with the bishop; condemnation of Judaizing |
| **0106** | Epistle to the Trallians | 20 KB | Brief; anti-docetic Christology |
| **0107** | Epistle to the Romans | 22 KB | Plea NOT to prevent his martyrdom; "I am the wheat of God" (§4). Written from Smyrna en route to Rome. |
| **0108** | Epistle to the Philadelphians | 21 KB | On schism and unity |
| **0109** | Epistle to the Smyrnaeans | 24 KB | **First use of "Catholic Church"** (§8:2) in extant Christian literature; on episcopal authority |
| **0110** | Epistle to Polycarp | 19 KB | Personal pastoral letter to the young bishop of Smyrna (who himself was martyred c. 155 — see Polycarp corpus 0102 *Martyrdom of Polycarp*) |

**These are among the EARLIEST non-canonical Christian writings**, dated c. 107 AD (during Ignatius's journey from Antioch to martyrdom at Rome under Trajan). They are **foundational** for:

1. **Threefold ministry** (bishop / presbyter / deacon) — first clear attestation
2. **"Catholic Church"** — first use of the term
3. **Eucharistic real presence** theology
4. **Anti-docetic Christology** ("truly born of Mary, truly suffered, truly rose")
5. **Apostolic succession** (Ignatius was a disciple of John the Apostle)
6. **Christology** ("Jesus Christ our God" — explicit divine title applied to Christ)

### Other Works

| ID | Title | Size | Significance |
|---|---|---|---|
| **0114** | The Spurious Epistles | **103 KB** | Single file packaging multiple inauthentic letters (Epistle to the Tarsians, to the Antiochians, to Hero, to the Philippians, to Mary at Cassobela, etc.). These are 4th-century forgeries that expand the Ignatian corpus. Included in ANF for scholarly completeness. |
| **0123** | The Martyrdom of Ignatius | 24 KB | The "Antiochene Acts" of Ignatius's martyrdom. Narrates the conversation with Emperor Trajan, the journey from Antioch to Rome, and the death by wild beasts in the Colosseum. |

### Notable absences

The Ignatius corpus from New Advent is **essentially complete** for the Middle Recension. The only "missing" texts are:

- **The Long Recension** — 4th-century interpolated version of Ignatius's letters. Some of these expanded versions are part of the Spurious Epistles file (0114), but the full Long Recension as a separate textual tradition is not parsed out.
- **The Syriac fragmentary recension** (William Cureton, 1845) — abbreviated 3-letter version (Romans, Polycarp, Ephesians); now considered an abridgement. Not on New Advent.
- **Roman Acts of the Martyrdom** — a second martyrdom narrative; 0123 is the Antiochene version. The Roman Acts are sometimes printed alongside but not on New Advent.

---

## 4. How the files are structured internally

Identical shell to the six NPNF corpora:

- `<head>` with title, canonical link, `screen6.css`
- Shared header (logo, search, A–Z encyclopedia bar) — junk
- `<div id="mi5">` breadcrumbs
- **`<div id="springfield2">`** main content wrapper (present in **all 9 files**)
- `<h1>` title, Gumroad banner
- Main body
- **`<div class="pub">`** citation footer with `id="src*"` spans (present in **all 9 files**)
- Footer + Cloudflare beacon

The two invariants — `#springfield2` and `id="srctrans"` — hold across the entire corpus.

---

## 5. One file per work? Per section? **All 9 works are self-contained.**

No sub-pages anywhere. Every Ignatius work is a single HTML file with internal `<h2>` (and sometimes `<h3>`) chapter markers. The **Spurious Epistles file is the only multi-letter package** — it bundles ~5-7 inauthentic letters in one HTML file.

---

## 6. HTML patterns inside content pages

Most patterns are identical to the NPNF corpora. **Ignatius-specific features below.**

### 6.1 The unique `<h2 class="chapterN">` sequential class convention

The seven authentic epistles use a **distinctive chapter-marker pattern** not seen in any of the six NPNF corpora:

```html
<h2 class="chapter0">Greeting</h2>
<p>Ignatius, who is also called Theophorus, to the Church which is at Ephesus...</p>

<h2 class="chapter1">Chapter 1. Praise of the Ephesians</h2>
<p>I have become acquainted with your name...</p>

<h2 class="chapter2">Chapter 2. Congratulations and entreaties</h2>
<p>As to my fellow-servant Burrhus...</p>

...

<h2 class="chapter21">Chapter 21. Conclusion</h2>
<p>My soul be for yours and theirs...</p>
```

The `<h2 class="chapterN">` class attribute encodes the chapter number directly. Chapter 0 = the salutation/greeting (no Roman/Arabic numeral in the heading text; just the word "Greeting"). Chapters 1+ have the format `Chapter N. {Title}`.

**This is parser-friendly:**
- The chapter number is reliably extractable from `class="chapterN"` (no need to parse Roman/Arabic numerals from the heading text)
- Chapter 0 (Greeting) is consistently distinguished from numbered chapters
- The heading text reliably starts with `Chapter N. ` for numbered chapters

### 6.2 The Romans-Epistle quirk: `id=` instead of `class=`

The Epistle to the Romans (`0107.html`) uniquely uses `id="chapterN"` instead of `class="chapterN"`:

```html
<h2>Greeting</h2>                              <!-- No class or id on the Greeting -->
<h2 id="chapter1">Chapter 1. As a prisoner...</h2>
<h2 id="chapter2">Chapter 2. Do not save me from martyrdom</h2>
...
```

**Parser implication:** the chapter-extractor must handle **either `class="chapterN"` or `id="chapterN"`**. The most robust approach is to check both attributes; if neither is present, fall back to regex-parsing the heading text for `Chapter N`.

### 6.3 The Spurious Epistles three-tier hierarchy

`0114.html` packages multiple inauthentic letters in a single file using a **two-level heading hierarchy**:

```html
<h2>Epistle to the Tarsians</h2>           <!-- ← letter divider (no class) -->
  <h3>Greeting</h3>
  <p>Ignatius, who is also called Theophorus, to the Church which is at Tarsus...</p>
  <h3>Chapter 1. His own sufferings; exhortation to stedfastness</h3>
  <p>From Syria even unto Rome I fight with beasts...</p>
  <h3>Chapter 2. Cautions against false doctrine</h3>
  ...

<h2>Epistle to the Antiochians</h2>        <!-- ← next letter -->
  <h3>Greeting</h3>
  <h3>Chapter 1. ...</h3>
  ...
```

`<h2>` = letter boundary; `<h3>` = chapter within letter. **This is the inverse of the genuine epistles** (where `<h2>` was the chapter marker). The parser must detect that 0114 has a different hierarchy and chunk accordingly.

### 6.4 The Martyrdom: standard `<h2>` chapters

`0123.html` uses **bare `<h2>Chapter N. {Title}</h2>` headings** with no `class` or `id` attributes:

```html
<h2>Chapter 1. Desire of Ignatius for martyrdom</h2>
<p>When Trajan, not long since, succeeded to the empire of the Romans, Ignatius...</p>

<h2>Chapter 2. Ignatius is condemned by Trajan</h2>
<p>For Trajan, in the ninth year of his reign...</p>
```

This is the simplest pattern — the chapter number is in the heading text only.

### 6.5 Paragraph structure

**Paragraphs are NOT explicitly numbered** in the Ignatius corpus. There's no `<p>1. ...</p>` or `<p>I. ...</p>` convention — paragraphs are bare `<p>...</p>` tags.

This differs from:
- Augustine, Basil, Chrysostom NPNF — leading Arabic numerals
- Gregory Nazianzen — leading Roman numerals
- Gregory of Nyssa — partial numbering (varies)

**Reason:** Ignatius's chapters are very short (often 1 paragraph each), so paragraph-numbering inside chapters is unnecessary. The chapter number IS the citation unit. Standard citation form: "Ignatius, *Ephesians* 5" = Ephesians chapter 5 (one paragraph).

### 6.6 Scripture references — `<span class="stiki">`

Standard pattern, same as NPNF corpora:

```html
<span class="stiki" id="note010492"><a href="../bible/eph005.htm#verse2">Ephesians&nbsp;5:2</a></span>
```

**Density is moderate.** Ignatius's letters are pastoral/theological, not exegetical — Bible refs are illustrative, not expository. Density per chapter: 1–5 refs typical. Corpus-wide: estimated 200–400 references.

**Historical significance of Ignatius's citations:** these are among the **earliest non-canonical Christian writings to quote the NT**. His citations are valuable for textual-criticism scholarship (confirming early circulation of Matthew, Paul's epistles, etc.). The Theosis library doesn't need to surface this scholarly angle, but it's worth noting.

### 6.7 Citation footer — ANF (not NPNF!)

**This is the first ANF corpus in the library.** The citation footer differs from NPNF:

```html
<div class="pub">
  <p id="src">
    <strong>Source.</strong>
    <span id="srctrans">Translated by Alexander Roberts and James Donaldson.</span>
    From <span id="srcwork">Ante-Nicene Fathers</span>,
    <span id="srcvolume">Vol. 1.</span>
    <span id="srced">Edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe.</span>
    (<span id="srcpublisher">Buffalo, NY: Christian Literature Publishing Co.,</span>
    <span id="srcyear">1885.</span>)
    <span id="kk">Revised and edited for New Advent by Kevin Knight.</span>
    <span id="srcurl">…</span>
  </p>
</div>
```

Differences from NPNF:
- `srcwork` = "Ante-Nicene Fathers" (NOT "Nicene and Post-Nicene Fathers")
- No "First Series" / "Second Series" qualifier — ANF is a single series of 10 volumes
- Editors include the **American editor A. Cleveland Coxe** alongside Roberts and Donaldson (the original Scottish editors)
- Publication year: 1885 (NPNF First Series started 1886–1889; NPNF Second Series started 1890s)

All 9 files share identical bibliographic data → single shared `BibliographicEdition` row.

---

## 7. How clean is the HTML?

Same level as the NPNF corpora. **Three Ignatius-specific edge cases:**

1. **Mixed `class="chapterN"` vs `id="chapterN"` attribute style** (six epistles use class; Romans uses id)
2. **Two-tier `<h2>` letter / `<h3>` chapter hierarchy in the Spurious Epistles file** (0114) — different from all other Ignatius files
3. **No paragraph numbering** anywhere in the corpus — citation unit is the chapter only

Otherwise: the HTML is uniformly clean. The Roberts-Donaldson 1885 translation is Victorian-formal English (older diction than the NPNF translations).

---

## 8. Extractable metadata

| Field | Source | Ignatius example |
|---|---|---|
| Author | Folder + `<title>` parenthetical | `Ignatius of Antioch` |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `0104` |
| Work title | `<h1>` | `The Epistle of Ignatius to the Ephesians` |
| Chapter number | `class="chapterN"` OR `id="chapterN"` OR parsed from heading text | `0` (Greeting), `1`, `2`, ..., `21` |
| Chapter title | Heading text after `Chapter N. ` | `Praise of the Ephesians`, `Conclusion` |
| **Letter divider** (in Spurious only) | `<h2>` with no class/id, plain "Epistle to X" pattern | `Epistle to the Tarsians` |
| **Chapter within Spurious Epistle** | `<h3>Chapter N. {title}</h3>` | `Chapter 1. His own sufferings` |
| Source URL | `<link rel="canonical">` or provenance JSON | `https://www.newadvent.org/fathers/0104.htm` |
| Translator | `<span id="srctrans">` | `Translated by Alexander Roberts and James Donaldson.` (uniform across corpus) |
| Series | `<span id="srcwork">` | `Ante-Nicene Fathers` (NOT NPNF) |
| Volume | `<span id="srcvolume">` | `Vol. 1.` |
| Editor | `<span id="srced">` | `Edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe.` |
| Year | `<span id="srcyear">` | `1885.` |
| Bible references | `<span class="stiki">` blocks | ~200–400 estimated total |
| Work type | provenance JSON `work_type` | `letter` (7 epistles + spurious), `hagiography` (1 martyrdom) |

---

## 9. Normalization to Theosis library records

Mirrors the schemas in the companion docs.

### Person

```ts
Person {
  id:          "person.ignatius-of-antioch"
  display:     "Ignatius of Antioch"
  also_known:  ["St. Ignatius", "Ignatius Theophorus", "Theophorus the God-Bearer"]
  born:        c. 35
  died:        c. 107        // martyred under Trajan; exact year debated (107-117)
  feast_day:   "12-20"        // Orthodox calendar: December 20 (Greek practice)
                              // Also Jan 29 in some Eastern traditions (transfer of relics)
  feast_west:  "10-17"        // Catholic Western feast day (Oct 17)
  tradition:   "Second/third bishop of Antioch; disciple of John the Apostle (with Polycarp); apostolic father; martyred at Rome under Trajan c. 107"
  see:         "Antioch (Syria)"
  ecumenical_role: "Author of the earliest extant Christian writings outside the New Testament; first attester of threefold ministry (bishop/presbyter/deacon); first use of 'Catholic Church'"
  epithet:     "Theophorus (the God-Bearer)"  // his self-designation
  apostolic:   true   // Apostolic Father — direct disciple of an Apostle (John)
}
```

**Orthodox significance:**
- One of the **Apostolic Fathers** (with Clement of Rome, Polycarp, Hermas, Papias, Mathetes, Barnabas) — a select group of post-NT writers with direct connection to the apostles
- **Disciple of St. John the Apostle** (along with Polycarp of Smyrna)
- His seven authentic letters are among the **earliest extant Christian writings** outside the NT — written during his journey from Antioch to martyrdom in Rome (c. 107)
- His martyrdom at Rome under Trajan (eaten by wild beasts in the Colosseum) made him one of the **archetypal Christian martyrs**
- His **Eucharistic theology** ("medicine of immortality", *Eph.* 20) is foundational for Orthodox sacramental thought
- His **insistence on the bishop as the center of unity** is foundational for Orthodox ecclesiology

### Work

9 rows total — small corpus.

```ts
Work {
  id:               "work.ignatius.0104"
  author_id:        "person.ignatius-of-antioch"
  title:            "Epistle to the Ephesians"
  alt_titles:       ["Ad Ephesios"]
  work_type:        "letter"
  composition_date: "c. 107 (during journey from Antioch to Rome)"
  language_original:"Greek"
  has_subsections:  true
  section_count:    22   // Greeting + 21 chapters
  source_id:        "src.newadvent.0104"
  description:      "Letter to the Church at Ephesus; contains the 'Eucharist as medicine of immortality' passage"
  is_authentic:     true
  recension:        "middle"   // Middle Recension (genuine)
}
```

For **0114 Spurious Epistles**, flag explicitly:

```ts
Work {
  id:                "work.ignatius.0114"
  title:             "The Spurious Epistles"
  work_type:         "letter"
  is_authentic:      false
  recension:         "pseudo-Ignatian"
  authorship_note:   "Inauthentic 4th-century forgeries; included for scholarly completeness"
  composition_date:  "c. 4th century"
  has_subsections:   true    // packages multiple inauthentic letters
  section_count:     varies  // depends on chunk-by-letter parsing
}
```

### WorkSection

For the 7 authentic epistles, **one WorkSection per chapter** (Greeting + ~20 chapters each):
- Total authentic chapters: ~7 letters × ~12 avg chapters = **~85 chapter rows**
- For the Spurious Epistles, chunk by `<h2>` letter divider → ~5-7 letter rows; then optionally chunk each by `<h3>` chapter → many more rows
- For the Martyrdom, chunk by `<h2>` → ~10 chapter rows

```ts
WorkSection {
  id:              "section.ignatius.0104.05"
  work_id:         "work.ignatius.0104"
  order_index:     6        // 6th section (0=Greeting, 1-5 = chapters)
  chapter_number:  5
  section_type:    "chapter"
  short_label:     "Eph. 5"           // standard scholarly citation form
  display_title:   "The praise of unity"
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.0104"
  bible_refs:      BibleRef[]
}
```

### SourceRecord

All 9 Ignatius works share identical bibliographic data — one shared `BibliographicEdition`:

```ts
SourceRecord {
  id:              "src.newadvent.0104"
  work_id:         "work.ignatius.0104"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/0104.htm"
  translator:      "Alexander Roberts and James Donaldson"
  series:          "Ante-Nicene Fathers"
  volume:          "Vol. 1"
  editor:          "Alexander Roberts, James Donaldson, and A. Cleveland Coxe"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1885
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/ignatius/0104.html"
  provenance_json: "content/raw/fathers/ignatius/provenance_0104.json"
}
```

---

## 10. Bible-linking strategy

Ignatius's letters are **pastoral-theological**, not exegetical. Like Gregory Nazianzen's orations, they don't have head-verse epigraphs.

### 10.1 No verse-commentary works

No head-verse linking is mechanically extractable.

### 10.2 Inline scripture refs — ~200–400 BibleRef rows

Extract all `<span class="stiki">` blocks. Same mechanical parsing as the other corpora.

**Notable Ignatian citations** (early testimony to NT books):
- Quotes/alludes to most of Paul's letters (esp. Ephesians, Romans, 1 Cor, Philippians)
- Quotes from Matthew, John
- Quotes from Old Testament (Psalms, Proverbs, Isaiah)
- His letters are valuable witnesses to NT circulation c. 107 AD

### 10.3 Thematic Bible-linking — high editorial value

Ignatius's letters have rich thematic links to Scripture themes that the integration could surface:

| Letter | Thematic anchors |
|---|---|
| **Ephesians** | John 6 (Eucharist/bread of life), Ephesians (NT) 4 (unity), 1 Cor 11 (Eucharist), 1 Cor 12 (one body), Matthew 28:19 (Trinity) |
| **Magnesians** | 1 Tim 3 (bishop qualifications), Acts 15 (Jewish-Gentile controversy), Galatians (against Judaizing) |
| **Trallians** | 1 John 4 (testing the spirits), 1 Cor 15 (resurrection) |
| **Romans** | Romans 6 (baptismal death/resurrection), Romans 8 (longing for Christ), Phil 1:21 ("to die is gain"), 1 Cor 9:24 (running the race) |
| **Philadelphians** | John 17 (unity of the Church), Romans 12 (one body) |
| **Smyrnaeans** | 1 John 4:2-3 (anti-docetic confession), Luke 24:39 ("handle me and see"), 1 Cor 15 (resurrection) |
| **Polycarp** | 1 Tim 4 (Timothy's youth and ministry), 2 Tim 2 (good soldier), Titus 2 (qualifications) |
| **Martyrdom** | Acts 6-7 (Stephen as prototypal martyr), 2 Tim 4:6 (Paul's "I am being poured out") |

This produces ~30-50 thematic editorial entries — small but rich.

### 10.4 Lectionary linking — Orthodox calendar

- **December 20 (Feast of St. Ignatius the God-Bearer)** — surface entire corpus.
- **January 29 (transfer of relics in some traditions)** — secondary commemoration.
- **Sundays of martyrdom commemorations** — *Epistle to the Romans* + *Martyrdom* are ideal readings.
- **Feast of Polycarp (February 23)** — surface *Epistle to Polycarp* (0110) + cross-reference to Polycarp's *Martyrdom* (0102 in adjacent corpus).
- **Apostolic Fathers cluster** — Ignatius + Polycarp + Clement of Rome + Hermas + Barnabas → joint surface for "earliest Christian writings outside the NT".

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Inline `stiki` extraction**: ~200–400 BibleRef rows.
2. **Pass 2 — Thematic mapping**: ~30–50 hand-curated entries.
3. **Pass 3 — Calendar mapping**: Dec 20 feast + cross-corpus Apostolic Fathers cluster.

---

## 11. Which Ignatius works are most useful for the Theosis library

In a 9-work corpus, ranking by Orthodox-tradition value:

| Rank | Work | Why it's valuable |
|---|---|---|
| 1 | **0104 Epistle to the Ephesians** | The longest, theologically richest letter. Contains the famous "medicine of immortality" passage. 21 chapters of pastoral and Eucharistic theology. |
| 2 | **0107 Epistle to the Romans** | The most emotionally powerful letter. Ignatius's plea to be allowed to die contains some of the most striking martyrdom theology in early Christianity ("I am the wheat of God"). |
| 3 | **0109 Epistle to the Smyrnaeans** | First use of "Catholic Church"; strong anti-docetic Christology ("truly suffered, truly rose"); key for sacramental and Christological doctrine. |
| 4 | **0123 The Martyrdom of Ignatius** | Hagiographical narrative; pairs with the seven letters as the "Acts" of the Ignatian martyrdom story. |
| 5 | **0110 Epistle to Polycarp** | Personal pastoral letter; ideal for clergy/bishop reading. Pairs with the Polycarp corpus (0102 *Martyrdom of Polycarp*). |
| 6 | **0105 Epistle to the Magnesians** | On unity with the bishop; anti-Judaizing. |
| 7 | **0108 Epistle to the Philadelphians** | On schism and unity. |
| 8 | **0106 Epistle to the Trallians** | Brief but theologically dense. |
| 9 | **0114 The Spurious Epistles** | **Lowest priority** for general reading; **important** for scholarly completeness. Should be flagged as `is_authentic: false` in the library and possibly hidden from default views. |

---

## 12. Which Ignatius works are mostly general library texts

- **0114 The Spurious Epistles** — inauthentic 4th-century forgeries. Include in the library with clear authenticity flag; do not surface in default reading flows.

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module covers ~95% of Ignatius. Specific additions:

### 13.1 Chapter-number extraction supporting class, id, and text fallback

```python
CHAPTER_CLASS_PATTERN = re.compile(r'chapter(\d+)')
CHAPTER_HEADING_PATTERN = re.compile(r'^Chapter\s+(\d+)\.?\s+(.*)', re.I)

def extract_chapter_number(h2_or_h3_elem):
    """Returns (chapter_number, chapter_title) for an Ignatius chapter heading."""
    # Try class attribute first (used by epistles 0104, 0105, 0106, 0108, 0109, 0110)
    class_attr = h2_or_h3_elem.get("class", [])
    if isinstance(class_attr, list):
        class_str = " ".join(class_attr)
    else:
        class_str = class_attr
    m = CHAPTER_CLASS_PATTERN.search(class_str or "")
    if m:
        chapter_num = int(m.group(1))
        title = parse_chapter_title(h2_or_h3_elem.get_text(strip=True), chapter_num)
        return chapter_num, title

    # Try id attribute (used by Romans 0107)
    id_attr = h2_or_h3_elem.get("id", "")
    m = CHAPTER_CLASS_PATTERN.search(id_attr)
    if m:
        chapter_num = int(m.group(1))
        title = parse_chapter_title(h2_or_h3_elem.get_text(strip=True), chapter_num)
        return chapter_num, title

    # Try heading text (used by 0123 Martyrdom and 0114 Spurious sub-chapters)
    text = h2_or_h3_elem.get_text(strip=True)
    m = CHAPTER_HEADING_PATTERN.match(text)
    if m:
        return int(m.group(1)), m.group(2)

    # Handle "Greeting" as chapter 0
    if text.strip().lower() == "greeting":
        return 0, "Greeting"

    return None, text

def parse_chapter_title(heading_text: str, chapter_num: int):
    """Strip 'Chapter N. ' prefix from heading text to get just the title."""
    m = CHAPTER_HEADING_PATTERN.match(heading_text)
    if m and int(m.group(1)) == chapter_num:
        return m.group(2)
    return heading_text
```

### 13.2 Spurious Epistles two-tier chunking

For `0114.html`, detect the multi-letter structure:

```python
def parse_spurious_epistles(soup):
    """Chunk 0114 by <h2> letter divider, then by <h3> chapter."""
    content = soup.select_one("#springfield2")
    letters = []
    current_letter = None
    for elem in content.find_all(["h2", "h3", "p"]):
        if elem.name == "h2":
            # New letter
            letter_title = elem.get_text(strip=True)
            current_letter = {
                "title": letter_title,             # e.g., "Epistle to the Tarsians"
                "chapters": [],
                "current_chapter": None,
            }
            letters.append(current_letter)
        elif elem.name == "h3" and current_letter:
            # New chapter within the current letter
            chapter_num, chapter_title = extract_chapter_number(elem)
            current_chapter = {
                "chapter_number": chapter_num,
                "title": chapter_title,
                "paragraphs": [],
            }
            current_letter["chapters"].append(current_chapter)
            current_letter["current_chapter"] = current_chapter
        elif elem.name == "p" and current_letter and current_letter.get("current_chapter"):
            current_letter["current_chapter"]["paragraphs"].append(elem)
    return letters
```

### 13.3 ANF series support in SourceRecord

The shared parser needs to recognize "Ante-Nicene Fathers" in `<span id="srcwork">` as a valid series alongside "Nicene and Post-Nicene Fathers". Add to the BibliographicEdition enum or wherever series codes live.

### 13.4 Authenticity flag

The Work record schema needs `is_authentic: bool` and `recension: string` fields to distinguish 0114 from the seven authentic epistles. The reader UI can decide whether to hide spurious works by default.

---

## 14. Risks, edge cases, cleanup issues

### 14.1 Mixed class/id chapter-marker conventions

Six epistles use `class="chapterN"`; Romans uses `id="chapterN"`; Martyrdom and Spurious sub-chapters use bare text-only headings. Parser must handle all three.

### 14.2 Spurious Epistles authenticity flag

CRITICAL: 0114 is **inauthentic**. The library MUST flag this clearly to prevent users from quoting these as genuine Ignatian texts. A `is_authentic: false` field on the Work record + UI warning is essential.

### 14.3 Citation format

Standard scholarly citation form for Ignatius is "*Eph.* 5" (chapter only — no paragraph) or "*Eph.* 5:2" (where 5:2 = chapter 5, sentence/paragraph 2 in scholarly editions). New Advent's `class="chapter5"` gives us the chapter; the **sentence/section level is NOT marked in the HTML** — would require manual parsing of long paragraphs. For v1, accept chapter-level citations only.

### 14.4 Cross-corpus link: Polycarp

Ignatius 0110 (Epistle to Polycarp) and the Polycarp corpus (0102 *Martyrdom of Polycarp*, 0136 *Epistle to the Philippians*) form a tight reference cluster. The integration should cross-link these.

### 14.5 LXX vs MT versification

Same risk as the other corpora. Ignatius's OT citations follow LXX. Minimal impact (he cites few OT passages).

### 14.6 Compute scale

9 files × ~32 KB avg = trivial. Smallest of all seven corpora by file count.

---

## 15. Recommended next step for a separate integration chat

> **"Build the seven-Father patristic ingestion pipeline."**
>
> 1. Read all seven planning docs (Augustine, Gregory of Nyssa, Athanasius, Basil, Chrysostom, Gregory Nazianzen, Ignatius).
> 2. Read the Theosis library schema; confirm Person/Work/WorkSection/SourceRecord/BibleRef shapes. **Add `is_authentic` and `recension` fields to Work** (Ignatius requirement).
> 3. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py`.
> 4. Confirm Psalter versification (LXX vs MT) with the user.
> 5. Build `scripts/parse_newadvent/` as a shared module. Test on **seven end-to-end cases** (one per Father):
>    - Augustine **1101** (Confessions)
>    - Gregory of Nyssa **2914** (On the Making of Man)
>    - Athanasius **2802** + **28161**
>    - Basil **3201** + **32011** + **3203**
>    - Chrysostom **2310** + **23101** (head-verse epigraph)
>    - Gregory Nazianzen **3102** + **310240** (Roman-numeral paragraphs) + **3103a** (multi-letter Division)
>    - **Ignatius 0104 (Ephesians, `class="chapterN"`) + 0107 (Romans, `id="chapterN"`) + 0114 (Spurious, multi-letter `<h2>`/`<h3>` hierarchy)**
> 6. Expand to all 134 works = **48 Augustine + 15 Gregory of Nyssa + 21 Athanasius + 3 Basil + 36 Chrysostom + 2 Gregory Nazianzen + 9 Ignatius = 1,913 HTML files**.
> 7. Bible-linking passes (priority order unchanged from prior plans).
> 8. Calendar tags:
>    - All previous Fathers
>    - **Ignatius December 20** + **Apostolic Fathers cluster** (with future Polycarp, Clement of Rome, Hermas, Barnabas corpora)
> 9. Cross-corpus links:
>    - **Apostolic Fathers cluster**: Ignatius + Polycarp + Clement of Rome + others (when those corpora are acquired)
>    - **Ignatius 0110 (To Polycarp)** ↔ **Polycarp 0102 (Martyrdom)** ↔ **Polycarp 0136 (Epistle to Philippians)**
>    - **Earliest non-canonical Christian writings** category — surface all Apostolic Fathers together
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files in any author folder
> - Phase-2 acquisition (Long Recension, Syriac fragmentary recension, Roman Acts of Ignatius's martyrdom)
> - The Polycarp corpus (already partially downloaded in adjacent folder — completes the John-disciple pair with Ignatius)
> - Clement of Rome, Hermas, Barnabas, and other Apostolic Fathers (already partially downloaded)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/ignatius/`
- Files: 9 `.html` + 9 `provenance_*.json` (+ ~9 legacy `.md` files to ignore)
- Total raw HTML: ~0.29 MB (smallest corpus to date)
- Works: 9 (entire New Advent Ignatius corpus = ANF Vol. 1 Ignatius selection)
- Largest file: `0114.html` 103 KB (Spurious Epistles — packages multiple inauthentic letters)
- Smallest file: `0110.html` 19 KB (Epistle to Polycarp)
- Multi-sub-page works: 0
- Self-contained works: 9
- Translators: **Alexander Roberts and James Donaldson** (joint authorship of ANF Vol. 1)
- Series: **Ante-Nicene Fathers (ANF)** — first ANF corpus in the library

## Appendix B — Acquisition log

`content/raw/_index/acquisition_log_phase3_20260520T211359.json` — 9 works OK, 0 errors, 9 files downloaded on 2026-05-20.

## Appendix C — Sample files inspected for this plan

- `0104.html` (Epistle to the Ephesians) — `<h2 class="chapterN">` pattern, 21 chapters + Greeting, ANF citation footer
- `0107.html` (Epistle to the Romans) — `<h2 id="chapterN">` pattern (the unique outlier among the 7 epistles)
- `0114.html` (Spurious Epistles) — multi-letter file with `<h2>` letter dividers and `<h3>` chapter markers within each letter
- `0123.html` (Martyrdom of Ignatius) — bare `<h2>Chapter N. {Title}</h2>` pattern with no class/id attributes
- `provenance_0104.json`, `provenance_0114.json` — provenance schemas
