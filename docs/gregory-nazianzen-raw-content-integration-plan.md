# Gregory Nazianzen Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Gregory Nazianzen HTML corpus downloaded from New Advent. No parser or app code has been written yet. This doc is intended as a complete brief for a separate integration chat that will build the actual ingestion pipeline.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** NPNF (Nicene and Post-Nicene Fathers), **Second Series**, Vol. 7 — Schaff & Wace eds., 1894. Public domain. **Two translators** (joint authorship of the whole volume): **Charles Gordon Browne and James Edward Swallow**. New Advent transcriptions © New Advent LLC.

> **Companion docs:**
> - [`docs/augustine-raw-content-integration-plan.md`](augustine-raw-content-integration-plan.md)
> - [`docs/gregory-of-nyssa-raw-content-integration-plan.md`](gregory-of-nyssa-raw-content-integration-plan.md)
> - [`docs/athanasius-raw-content-integration-plan.md`](athanasius-raw-content-integration-plan.md)
> - [`docs/basil-raw-content-integration-plan.md`](basil-raw-content-integration-plan.md)
> - [`docs/chrysostom-raw-content-integration-plan.md`](chrysostom-raw-content-integration-plan.md)
>
> Most HTML patterns are identical across all six corpora. This doc highlights what's special about Gregory Nazianzen: **a third regex bug discovered (alphabetic sub-page suffixes), Roman-numeral paragraph numbering instead of Arabic, and the unique Orthodox-tradition status of "the Theologian"**.

---

## 1. Where the Gregory Nazianzen files are located

All raw files live in a single directory:

```
content/raw/fathers/gregory-nazianzen/
```

Same per-author convention as the other five Fathers.

---

## 2. What files were downloaded

**Counts (in `content/raw/fathers/gregory-nazianzen/`):**

| Item | Count |
|---|---|
| `*.html` raw files (work indexes + sub-pages) | **29** |
| `provenance_<work_id>.json` files | **2** |
| Legacy `*.md` files (from earlier processing pipeline, not part of this download) | ~25 |
| **Total raw HTML size** | **~1.76 MB** |

### Third regex-bug postmortem — **NEW: alphabetic sub-page suffixes**

The original downloader regex `\d{1,3}` (post-Athanasius fix) handles **numeric** sub-page suffixes but does NOT match **alphabetic** suffixes. Gregory Nazianzen's *Letters* (3103) uses three alphabetic sub-pages — `3103a`, `3103b`, `3103c` — for its three Divisions. The initial Gregory Nazianzen download captured only the index page (TOC stub) and missed all three Division files.

**Fix applied 2026-05-20:** the regex was widened to `[a-z\d]{1,3}` (alphanumeric, case-insensitive). The three Division files were re-acquired immediately. **A retroactive scan of the other five Father corpora (Augustine, Gregory of Nyssa, Athanasius, Basil, Chrysostom) confirmed that none of them use alphabetic sub-page suffixes — Gregory Nazianzen's Letters is the only work in the patristic library affected by this convention.**

**File-naming convention** (Gregory Nazianzen-specific patterns highlighted):

| Pattern | Meaning | Example |
|---|---|---|
| `NNNN.html` (4-digit) | Work index page | `3102.html` = Orations index; `3103.html` = Letters index |
| `NNNNNN.html` (6-digit, 2-digit numeric suffix) | Sub-page of Orations (oration number) | `310240.html` = Oration 40 (Holy Baptism); `310243.html` = Oration 43 (Panegyric on Basil) |
| `NNNN<letter>.html` (5-character, alphabetic suffix) | **Sub-page of Letters (Division)** — **unique to Gregory Nazianzen** | `3103a.html`, `3103b.html`, `3103c.html` |
| `provenance_NNNN.json` | Provenance sidecar | `provenance_3102.json` |

Acquisition log (post-fix): `content/raw/_index/acquisition_log_phase1_20260520T210123.json` — 2 works OK, 0 errors, 4 new files. Initial acquisition log: `acquisition_log_phase1_20260520T205945.json` (kept for forensic reference, shows the pre-fix stub problem).

---

## 3. Major works represented

**All Gregory Nazianzen works on New Advent are present.** Like Basil, Gregory Nazianzen's New Advent corpus is small in unique works but theologically dense.

| ID | Title | Type | Sub-pages | Size | Notes |
|---|---|---|---|---|---|
| **3102** | Orations | homily | **24 select orations** (NOT all 45) | 9 KB index + 16–174 KB per oration | Includes the **Five Theological Orations** (27–31) and major festal/funeral orations |
| **3103** | Letters | letter | **3 Divisions** (alphabetic suffixes) | 7 KB index + 59–143 KB per Division | Divisions group letters by topic (Apollinarian controversy, Basil correspondence, miscellaneous) |

**Total works:** 2 (smallest unique-work count of any of the six corpora, tied conceptually with Basil's 3). **Source volume:** NPNF Series II, Vol. 7 (Browne & Swallow, 1894).

### Orations included in NPNF Vol. 7 (and thus in this corpus)

24 orations out of Gregory's surviving 45. Identified by file name suffix:

| File | Oration | Title / Significance |
|---|---|---|
| 310201 | Oration 1 | On Easter — Gregory's first sermon (Easter 362) |
| 310202 | Oration 2 | **In Defense of His Flight to Pontus** — autobiographical apologia; foundational text on the priesthood (parallel to Chrysostom's *On the Priesthood*) |
| 310203 | Oration 3 | His Apology |
| 310207 | Oration 7 | Funeral Oration on his brother Caesarius |
| 310208 | Oration 8 | Funeral Oration on his sister Gorgonia |
| 310212 | Oration 12 | To his father, on his appointment as bishop of Sasima |
| 310216 | Oration 16 | On his Father's silence during a plague of hail |
| 310218 | Oration 18 | **Funeral Oration on his father, the elder Gregory** |
| 310221 | Oration 21 | **On Athanasius** — panegyric for St. Athanasius |
| 310227 | Oration 27 | **First Theological Oration** — "Preliminary Discourse" |
| 310228 | Oration 28 | **Second Theological Oration** — "On the Doctrine of God" |
| 310229 | Oration 29 | **Third Theological Oration** — "On the Son" |
| 310230 | Oration 30 | **Fourth Theological Oration** — "On the Son" |
| 310231 | Oration 31 | **Fifth Theological Oration** — "On the Holy Spirit" |
| 310233 | Oration 33 | Against the Arians and Concerning Himself |
| 310234 | Oration 34 | On the Arrival of the Egyptians |
| 310237 | Oration 37 | On the Words of the Gospel, "When Jesus Had Finished These Sayings" (Matt 19:1) |
| 310238 | Oration 38 | **On the Theophany / Nativity** — preached on the Feast of the Birth of Christ |
| 310239 | Oration 39 | **On the Holy Lights** — preached on the Feast of Theophany |
| 310240 | Oration 40 | **On Holy Baptism** — preached on Theophany |
| 310241 | Oration 41 | **On Pentecost** |
| 310242 | Oration 42 | **The Last Farewell** — Gregory's farewell to Constantinople, 381 |
| 310243 | Oration 43 | **Panegyric on Basil the Great** — the funeral oration for his lifelong friend St. Basil |
| 310245 | Oration 45 | **The Second Oration on Easter** — its phrases are incorporated into the Orthodox Paschal Canon |

**The "Five Theological Orations" (27–31) are Gregory's most famous work** — preached in Constantinople in 380, they earned him the unique title "Theologian" (one of only three saints in Orthodox tradition called by this name; the others are John the Evangelist and Symeon the New Theologian).

**Orations 38, 39, 40, 41, 45 are festal orations** with direct Orthodox liturgical resonance (Christmas, Theophany, Pascha, Pentecost).

### Letters Divisions (3103a, 3103b, 3103c)

| File | Division | Contents |
|---|---|---|
| 3103a | Division I | Letters on the Apollinarian Controversy (2 letters to Cledonius + letters to Nectarius and Olympius) |
| 3103b | Division II | Correspondence with St. Basil the Great |
| 3103c | Division III | Miscellaneous letters |

Each Division HTML file packages multiple individual letters with `<h2>To {Recipient} (Ep. {Number})</h2>` headings as section markers.

### Notable absences from this corpus

Many of Gregory's most important works are **NOT** on New Advent (NPNF Vol. 7 is a select Orations + Letters volume):

- **Orations 4–5** = Invectives Against Julian the Apostate. Politically/historically important; the longest of Gregory's orations.
- **Orations 6, 9, 10, 11, 13, 14, 15** = Various pastoral and theological orations. **Oration 14** ("On the Love of the Poor") is a foundational Christian-social-ethics text.
- **Orations 17, 19, 20, 22–26** = Various
- **Orations 32, 35, 36, 44** = Various (Oration 44 on New Sunday is liturgically significant)
- **All of Gregory's POEMS** — he wrote ~17,000 lines of poetry. **The single largest body of poetry from any Father.** Not in NPNF.
- **De Vita Sua (Autobiographical Poem)** — 1,949 lines, his most personal text. Not in NPNF.
- **Carmina Moralia, Theologica, Historica** (his three major poem collections). Not in NPNF.

Phase-2 acquisition recommended for:
- Brian Daley, *Gregory of Nazianzus* (Routledge, 2006) — selected orations and poems
- Caroline White, *Gregory of Nazianzus: Autobiographical Poems* (Cambridge)
- Frederick Norris, *Faith Gives Fullness to Reasoning: The Five Theological Orations of Gregory Nazianzen* (Brill)
- St. Vladimir's Seminary Press: *On God and Christ: The Five Theological Orations and Two Letters to Cledonius* (modern translation alternative to NPNF)
- Migne PG 35–38 (Greek+Latin, public domain)

---

## 4. How the files are structured internally

Identical shell to the other five corpora:

- `<head>` with title, canonical link, `screen6.css`
- Shared header (logo, search, A–Z encyclopedia bar) — junk
- `<div id="mi5">` breadcrumbs
- **`<div id="springfield2">`** main content wrapper (present in **all 29 files**)
- `<h1>` title, Gumroad banner
- Main body
- **`<div class="pub">`** citation footer with `id="src*"` spans (present in **all 29 files**)
- Footer + Cloudflare beacon

The two invariants — `#springfield2` and `id="srctrans"` — hold across the entire corpus.

---

## 5. One file per work? Per section?

### Multi-sub-page works (2 of 2)

| Work | Sub-pages | Suffix style |
|---|---|---|
| **3102 Orations** | 24 | 2-digit numeric (310201, 310202, ..., 310245 — not contiguous; gaps reflect NPNF's selection) |
| **3103 Letters** | 3 | **alphabetic** (3103a, 3103b, 3103c) — **unique pattern in the patristic library** |

Both works are TOC-only at the index; all content lives in sub-pages. **No self-contained large works** in the Gregory Nazianzen corpus.

---

## 6. HTML patterns inside content pages

Patterns are mostly identical to the other corpora. Gregory Nazianzen-specific notes below.

### 6.1 Index/TOC pages

**3102 Orations index** — line-broken anchor list with descriptive tags (e.g., "Or. 27 — First Theological Oration").

**3103 Letters index** — three-Division line-broken anchor list:

```html
<p>
  <a href="../fathers/3103a.htm"><strong>Division I</strong></a> Letters on the Apollinarian controversy
  <br><a href="../fathers/3103b.htm"><strong>Division II</strong></a> Correspondence with St. Basil the Great
  <br><a href="../fathers/3103c.htm"><strong>Division III</strong></a> Miscellaneous letters
</p>
```

### 6.2 Oration content sub-pages

Each oration sub-page follows a consistent structure:

```html
<h1>Oration N</h1>
<p>...Gumroad banner...</p>

<p><strong>{Subtitle/topic of the oration}</strong></p>          <!-- e.g., "The Oration on Holy Baptism." -->
<p><span class="stiki">{Context/date note}</span></p>            <!-- e.g., "Preached at Constantinople Jan. 6, 381..." -->

<p>I. {body text} ...</p>                                         <!-- Roman-numeral paragraph numbering! -->
<p>II. {body text} ...</p>
<p>III. {body text} ...</p>
...
```

**Two notable Gregory Nazianzen-specific quirks:**

1. **Roman-numeral paragraph numbering** (`I.`, `II.`, `III.`, ..., `XXIV.`) instead of Arabic numerals like Augustine/Basil/Chrysostom. The paragraph-number parser must handle both.
2. **`<span class="stiki">` is used for non-Bible content** — specifically for date/context notes immediately after the subtitle. For example, in Oration 40:
   ```html
   <p><span class="stiki">Preached at Constantinople Jan. 6, 381, being the day following the delivery of that on the Holy Lights.</span></p>
   ```
   This is **not a Bible reference** — it's an editorial date note. The Bible-reference extractor must filter `stiki` spans by checking whether they contain an `<a href="../bible/...">` anchor (real Bible refs do; date notes don't).

### 6.3 Letters content sub-pages — **multi-letter packages**

Each Letters Division file (3103a, 3103b, 3103c) packages **multiple individual letters** with section markers:

```html
<h1>Letters (Division I)</h1>
<p><strong>Letters on the Apollinarian Controversy.</strong></p>

<h2>Introduction</h2>
<p>The circumstances which called forth the two letters to Cledonius...</p>

<h2>To Nectarius, Bishop of Constantinople. (Ep. CCII.)</h2>
<p>{letter body}...</p>

<h2>To Olympius. (Ep. CCXXXI.)</h2>
<p>{letter body}...</p>

<h2>To Cledonius the Priest Against Apollinarius. (Ep. CI.)</h2>
<p>{letter body}...</p>

...
```

**This is structurally similar to Athanasius's 1903 *Two Letters to Theodore***, which also packages two letters into a single HTML file with `<h2>Letter N</h2>` markers. The parser should chunk on `<h2>` to produce individual Letter WorkSection rows.

Each `<h2>` typically includes:
- The recipient name
- The traditional Roman-numeral letter number in parentheses (e.g., `(Ep. CCII.)` = Epistle 202)

The parser should extract:
- Recipient name from the `<h2>` text
- Traditional letter number (Roman numeral) from the parenthetical

This produces ~30–50 individual Letter WorkSection rows across the three Divisions (exact count requires inspecting each Division file).

### 6.4 Scripture references — `<span class="stiki">`

Same format as other corpora **WHEN containing a Bible link**:

```html
<span class="stiki" id="note314012"><a href="../bible/gen002.htm#verse7">Genesis&nbsp;2:7</a></span>
```

**BUT** Gregory Nazianzen also uses `<span class="stiki">` for **date/context notes** (no Bible link inside). The extractor must filter:

```python
for span in soup.select("span.stiki"):
    bible_link = span.find("a", href=re.compile(r"\.\./bible/"))
    if bible_link:
        # Real Bible reference
        yield parse_bible_ref(bible_link)
    # else: skip — it's a date/context note
```

### 6.5 Citation footer

Identical layout. **Every Gregory Nazianzen file is NPNF Series II Vol. 7, Schaff & Wace eds., 1894.** Translators: **Charles Gordon Browne and James Edward Swallow** (joint authorship of the entire volume — a two-translator monoculture comparable to Basil's Jackson monoculture).

---

## 7. How clean is the HTML?

Same level as the other five corpora. **Three Gregory Nazianzen-specific edge cases:**

1. **Alphabetic sub-page suffixes** (3103a/b/c) — required a regex widening (now applied).
2. **Roman-numeral paragraph numbering** — different from Arabic-numeral convention used by Augustine, Basil, Chrysostom, etc.
3. **`<span class="stiki">` overload** — used for both Bible references AND editorial date notes. Bible-ref extractor must filter on the presence of a `<a href="../bible/...">` child link.

Otherwise: the HTML is uniformly clean, citation footer is consistent, Browne-Swallow translation is dignified Victorian English.

---

## 8. Extractable metadata

| Field | Source | Gregory Nazianzen example |
|---|---|---|
| Author | Folder + `<title>` parenthetical | `Gregory of Nazianzus` (also: `Gregory Nazianzen`, `Gregory the Theologian`) |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `3102`, `3103` |
| Work title | `<h1>` of index or self-contained file | `Orations`, `Letters` |
| Section ID | Filename suffix | `01`–`45` (orations), `a`/`b`/`c` (Letters Divisions) |
| Section title | `<h1>` of sub-page | `Oration 40`, `Letters (Division I)` |
| **Oration subtitle/topic** | `<p><strong>{text}</strong></p>` immediately after `<h1>` | `The Oration on Holy Baptism.` |
| **Oration context note** | `<p><span class="stiki">{text}</span></p>` (without Bible link) | `Preached at Constantinople Jan. 6, 381, being the day following the delivery of that on the Holy Lights.` |
| Paragraph number | Leading Roman numeral in `<p>` body | `I`, `II`, `III`, ..., `XXIV` |
| **Letter recipient** (within Division files) | `<h2>To {recipient}. (Ep. {RomanNumeral}.)</h2>` | `Nectarius, Bishop of Constantinople` |
| **Letter traditional number** | Roman numeral in `<h2>` parenthetical | `CCII` (= Epistle 202) |
| Source URL | `<link rel="canonical">` or provenance JSON | `https://www.newadvent.org/fathers/3102.htm` |
| Translator | `<span id="srctrans">` | `Translated by Charles Gordon Browne and James Edward Swallow.` (uniform across corpus) |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, Second Series` |
| Volume | `<span id="srcvolume">` | `Vol. 7.` |
| Editor | `<span id="srced">` | `Edited by Philip Schaff and Henry Wace.` |
| Year | `<span id="srcyear">` | `1894.` |
| Bible references | `<span class="stiki">` blocks **with** Bible `<a>` children | (date notes without Bible links are excluded) |

---

## 9. Normalization to Theosis library records

Mirrors the schemas in the companion docs. Gregory Nazianzen specifics:

### Person

```ts
Person {
  id:          "person.gregory-of-nazianzus"
  display:     "Gregory of Nazianzus"
  also_known:  ["Gregory Nazianzen", "Gregory the Theologian", "Gregorius Theologus", "St. Gregory the Theologian"]
  born:        c. 329
  died:        389/390
  feast_day:   "01-25"      // Orthodox calendar: January 25
  feast_alt:   "01-30"      // Three Holy Hierarchs joint feast
  tradition:   "Archbishop of Constantinople (briefly, 381); second of the Three Cappadocian Fathers; lifelong friend of St. Basil; one of only three saints called 'the Theologian' in the Orthodox tradition (with John the Evangelist and Symeon the New Theologian)"
  see:         "Nazianzus (Cappadocia); briefly Constantinople (381)"
  relations:   {
    friend_of: "person.basil-the-great",
    father:    "person.gregory-the-elder"   // his father, also a saint
  }
  ecumenical_role: "Presided briefly over the First Council of Constantinople (381); architect of the doctrine of the Holy Spirit alongside Basil and Gregory of Nyssa; defender of Nicene orthodoxy against Arians and Apollinarians"
  epithet:     "the Theologian (ho Theologos)"
}
```

**Orthodox significance:**
- One of the **Three Holy Hierarchs** (with Basil and John Chrysostom; joint feast January 30)
- One of the **Four Great Doctors of the Eastern Church** (with Athanasius, Basil, John Chrysostom)
- **Called "the Theologian"** — one of only three saints with this title in the Orthodox tradition. The title was bestowed because of his Five Theological Orations (27–31).
- His **Paschal phrases** (from Oration 45 "The Second Oration on Easter") are incorporated into the **Orthodox Paschal Canon** by St. John of Damascus — every Pascha in every Orthodox church for over a thousand years, Gregory's words have been chanted.
- Author of **Christos paschei** (a tragedy attributed to him), used in the Holy Friday services in some traditions.

### Work

2 rows total — tied with Basil as smallest unique-work count.

```ts
Work {
  id:               "work.gregory-nazianzen.3102"
  author_id:        "person.gregory-of-nazianzus"
  title:            "Orations"
  alt_titles:       ["Selected Orations", "Λόγοι"]
  work_type:        "homily"
  composition_date: "c. 362-389 (various)"
  language_original:"Greek"
  has_subsections:  true
  section_count:    24   // select orations only (NPNF Vol. 7 selection)
  source_id:        "src.newadvent.3102"
  description:      "24 select orations from Gregory's surviving 45, including the famous Five Theological Orations (27-31)"
}
```

### WorkSection

For Gregory Nazianzen, **two levels** of granularity matter:

- **Orations** (3102): one WorkSection per oration sub-page → 24 rows. Each WorkSection's `display_title` = oration's subtitle (e.g., "The Oration on Holy Baptism").
- **Letters** (3103): two-tier modeling:
  - Option A: one WorkSection per Division file (3 rows: 3103a, 3103b, 3103c) — coarse
  - Option B: one WorkSection per individual letter inside each Division (parsed from `<h2>To {recipient}</h2>` markers) → estimated ~30–50 rows

**Recommendation: Option B for Letters** — readers expect to navigate by individual letter (e.g., "Letter to Nectarius") not by Division. The parser should chunk Division files on `<h2>` to produce individual Letter WorkSection rows with `recipient` and `traditional_number` (Roman numeral) fields.

```ts
WorkSection {
  id:              "section.gregory-nazianzen.3102.40"
  work_id:         "work.gregory-nazianzen.3102"
  order_index:     20   // 20th oration in NPNF Vol. 7's selection (Oration 40)
  oration_number:  40   // traditional Oration numbering
  section_type:    "oration"
  short_label:     "Oration 40"
  display_title:   "On Holy Baptism"           // extracted from <p><strong>...</strong></p>
  context_note:    "Preached at Constantinople Jan. 6, 381..."  // extracted from <span class="stiki"> without Bible link
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.3102"
  bible_refs:      BibleRef[]
}

WorkSection {  // example individual letter from 3103a Division I
  id:              "section.gregory-nazianzen.3103.ep202"
  work_id:         "work.gregory-nazianzen.3103"
  order_index:     1
  letter_number:   "CCII"                       // Roman numeral from <h2> parenthetical
  letter_number_arabic: 202
  section_type:    "letter"
  recipient:       "Nectarius, Bishop of Constantinople"
  division:        "Division I (Apollinarian Controversy)"
  short_label:     "Letter to Nectarius (Ep. 202)"
  display_title:   "To Nectarius, Bishop of Constantinople"
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.3103"
  bible_refs:      BibleRef[]
}
```

### SourceRecord

```ts
SourceRecord {
  id:              "src.newadvent.3102"
  work_id:         "work.gregory-nazianzen.3102"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/3102.htm"
  translator:      "Charles Gordon Browne and James Edward Swallow"
  series:          "Nicene and Post-Nicene Fathers, Second Series"
  volume:          "Vol. 7"
  editor:          "Philip Schaff and Henry Wace"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1894
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/gregory-nazianzen/3102.html"
  provenance_json: "content/raw/fathers/gregory-nazianzen/provenance_3102.json"
}
```

Both works share the same bibliographic data → can share a `BibliographicEdition` row referenced from 2 SourceRecords.

---

## 10. Bible-linking strategy

Gregory Nazianzen is **theological-festal**, not exegetical. His orations are dogmatic/rhetorical, anchored to themes rather than verse-by-verse expositions. Bible-linking opportunities:

### 10.1 No verse-commentary works

Unlike Chrysostom's NT homilies or Basil's Hexaemeron, Gregory's orations are **not structured around expounding specific verses**. **No head-verse linking is mechanically extractable** from the HTML.

### 10.2 Inline scripture refs

Extract all `<span class="stiki">` blocks that **contain a Bible link** as `BibleRef` rows. Filter out date/context notes (see §6.4). Density is moderate-to-high in theological orations (Oration 40 sample shows 5–10 refs per chapter).

### 10.3 Thematic Bible-linking — the high-value editorial layer

Gregory's orations are deeply thematic. **Hand-curated thematic tags are the most useful Bible-linking output for this corpus:**

| Oration | Anchor passages |
|---|---|
| **Oration 27–31 (Five Theological Orations)** | John 1:1–18 (Logos), John 14–16 (Trinitarian relations), Matt 28:19, Phil 2:5–11, Heb 1, Prov 8:22–31 (the Arian proof-text Gregory re-interprets), Rom 11:33–36 (the apophatic) |
| **Oration 38 (On Theophany / Nativity)** | Luke 2 (Nativity narrative), Matt 1–2, Isaiah 9:6 ("a child is born"), John 1:14 |
| **Oration 39 (On the Holy Lights)** | Matt 3:13–17 (Baptism of Christ), John 1:29–34, Isaiah 60 |
| **Oration 40 (On Holy Baptism)** | Matt 28:19 (Trinitarian baptismal formula), John 3:5 ("born of water and Spirit"), Romans 6:3–4 (baptismal death-and-resurrection), Titus 3:5, Acts 2:38, Gal 3:27, Eph 4:5 |
| **Oration 41 (On Pentecost)** | Acts 2 (Pentecost narrative), John 14:16–17, John 16:7–15, Joel 2:28–32, 1 Cor 12 |
| **Oration 45 (Second Oration on Easter)** | Pascha narrative — Matt 27–28, Mark 15–16, Luke 23–24, John 19–21, Hebrews 9–10, 1 Cor 15 |
| **Oration 43 (Panegyric on Basil)** | Biographical — fewer verse anchors |
| **Oration 1 (On Easter)** | Pascha — Matt 27–28 etc. |
| **Oration 2 (In Defense of His Flight)** | 1 Tim 3, Titus 1, Ezekiel 33 (priesthood texts), Romans 1–2 |

This produces **~50 thematic Bible-linking entries** across the orations.

### 10.4 Lectionary linking — Orthodox calendar

This is where Gregory Nazianzen is **exceptionally** valuable:

- **January 25 (Feast of St. Gregory the Theologian)** — surface entire corpus.
- **January 30 (Three Holy Hierarchs)** — joint feast with Basil and Chrysostom.
- **Christmas/Nativity (Dec 25)** — **Oration 38** is THE Nativity oration in patristic literature.
- **Theophany (Jan 6)** — **Oration 39** ("On the Holy Lights") and **Oration 40** ("On Holy Baptism") are THE Theophany orations.
- **Pascha (Easter)** — **Oration 1** and **Oration 45** are Paschal orations. **Oration 45 has phrases incorporated into the Orthodox Paschal Canon** — every Orthodox Pascha includes Gregory's words sung in the Paschal Matins canon (work by St. John of Damascus, who paraphrased Gregory). This is a direct liturgical link.
- **Pentecost** — **Oration 41** is THE Pentecost oration.
- **Athanasius's feast (May 2 or Jan 18)** — **Oration 21** is the panegyric on Athanasius.
- **Basil's feast (Jan 1)** — **Oration 43** is the funeral panegyric on Basil.

### 10.5 Pascha Canon cross-reference (UNIQUE)

**Oration 45** by Gregory is the source for several phrases in the **Orthodox Paschal Canon** (sung at Pascha Matins):

- "It is the Day of Resurrection, let us be illumined, O peoples..." (Ode 1 of the Canon) — paraphrased from Oration 45 §1
- Several other Paschal Canon stanzas paraphrase Gregory's Oration 45

The integration could surface Oration 45 specifically during the Paschal season as **"the source of the Paschal Canon"** — a powerful Orthodox-tradition feature.

### 10.6 Recommended Bible-linking pass order

1. **Pass 1 — Inline `stiki` extraction (with filter for non-Bible date notes)**: produces ~500–1000 BibleRef rows.
2. **Pass 2 — Thematic mapping**: ~50 hand-curated entries (§10.3).
3. **Pass 3 — Calendar mapping**: feast days + festal orations alignment (§10.4).
4. **Pass 4 — Paschal Canon cross-reference**: explicit "source of the Paschal Canon" tag for Oration 45.

---

## 11. Which Gregory Nazianzen works are most useful for the Theosis library

In a 2-work corpus, both works are essential. Ranking individual sub-units:

| Rank | Sub-unit | Why it's valuable |
|---|---|---|
| 1 | **Orations 27–31 (Five Theological Orations)** | Gregory's most famous work; earned him the title "Theologian"; foundational Orthodox Trinitarian theology |
| 2 | **Oration 38 (On Theophany / Nativity)** | THE Patristic Nativity oration; Christmas reading |
| 3 | **Oration 40 (On Holy Baptism)** | THE Patristic Baptism oration; baptismal preparation reading |
| 4 | **Oration 45 (Second Oration on Easter)** | Source of the Orthodox Paschal Canon; THE Pascha reading |
| 5 | **Oration 39 (On the Holy Lights)** | Theophany reading |
| 6 | **Oration 41 (On Pentecost)** | Pentecost reading |
| 7 | **Oration 43 (Panegyric on Basil)** | One of the great patristic friendship/biographical texts; reading for Basil's feast |
| 8 | **Oration 2 (In Defense of His Flight to Pontus)** | Foundational text on the priesthood; pairs with Chrysostom's *On the Priesthood* and pre-dates it |
| 9 | **Letters Division II (Correspondence with Basil)** | Window into the Cappadocian friendship; biographical and pastoral |
| 10 | **Letters Division I (Letters to Cledonius — Apollinarian controversy)** | Critical Christological texts; "What was not assumed is not healed" (Letter 101 to Cledonius) is one of the most quoted Patristic Christological maxims |

---

## 12. Which Gregory Nazianzen works are mostly general library texts

- **Orations 7, 8, 12, 16, 18** — personal/family funeral orations and pastoral sermons. Beautiful but personal; less central than the Theological/Festal orations.
- **Oration 33, 34** — anti-Arian polemic. Theologically important but less accessible than the Five Theological Orations.
- **Letters Division III (Miscellaneous letters)** — pastoral and personal correspondence; episodic value.

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module covers ~95% of Gregory Nazianzen. Specific additions:

### 13.1 Roman-numeral paragraph numbering

Add Roman-numeral support to the paragraph-number extractor:

```python
ROMAN_NUMERAL = re.compile(r'^([IVXLCDM]+)\.\s+(.+)', re.DOTALL)
ARABIC_NUMERAL = re.compile(r'^(\d+)\.\s+(.+)', re.DOTALL)

def parse_paragraph_number(p_text: str) -> tuple[int | None, str]:
    """Return (paragraph_number, body_text). Supports Arabic AND Roman numerals."""
    # Try Arabic first (more common)
    m = ARABIC_NUMERAL.match(p_text.strip())
    if m:
        return int(m.group(1)), m.group(2)
    # Try Roman
    m = ROMAN_NUMERAL.match(p_text.strip())
    if m:
        return roman_to_int(m.group(1)), m.group(2)
    return None, p_text

def roman_to_int(s: str) -> int:
    values = {'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
    total = 0
    prev = 0
    for ch in reversed(s.upper()):
        v = values[ch]
        total += v if v >= prev else -v
        prev = v
    return total
```

Apply this for Gregory Nazianzen oration files. (Other corpora continue using Arabic; the helper auto-detects.)

### 13.2 `stiki` filter for non-Bible content

The Bible-reference extractor must skip `<span class="stiki">` blocks that don't contain a Bible link:

```python
def extract_bible_refs(soup):
    for span in soup.select("span.stiki"):
        bible_link = span.find("a", href=re.compile(r"^\.\./bible/"))
        if not bible_link:
            continue  # Skip — this is a date/context note, not a Bible ref
        yield parse_bible_ref(bible_link)
```

This filter is **safe for all corpora** — Augustine/Basil/etc. always have a Bible link inside their `stiki` spans, so they're unaffected.

### 13.3 Oration subtitle extraction

Each oration sub-page has its title in `<h1>` and its **subtitle** (topic) in the first `<p><strong>...</strong></p>` after the Gumroad banner. Extract this for the WorkSection's `display_title`:

```python
def extract_oration_subtitle(soup):
    """For Gregory Nazianzen orations, extract the topic subtitle."""
    content = soup.select_one("#springfield2")
    if not content:
        return None
    h1 = content.select_one("h1")
    if not h1:
        return None
    # Walk forward to find <p><strong>...</strong></p>
    for elem in h1.next_siblings:
        if elem.name == "p":
            strong = elem.find("strong")
            if strong and not elem.find("a", href=re.compile(r"gumroad")):
                # Found subtitle (and it's not the Gumroad banner)
                return strong.get_text(strip=True).rstrip(".")
    return None
```

### 13.4 Letters Division chunking

Each Letters Division file (3103a, 3103b, 3103c) packages multiple letters. The parser must:

1. Read the Division file
2. Split on `<h2>` headings to produce individual letter records
3. Skip `<h2>Introduction</h2>` headings (preamble, not a letter)
4. Parse each `<h2>To {recipient}. (Ep. {RomanNumeral}.)</h2>` for recipient + traditional letter number

```python
def parse_letters_division(soup, division_label):
    """Yield individual letter records from a Division file."""
    content = soup.select_one("#springfield2")

    letters = []
    current_letter = None
    for elem in content.children:
        if elem.name == "h2":
            heading_text = elem.get_text(strip=True)
            if heading_text.startswith("Introduction"):
                continue  # Skip Division introduction
            # Parse "To X. (Ep. NNN.)" pattern
            m = re.match(r"To\s+(.+?)\.\s*\(Ep\.\s*([IVXLCDM]+)\.\)", heading_text)
            if m:
                recipient = m.group(1)
                letter_number_roman = m.group(2)
                letter_number_arabic = roman_to_int(letter_number_roman)
                if current_letter:
                    letters.append(current_letter)
                current_letter = {
                    "recipient": recipient,
                    "letter_number_roman": letter_number_roman,
                    "letter_number_arabic": letter_number_arabic,
                    "division": division_label,
                    "body_paragraphs": [],
                }
        elif elem.name == "p" and current_letter:
            current_letter["body_paragraphs"].append(elem)

    if current_letter:
        letters.append(current_letter)

    return letters
```

### 13.5 Iteration order

Drive from `provenance_*.json` files. For Letters specifically, the `subpages` array contains `["3103a", "3103b", "3103c"]` and each sub-page yields multiple letter records via the Division chunker (§13.4).

---

## 14. Risks, edge cases, cleanup issues

### 14.1 The alphabetic-suffix regex bug — FIXED

The downloader regex was `\d{1,3}` (post-Athanasius fix) and missed alphabetic sub-page suffixes. **Fixed 2026-05-20** to `[a-z\d]{1,3}`. Verified no other corpus is affected.

### 14.2 Roman-numeral paragraph numbering

Unique to Gregory Nazianzen among the six corpora. Parser must handle.

### 14.3 `<span class="stiki">` for editorial date notes

Unique to Gregory Nazianzen. Bible-ref extractor must filter on the presence of a `<a href="../bible/...">` child.

### 14.4 Multi-letter Division files

Each `3103a/b/c.html` contains multiple individual letters separated by `<h2>` headings. The parser must chunk to produce per-letter WorkSection rows.

### 14.5 Roman-numeral letter numbers

Letters use Roman numerals like "Ep. CCII" (= 202). Convert to Arabic for sorting/lookup, but preserve Roman in display.

### 14.6 Selective NPNF oration set

Only 24 of Gregory's 45 surviving orations are in this corpus. The gap is intentional — NPNF Vol. 7's selection. The `subpages[]` array in the provenance JSON has gaps in the oration numbering (e.g., 1, 2, 3, 7, 8, 12, ...). **Iterate the JSON literally; don't try to predict sequential oration numbers.**

### 14.7 Paschal Canon cross-reference

Oration 45 is the source of phrases in the Orthodox Paschal Canon. This deserves a special editorial tag in the WorkSection. **Hand-curated, not extractable from HTML.**

### 14.8 LXX vs MT versification

Same risk as all other Greek Fathers. Confirm Theosis Psalter scheme is LXX.

### 14.9 Cappadocian cross-references

Gregory Nazianzen's corpus has deep cross-references with **Basil** (3201/3202/3203) and **Gregory of Nyssa** (2901–2915):
- Letters Division II = correspondence with Basil
- Oration 43 = funeral oration for Basil
- Oration 21 = panegyric on Athanasius
- The Five Theological Orations build on Basil's *De Spiritu Sancto*

These cross-references should drive a future patristic-citation-graph feature.

### 14.10 Compute scale

29 files × ~60 KB avg = trivial. Smallest of the six corpora.

---

## 15. Recommended next step for a separate integration chat

> **"Build the six-Father patristic ingestion pipeline."**
>
> 1. Read all six planning docs (Augustine, Gregory of Nyssa, Athanasius, Basil, Chrysostom, Gregory Nazianzen).
> 2. Read the Theosis library schema; confirm or amend Person/Work/WorkSection/SourceRecord/BibleRef shapes.
> 3. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py` (with `[a-z\d]{1,3}` regex).
> 4. Confirm Psalter versification (LXX vs MT) with the user.
> 5. Build `scripts/parse_newadvent/` as a shared module. Test on **six end-to-end cases** (one per Father):
>    - Augustine **1101** (Confessions)
>    - Gregory of Nyssa **2914** (On the Making of Man)
>    - Athanasius **2802** + **28161**
>    - Basil **3201** + **32011** + **3203**
>    - Chrysostom **2310** + **23101** (head-verse epigraph)
>    - **Gregory Nazianzen 3102** + **310240** (Roman-numeral paragraph numbering) + **3103a** (multi-letter Division chunking)
> 6. Expand to all 125 works = **48 Augustine + 15 Gregory of Nyssa + 21 Athanasius + 3 Basil + 36 Chrysostom + 2 Gregory Nazianzen = 1904 HTML files** total:
>    - 863 Augustine
>    - 552 Chrysostom
>    - 337 Basil
>    - 78 Athanasius
>    - 45 Gregory of Nyssa
>    - **29 Gregory Nazianzen**
> 7. Bible-linking passes (in priority order):
>    - **Pass 1: Chrysostom head-verse extraction** — ~470 strong head-verse links
>    - Pass 2: Augustine head-verse linking (Tractates on John, Enarrations on Psalms)
>    - Pass 3: Basil Hexaemeron head-verse linking (9 Genesis links)
>    - Pass 4: Athanasius head-verse linking (2805)
>    - Pass 5: Mechanical `stiki` extraction across all six corpora (with non-Bible filter for Gregory Nazianzen)
>    - Pass 6: Thematic editorial tags (~250 entries total)
> 8. Calendar tags — Orthodox feast days for all six Fathers + **Three Holy Hierarchs (Jan 30)** joint feast with Basil/Gregory Nazianzen/Chrysostom + festal orations (Christmas/Theophany/Pascha/Pentecost) + Pascha Canon cross-reference for Gregory Nazianzen Oration 45.
> 9. Cross-corpus links:
>    - **Cappadocian cluster**: Basil + Gregory of Nyssa + Gregory Nazianzen (deep cross-references via Letters and Orations)
>    - **Three Holy Hierarchs cluster**: Basil + Gregory Nazianzen + Chrysostom
>    - **Friendship pair**: Basil (3202 Letters) ↔ Gregory Nazianzen (3103b Letters Division II — Correspondence with Basil)
>    - **Funeral oration cross-ref**: Gregory Nazianzen Oration 43 ↔ Basil corpus (Gregory's panegyric on Basil's death)
>    - **Athanasius cross-ref**: Gregory Nazianzen Oration 21 ↔ Athanasius corpus
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files in any author folder
> - Phase-2 acquisition (Gregory Nazianzen's poems, autobiographical works, missing orations; Chrysostom's Genesis Homilies, Paschal Homily; missing Basil ascetical works; missing Gregory of Nyssa mystical works)
> - Additional Father corpora (Cyril of Jerusalem, John of Damascus, Ephraim the Syrian — partially downloaded in adjacent folders)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/gregory-nazianzen/`
- Files: 29 `.html` + 2 `provenance_*.json` (+ ~25 legacy `.md` files to ignore)
- Total raw HTML: ~1.76 MB
- Works: 2 (entire New Advent Gregory Nazianzen corpus = NPNF Series II Vol. 7)
- Largest single file: `310243.html` 174 KB (Oration 43 — Panegyric on Basil)
- Largest Letters Division: `3103c.html` 143 KB (Division III — Miscellaneous letters)
- Multi-sub-page works: 2 (Orations: 24 sub-pages; Letters: 3 Divisions)
- Self-contained works: 0
- Translators: Browne + Swallow (joint authorship of NPNF Vol. 7)

## Appendix B — Acquisition log

Initial (pre-regex-fix) log: `acquisition_log_phase1_20260520T205945.json` — shows Letters as 1-file stub.
Final (post-fix) log: `content/raw/_index/acquisition_log_phase1_20260520T210123.json` — 2 works OK, 4 new files (Letters re-acquired with 3 Divisions).

## Appendix C — Sample files inspected for this plan

- `3102.html` (Orations index) — line-broken TOC for 24 selected orations
- `310240.html` (Oration 40 — On Holy Baptism) — Roman-numeral paragraphs, subtitle pattern, date note in `<span class="stiki">`
- `310243.html` (Oration 43 — Panegyric on Basil) — biographical/funeral oration
- `3103.html` (Letters index) — 3-Division line-broken TOC with alphabetic sub-page anchors
- `3103a.html` (Letters Division I — Apollinarian Controversy) — multi-letter file with `<h2>To {recipient}. (Ep. NNN.)</h2>` markers
- `provenance_3102.json`, `provenance_3103.json` — provenance schemas (3103's subpages array now correctly contains `["3103a", "3103b", "3103c"]`)
