# Athanasius Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Athanasius HTML corpus downloaded from New Advent. No parser or app code has been written yet. This doc is intended as a complete brief for a separate integration chat that will build the actual ingestion pipeline.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** NPNF (Nicene and Post-Nicene Fathers), **Second Series**, Vol. 4 — Schaff & Wace eds., 1892. Public domain. Translators: Archibald Robertson (lead), John Henry Newman (*Four Discourses Against the Arians*), M. Atkinson (*Historia Arianorum*, *Apologia Contra Arianos*). New Advent transcriptions © New Advent LLC.

> **Companion docs:**
> - [`docs/augustine-raw-content-integration-plan.md`](augustine-raw-content-integration-plan.md)
> - [`docs/gregory-of-nyssa-raw-content-integration-plan.md`](gregory-of-nyssa-raw-content-integration-plan.md)
>
> Most HTML patterns are identical across all three corpora — this doc highlights Athanasius-specific structural notes, the **5-digit sub-page convention** unique to this corpus, and the **regex bug discovered + fixed** during acquisition.

---

## 1. Where the Athanasius files are located

All raw files live in a single directory:

```
content/raw/fathers/athanasius/
```

Same per-author convention used for Augustine and Gregory.

---

## 2. What files were downloaded

**Counts (in `content/raw/fathers/athanasius/`):**

| Item | Count |
|---|---|
| `*.html` raw files | **78** |
| `provenance_<work_id>.json` files | **21** |
| Legacy `*.md` files (from an earlier processing pipeline, not part of this download) | ~4 |
| **Total raw HTML size** | **~3.46 MB** |

### **Important: file-naming convention is more varied than Augustine/Gregory**

Athanasius works use **three different sub-page numbering widths** depending on the work's section count:

| Pattern | Total digits | Used by |
|---|---|---|
| `NNNN.html` | 4 | Work index page OR self-contained work |
| `NNNNN.html` | **5** ← *unique to small-multi-section works* | 2808 (2 parts), 2815 (8 parts), 2816 (4 discourses) |
| `NNNNNN.html` | 6 | Older Letters numbering pattern |
| `NNNNNNN.html` | 7 | 2806 Letters (43 letters, zero-padded to 3 digits) |

**Examples:**
- `28161.html` = Four Discourses Against the Arians, Discourse 1 (5-digit, work 2816 + suffix 1)
- `28158.html` = Historia Arianorum, Part VIII (5-digit, work 2815 + suffix 8)
- `2806001.html` = Letter 1 (7-digit, work 2806 + zero-padded 001)

### Regex-bug postmortem

The original `newadvent_downloader.py` had a regex `\d{2,3}` for sub-page suffixes, which **failed to match the 1-digit suffixes used by 2808, 2815, 2816**. The first download attempt silently produced TOC-only stubs for those three works. The regex was widened to `\d{1,3}` on 2026-05-20 and the affected works were re-downloaded successfully.

> **Retroactive Augustine fix — COMPLETED 2026-05-20.** A scan found 10 affected Augustine works (`1202`, `1408`, `1409`, `1501`, `1506`, `1507`, `1508`, `1509`, `1512`, `1601`) with 35 missing sub-pages. All were re-acquired with the fixed regex. Augustine corpus is now 863 files / ~34 MB (was 828 / ~29.4 MB). See `augustine-raw-content-integration-plan.md` §14.0 for full details.

**Provenance JSON schema** is identical to Augustine and Gregory. Use these JSONs as the source of truth for sub-page order — they correctly reflect the re-downloaded state for the three affected works.

Acquisition log (final, fixed):
`content/raw/_index/acquisition_log_phase1_20260520T183932.json` — 21/21 OK, 0 errors, 78 files.

---

## 3. Major works represented

All 21 works listed in the manifest are present. The 21st (2804 "Letter on the Council of Nicaea") is a Eusebius letter included in Athanasius's collection at New Advent — the WebFetch of the index didn't surface it independently, but it was downloaded via the manifest.

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **2801** | Against the Heathen (*Contra Gentes*) | apologetic | 0 (single 172 KB page, 47 chapters internal) | First half of Athanasius's apologetic diptych |
| **2802** | On the Incarnation of the Word (*De Incarnatione*) | treatise | 0 (single 201 KB page, 57 chapters) | **The most famous Athanasian work; foundational Orthodox Christology** |
| **2803** | Deposition of Arius | creed | 0 | Synodal document |
| **2804** | Letter on the Council of Nicaea (Eusebius) | letter | 0 | Eusebius of Caesarea letter, included in NPNF Athanasius collection |
| **2805** | On Luke 10:22 (Matthew 11:27) | commentary | 0 | **The only direct Scripture commentary in this corpus** — exegesis of the "all things delivered to Me" pericope |
| **2806** | Letters | letter | **43 sub-pages** (numbered 001–064 with gaps) | Festal letters, doctrinal correspondence |
| **2807** | Circular Letter | letter | 0 | Encyclical against Arian incursion |
| **2808** | Apologia Contra Arianos (Apology Against the Arians) | apologetic | **2 sub-pages** (28081, 28082) | Long self-defense; historical record of Arian controversy |
| **2809** | De Decretis (Defense of the Nicene Definition) | treatise | 0 (single 118 KB page) | Defense of Nicaea I terminology, esp. *homoousios* |
| **2810** | De Sententia Dionysii (On the Opinion of Dionysius) | treatise | 0 | Argues Dionysius of Alexandria's orthodoxy |
| **2811** | Vita S. Antoni (Life of St. Anthony) | hagiography | 0 (single 180 KB page) | **The founding text of Christian monastic hagiography** |
| **2812** | Ad Episcopus Aegypti et Libyae | letter | 0 | To Egyptian and Libyan bishops |
| **2813** | Apologia ad Constantium | apologetic | 0 | Self-defense to Emperor Constantius |
| **2814** | Apologia de Fuga (Defense of His Flight) | apologetic | 0 | Defends his exile during Arian persecution |
| **2815** | Historia Arianorum (History of the Arians) | history | **8 sub-pages** (28151–28158) | Historical-polemical narrative of Arian persecution |
| **2816** | Four Discourses Against the Arians (*Contra Arianos*) | treatise | **4 sub-pages** (28161–28164) | **The major Athanasian anti-Arian work; Trinitarian / Christological masterpiece** |
| **2817** | De Synodis (On the Councils of Ariminum and Seleucia) | treatise | 0 (single 196 KB page) | Synodal history with Trinitarian argument |
| **2818** | Tomus ad Antiochenos | letter | 0 | Synodal letter (Council of Alexandria 362) |
| **2819** | Ad Afros Epistola Synodica | letter | 0 | Letter to African bishops |
| **2820** | Historia Acephala | history | 0 | "Headless History" — anonymous chronicle of Athanasius |
| **2821** | Statement of Faith | creed | 0 | Short doctrinal statement |

**Total works:** 21. **Source volume:** NPNF Series II, Vol. 4 (single volume covers all Athanasius on New Advent).

### Notable absences from this corpus

NPNF Vol. 4 is a fairly comprehensive Athanasius selection. The following are NOT included on New Advent (or are dispersed/incomplete):

- **Festal Letters in full** — only some are in this corpus via 2806; the complete set (39 letters) exists in critical editions
- **Letters to Serapion on the Holy Spirit** — important pneumatological treatises; arguably should be considered alongside Basil's *On the Holy Spirit*. Not in NPNF Vol. 4 standalone.
- **Letter to Epictetus** — referenced in later Christological debates (esp. Chalcedon); may be present as part of letters but worth verifying
- **Commentary on the Psalms** (fragments) — not in this corpus

For a complete Athanasius library, future acquisition from St. Vladimir's Seminary Press editions, Khaled Anatolios collections (*Athanasius*, Routledge), or Migne PG 25–28 would supplement.

---

## 4. How the files are structured internally

Identical shell to Augustine and Gregory corpora:

- `<head>` with title, canonical link, `screen6.css`
- Shared header (logo, search, A–Z encyclopedia bar) — junk
- `<div id="mi5">` breadcrumbs
- **`<div id="springfield2">`** main content wrapper (present in **all 78 files**)
- `<h1>` title, Gumroad banner
- Main body
- **`<div class="pub">`** citation footer with `id="src*"` spans (present in **all 78 files**)
- Footer + Cloudflare beacon

The two invariants — `#springfield2` and `id="srctrans"` — hold across the entire corpus.

---

## 5. One file per work? Per section? **Mostly one file per work — with three small multi-section exceptions.**

Athanasius lies between Augustine (many sub-pages per work) and Gregory of Nyssa (almost all single-page).

### Multi-sub-page works (4 of 21)

| Work | Sub-pages | Suffix style |
|---|---|---|
| **2806 Letters** | 43 | 3-digit zero-padded (`2806001`–`2806064` with gaps) |
| **2808 Apologia Contra Arianos** | 2 | **1-digit** (`28081`, `28082`) |
| **2815 Historia Arianorum** | 8 | **1-digit** (`28151`–`28158`) |
| **2816 Four Discourses Against the Arians** | 4 | **1-digit** (`28161`–`28164`) |

### Self-contained single-file works (17 of 21)

The other 17 works are delivered in a single `NNNN.html` file. Several of these are very large and contain many internal `<h2>` chapter headings:

| Work | File size | Internal structure |
|---|---|---|
| **2802 On the Incarnation** | 201 KB | 57 chapters as `<h2>N. <em>Title.</em></h2>` |
| **2817 De Synodis** | 196 KB | Many chapters as `<h2>` |
| **2811 Vita S. Antoni** | 180 KB | 94 chapters as `<h2>N.</h2>` (numbered ascetical episodes) |
| **2801 Against the Heathen** | 172 KB | 47 chapters |
| **2809 De Decretis** | 118 KB | Chapters as `<h2>` |
| **2813 Apologia ad Constantium** | 97 KB | Chapters |
| **2812 Ad Episcopus** | 94 KB | Chapters |
| **2810 De Sententia Dionysii** | 81 KB | Chapters |
| **2814 Apologia de Fuga** | 72 KB | Chapters |
| **2819 Ad Afros** | 42 KB | Short numbered sections |
| **2820 Historia Acephala** | 33 KB | Short sections |
| **2807 Circular Letter** | 30 KB | Short sections |
| **2818 Tomus ad Antiochenos** | 30 KB | Short sections |
| **2805 On Luke 10:22** | 29 KB | **`<p>§N. <em>Title</em></p>` section markers (not `<h2>`)** — unique style for this commentary |
| **2803 Deposition of Arius** | 25 KB | Short |
| **2804 Letter on Council of Nicaea** | 19 KB | Short |
| **2821 Statement of Faith** | 16 KB | Short |

**Parser heuristic** (same as Gregory's plan): for each work, parse the index page; if sub-page links exist (`href="../fathers/NNNN[X|XX|XXX].htm"`), iterate them; otherwise treat the index file as the full content and chunk by internal `<h2>` headings.

---

## 6. HTML patterns inside content pages

Patterns are mostly identical to Augustine/Gregory. Athanasius-specific notes below.

### 6.1 Index/TOC pages

Used by `2806`, `2808`, `2815`, `2816`. Style:

```html
<p>
  <a href="../fathers/28161.htm"><strong>Discourse I</strong></a>
  <br><a href="../fathers/28162.htm"><strong>Discourse II</strong></a>
  ...
</p>
```

`2815` Historia Arianorum has descriptive blurbs:

```html
<p>
  <a href="../fathers/28151.htm">PART I.</a> ARIAN PERSECUTION UNDER CONSTANTINE.
  <br><a href="../fathers/28152.htm">PART II.</a> FIRST ARIAN PERSECUTION UNDER CONSTANTIUS.
  ...
</p>
```

### 6.2 Content sub-pages and self-contained works

**Section title patterns:**

| Pattern | Example |
|---|---|
| Bare title | `<h1>On the Incarnation of the Word</h1>` (self-contained) |
| Work + section | `<h1>Discourse 1 Against the Arians</h1>` (28161) |
| Work + verse | `<h1>On Luke 10:22 and Matthew 11:27</h1>` (2805 — verse-anchored title) |

**Chapter heading styles** (4 patterns observed):

| Style | Example | Used in |
|---|---|---|
| `<h2>N. <em>Italic title.</em></h2>` (number + italic title + em-dash separator) | `<h2>1. <em>Introductory.&mdash; The subject of this treatise...</em></h2>` | 2802 *On the Incarnation* |
| `<h2>Chapter N. Title.</h2>` (Chapter + period-separated description; can be multi-sentence) | `<h2>Chapter 1. Introduction. Reason for writing; certain personsindifferent about Arianism; ...</h2>` | 28161 *Discourse 1 vs Arians* |
| `<h2>N.</h2>` (number only) | `<h2>1.</h2>` | 2811 *Vita S. Antoni* (94 numbered episodes) |
| `<p>&sect; N. <em>Title</em></p>` (section markers as `<p>`, not `<h2>`) | `<p>&sect;1. <em>This text refers not to the eternal Word but to the Incarnate.</em></p>` | 2805 *On Luke 10:22* — unique |

> **Important:** the 2805 commentary uses `<p>&sect;N.</p>` instead of `<h2>` to mark its 5 sections. The chapter-parser must accept this fallback OR explicitly treat 2805's sections as paragraphs with leading-sigil prefixes.

**Paragraph numbering:**

- 2802 *On the Incarnation* uses **dense embedded numbering**: paragraphs start with `1. ... 2. ... 3. ...` inline within the chapter body — sometimes within a single `<p>` tag the numerals appear like `<p>1. Whereas ... 2. For the more ... 3. But ...</p>`. The parser may need to split paragraphs on these inline numerals.
- 28161 *Discourse 1* uses regular `<p>1. ...</p>` per-paragraph numbering (one paragraph per number) — Augustine-style.
- *Vita S. Antoni* uses chapter-number headings as the primary structure.
- *Letters* and shorter works have unnumbered paragraphs.

### 6.3 Scripture references — `<span class="stiki">`

Same format as Augustine and Gregory:

```html
<span class="stiki" id="note281836"><a href="../bible/joh010.htm#verse30">John&nbsp;10:30</a></span>
```

**Density: 590 total occurrences across 59 content files** — higher than Gregory (233) but lower than Augustine. Reflects Athanasius's heavy scriptural argumentation against Arianism.

**Top scripture-dense files:**

| File | `stiki` count | Notes |
|---|---|---|
| 28162 *Discourse 2 vs Arians* | 65 | Christological exegesis of Prov 8:22, Phil 2, John 1 |
| 28161 *Discourse 1 vs Arians* | 48 | Anti-Arian Trinitarian texts |
| 2817 *De Synodis* | 46 | Trinitarian creed-comparison |
| 28163 *Discourse 3 vs Arians* | 45 | More Christology |
| 2811 *Vita S. Antoni* | 43 | Antony's biblical formation |
| 28164 *Discourse 4 vs Arians* | 24 | |
| 2809 *De Decretis* | 22 | Nicene defense |
| 2802 *On the Incarnation* | 20 | Christology |
| 2812 *Ad Episcopus* | 19 | |
| 28081 *Apologia Pt I* | 17 | |
| 2814 *Apologia de Fuga* | 17 | |
| 2801 *Against the Heathen* | 16 | |
| 2810 *De Sententia Dionysii* | 16 | |
| 2813 *Apologia ad Constantium* | 15 | |

**2805 *On Luke 10:22*** has only 6 `stiki` refs but they are intensely concentrated — the work is built around 4 verses (Luke 10:22, Matthew 11:27, John 16:15, and various supporting texts). Strong **head-verse linking opportunity** (see §10).

### 6.4 New CSS classes observed in Athanasius (not in Augustine/Gregory)

- **`<span class="c10">…</span>`** — appears in 2802 marking inline emphasis at the start of paragraphs (e.g., `<span class="c10">Whereas</span>` at the open of chapter 1's body). May be a typesetting hint. The parser can preserve or strip; for v1, treat as regular `<em>`-equivalent emphasis.
- **`<span class="greek">…</span>`** — used in 2805 to render Greek-script terms (e.g., `<span class="greek">τῆς οἰκονομίας</span>`). Preserve the Unicode Greek inline; the reader UI can render in a serif Greek font.

### 6.5 Citation footer

Identical layout to other corpora. **Every Athanasius file is NPNF Series II Vol. 4, Schaff & Wace eds., 1892.**

Translators observed:
- **Archibald Robertson** — primary translator for most works
- **John Henry Newman** — co-translator on *Four Discourses Against the Arians* (historically: Newman's translation from his Anglican phase, later revised by Robertson)
- **M. Atkinson** — co-translator on *Apologia Contra Arianos* and *Historia Arianorum*
- The Robertson NPNF Athanasius is the standard 19th-century English edition; superseded for some texts by Khaled Anatolios (Routledge) and Lewis Ayres in recent scholarship but still widely cited

---

## 7. How clean is the HTML?

Same level as Augustine/Gregory — **parseable with confidence**.

Athanasius-specific cleanliness notes:
- **Greek-text inclusions** (`<span class="greek">`) — Unicode-safe but the parser must preserve these for theological accuracy. Stripping them would lose meaning.
- **Inline paragraph-numbering style in 2802** (multiple numbers per `<p>`) requires special handling vs. one-number-per-paragraph in other works.
- **2805's `<p>&sect;N.</p>` section style** breaks the assumption that `<h2>` is the only chapter marker.
- **All other patterns (stiki, fisk, encyclopedia links, ads, etc.) identical to companion corpora.**

---

## 8. Extractable metadata

| Field | Source | Athanasius example |
|---|---|---|
| Author | Folder + `<title>` parenthetical | `Athanasius of Alexandria` |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `2802` |
| Work title | `<h1>` of index or self-contained file | `On the Incarnation of the Word` |
| Section ID | Filename suffix | `1` (5-digit), `61` (Discourse 1), `001` (Letter 1) |
| Section title | `<h1>` of sub-page | `Discourse 1 Against the Arians`, `Letter 1` |
| Chapter title | `<h2>` headings — multiple style variants (see §6.2) | `Chapter 1. Introduction. ...`, `1. Introductory.— Subject of this treatise.` |
| Source URL | `<link rel="canonical">` or provenance JSON | `https://www.newadvent.org/fathers/2802.htm` |
| New Advent source ID | Work ID (4-digit) | `2802` |
| Translator | `<span id="srctrans">` | `Translated by Archibald Robertson.`, `Translated by John Henry Newman and Archibald Robertson.` |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, Second Series` |
| Volume | `<span id="srcvolume">` | `Vol. 4.` |
| Editor | `<span id="srced">` | `Edited by Philip Schaff and Henry Wace.` |
| Publisher | `<span id="srcpublisher">` | `Buffalo, NY: Christian Literature Publishing Co.,` |
| Year | `<span id="srcyear">` | `1892.` |
| Bible references | `<span class="stiki">` blocks | ~590 total |
| Greek terms inline | `<span class="greek">` | Greek-script (preserve as Unicode) |
| Work type | provenance JSON `work_type` | `treatise`, `apologetic`, `letter`, `creed`, `commentary`, `hagiography`, `history` |

---

## 9. Normalization to Theosis library records

Mirrors the Augustine/Gregory schema. Athanasius specifics:

### Person

```ts
Person {
  id:          "person.athanasius-of-alexandria"
  display:     "Athanasius of Alexandria"
  also_known:  ["Athanasius the Great", "St. Athanasius", "Athanasius Magnus", "Athanasius Contra Mundum"]
  born:        c. 296
  died:        373
  feast_day:   "01-18"      // Orthodox calendar: January 18 (sometimes Jan 17 Western)
              // also May 2 (translation of relics) and as one of the
              // Three Holy Hierarchs co-celebration in some commemorations
  tradition:   "Patriarch of Alexandria; principal defender of Nicene orthodoxy; central figure of the 4th-century Arian controversy; exiled five times; called 'Father of Orthodoxy' in the East"
  see:         "Alexandria (Egypt)"
  ecumenical_role: "Champion of the homoousion at Nicaea I (325); attendee at age ~29 as deacon to Bishop Alexander"
}
```

**Orthodox significance:** Athanasius is one of the **Four Great Doctors of the Eastern Church** (with Basil, Gregory Nazianzen, John Chrysostom). His feast day (January 18) is one of the major doctor commemorations in the Orthodox calendar. He is also venerated co-jointly with Cyril of Alexandria on the same date in some traditions. His authorship of *On the Incarnation* is foundational to Orthodox Christology and the Orthodox understanding of *theosis* (his statement "He became man that we might become god" is one of the most-cited patristic passages in Orthodox theology).

### Work

One row per `provenance_NNNN.json` — **21 Athanasius works total.**

Same shape as Augustine — see companion doc §9. Several Athanasius works will have `section_count` corresponding to large `<h2>` counts inside self-contained files (e.g., *Vita S. Antoni* has 94 internal chapters; *On the Incarnation* has 57).

### WorkSection

Same Option A / Option B decision as for Gregory:

- **Option A (flat):** ~78 rows (one per HTML file).
- **Option B (deep):** ~250+ rows (one per `<h2>` chapter inside self-contained works).

**Recommendation:** Option B for Athanasius too. *Vita S. Antoni* with 94 chapters and *On the Incarnation* with 57 chapters strongly benefit from chapter-level navigation. The standard citation form is "*Incarnation* 54" or "*Vita Ant.* 16" — readers and scholars need that granularity.

### SourceRecord

```ts
SourceRecord {
  id:              "src.newadvent.2802"
  work_id:         "work.athanasius.2802"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/2802.htm"
  translator:      "Archibald Robertson"
  series:          "Nicene and Post-Nicene Fathers, Second Series"
  volume:          "Vol. 4"
  editor:          "Philip Schaff and Henry Wace"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1892
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/athanasius/2802.html"
  provenance_json: "content/raw/fathers/athanasius/provenance_2802.json"
}
```

Note: all 21 Athanasius SourceRecords share NPNF Series II Vol. 4. As with Gregory (Series II Vol. 5), this can be normalized into a shared `BibliographicEdition` row.

---

## 10. Bible-linking strategy

Athanasius is **scripturally dense but not exegetical** — he marshals Bible texts as polemical proof-texts rather than expounding them verse-by-verse.

### 10.1 Direct verse commentary

**One work qualifies:**

- **2805 On Luke 10:22 (Matthew 11:27)** — the **only direct Scripture commentary in this corpus**. The work title encodes the verse(s) being commented on. Five sections (`<p>§N.</p>`) walk through the meaning of "All things were delivered to Me by My Father." This produces a strong **head-verse link** to Luke 10:22 + Matthew 11:27 + parallel Trinitarian verses (John 16:15, John 5:22, etc.).

### 10.2 Inline scripture refs

Extract all 590 `<span class="stiki">` blocks into `BibleRef` rows. Same parsing logic as Augustine/Gregory.

```ts
BibleRef {
  id:               "bref.athanasius.28162.0001"
  work_section_id:  "section.athanasius.2816.02"   // Discourse 2
  bible_book:       "PRO"     // Proverbs
  chapter:          8
  verse_start:      22
  verse_end:        22
  display_text:     "Proverbs 8:22"
  position_in_text: 8765
  citation_type:    "direct"
  raw_anchor_url:   "../bible/pro008.htm#verse22"
}
```

### 10.3 Thematic / Christological linking

Athanasius's polemic concentrates on specific contested Bible passages. **Recommended thematic tags:**

| Work | Thematic Bible passages |
|---|---|
| **2802 On the Incarnation** | John 1:1–14, Genesis 1:26–28, Genesis 3:17–19 (the curse), Romans 5:12–21, Hebrews 2:14–17, Philippians 2:5–11 |
| **2816 Four Discourses Against the Arians** | Proverbs 8:22–31 (the central Arian proof-text Athanasius re-interprets), Hebrews 1, John 1:1, John 10:30, John 17, Philippians 2:5–11, Matthew 28:19, Colossians 1:15–20 |
| **2805 On Luke 10:22** | Luke 10:22, Matthew 11:27, John 16:15, John 5:22, John 3:35 — **strongest direct link in the corpus** |
| **2801 Against the Heathen** | Romans 1 (idolatry), Genesis 1, Wisdom of Solomon |
| **2809 De Decretis** | Hebrews 1, John 1, John 5, Proverbs 8 (the Nicene proof-texts) |
| **2811 Vita S. Antoni** | Matt 19:21 (Antony's call: "sell all you have"), Acts 4:32 (community of goods), the Psalms (Antony's prayer life), various Pauline passages on spiritual warfare (Eph 6) |
| **2817 De Synodis** | Nicene/Constantinopolitan creed-texts and supporting passages |

### 10.4 Lectionary linking — Orthodox calendar

- **Feast day January 18 (Athanasius)** — surface the entire corpus on this date with *On the Incarnation* featured.
- **Pascha cycle / Resurrection season** — *On the Incarnation* is the natural reading for Paschal preparation.
- **Christmas / Nativity** — *On the Incarnation* chapters 6–10 (on why God became man) are classic Nativity-season reading.
- **Lent / monastic seasons** — *Vita S. Antoni* fits monastic-themed reading; pairs with Cheesefare Sunday / Forgiveness Sunday.
- **Sunday of Orthodoxy (Lent 1)** — *Discourses Against the Arians* is the iconic text of Nicene victory.

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Head-verse linking for 2805** (small, but a strong unambiguous link to Luke 10:22 / Matt 11:27).
2. **Pass 2 — Inline `stiki` extraction** across all 78 files. Produces ~590 `BibleRef` rows mechanically.
3. **Pass 3 — Thematic work-level tags** (editorial, ~60 hand-curated entries covering the table in §10.3).
4. **Pass 4 — Calendar linking** for Feast of St. Athanasius (Jan 18), Christmas, Pascha, Sunday of Orthodoxy.

---

## 11. Which Athanasius works are most useful for the Theosis library

Ranked by Orthodox-tradition importance, reader-engagement, and theological centrality:

| Rank | Work | Why it's valuable |
|---|---|---|
| 1 | **2802 On the Incarnation of the Word** | **THE foundational Orthodox Christology text.** Contains "He became man that we might become god" (§54), the most-cited Athanasian formula. Essential for any Orthodox patristics library. Manageable length (~57 chapters). |
| 2 | **2811 Vita S. Antoni (Life of St. Anthony)** | Founding text of Christian monastic biography; introduced Antony to the Western world (Augustine cites it in *Confessions*). Essential Orthodox ascetic reading. |
| 3 | **2816 Four Discourses Against the Arians** | The major anti-Arian Trinitarian masterpiece. Dense but central to Orthodox dogmatic theology. |
| 4 | **2801 Against the Heathen** | Companion to 2802 (*Contra Gentes—De Incarnatione* diptych). Apologetic against paganism; less polemical, more philosophical. |
| 5 | **2805 On Luke 10:22 / Matthew 11:27** | Short Scripture commentary; the only direct verse exposition in the corpus. High Bible-linking value. |
| 6 | **2809 De Decretis (Defense of the Nicene Definition)** | Crucial historical defense of *homoousios*; key for understanding Orthodox Trinitarian terminology. |
| 7 | **2817 De Synodis** | Detailed history of 4th-century councils; theological-historical reading. |
| 8 | **2821 Statement of Faith** | Short, accessible doctrinal statement; ideal "creed-of-the-day" surfacing material. |
| 9 | **2814 Apologia de Fuga** | Biographical and pastoral; vivid window into 4th-century church politics. |
| 10 | **2807 Circular Letter** | Short encyclical; doctrinal pastoral letter. |

---

## 12. Which Athanasius works are mostly general library texts

These belong in the library but are less central / less reader-accessible:

- **2803 Deposition of Arius** — synodal document, primary-source historical interest.
- **2804 Letter on the Council of Nicaea (Eusebius)** — not Athanasius's own, but contemporary record.
- **2806 Letters** — 43 mostly festal letters; episodic, useful for liturgical-calendar features but not narrative reading.
- **2808 Apologia Contra Arianos** — long self-defense with detailed dossier of documents; scholarly value.
- **2810 De Sententia Dionysii** — narrow controversy (defending Dionysius of Alexandria's orthodoxy).
- **2812 Ad Episcopus Aegypti** — circular letter; historical-pastoral.
- **2813 Apologia ad Constantium** — defense to the emperor; biographical-historical.
- **2815 Historia Arianorum** — 8-part historical-polemical chronicle.
- **2818 Tomus ad Antiochenos** — synodal letter (Alexandria 362).
- **2819 Ad Afros** — letter to African bishops.
- **2820 Historia Acephala** — anonymous chronicle; not Athanasius's own writing strictly.

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module described in the Gregory plan (§13) handles ~95% of Athanasius. Specific additions:

### 13.1 Updated regex for sub-page discovery (already fixed)

The `extract_subpage_links()` regex in `scripts/newadvent_downloader.py` was changed from `\d{2,3}` to `\d{1,3}` on 2026-05-20 to capture 1-digit suffixes. **Same fix must be reflected in the parser** when reading TOC files:

```python
SUBPAGE_PATTERN = re.compile(
    r'/fathers/(' + re.escape(work_id) + r'\d{1,3})\.htm', re.I
)
```

### 13.2 Chapter-heading parser must support a fourth style

Add the section-marker-as-paragraph pattern for 2805:

```python
CHAPTER_PATTERNS = [
    # (existing patterns from Gregory plan §13.2)
    # New: section sigil inside <p> tag (used by 2805 On Luke 10:22)
    re.compile(r'^&sect;\s*(\d+)\.\s*(.*)', re.I),
]

def chunk_self_contained_work(soup, work_id):
    """For works without <h2> headings, look for <p>§N.</p> markers."""
    if work_id == "2805":
        # 2805 uses <p>&sect;N. <em>Title</em></p> as section markers
        ...
```

### 13.3 Inline paragraph numbering (special for 2802)

*On the Incarnation* embeds multiple numerals in a single `<p>` tag. The parser should detect this pattern and optionally split:

```python
INLINE_PARAGRAPH_SPLIT = re.compile(r'\s+(\d+)\.\s+')

def split_inline_paragraphs(p_text: str):
    """Split a paragraph that contains multiple inline-numbered sub-paragraphs."""
    parts = INLINE_PARAGRAPH_SPLIT.split(p_text)
    # parts = [first_text, num1, text1, num2, text2, ...]
    # Recombine into structured records
    ...
```

This is **optional refinement** — for v1, the parser can keep these as single-paragraph rows and surface the inline numbering at render time.

### 13.4 Greek-text preservation

Encountered in 2805:

```html
<span class="greek">τῆς οἰκονομίας</span>
```

The parser must preserve `class="greek"` (or convert to `<lang xml:lang="grc">`) so the reader UI can apply Greek typography. Do **not** strip these.

### 13.5 Iteration order — same as Gregory

Drive iteration from `provenance_*.json` files; iterate `subpages[]` for multi-sub-page works; treat 4-digit-only files as self-contained.

---

## 14. Risks, edge cases, cleanup issues

Re-read the Augustine companion doc §14 for the shared risk register. Athanasius-specific items below.

### 14.1 The 5-digit sub-page regex bug — **FIXED in this acquisition**

The original `\d{2,3}` regex missed 1-digit suffixes for 2808, 2815, 2816. **Now fixed (regex widened to `\d{1,3}`).** All 78 files verified present.

> **Retroactive Augustine fix — COMPLETED 2026-05-20.** Augustine had 10 similarly-affected works (1202, 1408, 1409, 1501, 1506, 1507, 1508, 1509, 1512, 1601) with 35 missing sub-pages. All re-acquired with the fixed regex. See `augustine-raw-content-integration-plan.md` §14.0 for details.

### 14.2 NPNF Series II Vol. 4 (not Vol. 5)

Athanasius is Vol. 4 of NPNF Series II. Gregory of Nyssa is Vol. 5. **The SourceRecord `volume` field must distinguish them** — both are "Second Series Vol. N" but they're different physical books with different translators.

### 14.3 Newman translation politics

The *Four Discourses Against the Arians* translation in NPNF is by **John Henry Newman** (later Cardinal Newman) from his Anglican phase (1844 Library of the Fathers edition), subsequently revised by Robertson. This has **occasional historical-translation issues** flagged by modern scholars. For Orthodox use, the substance is fine; if the app ever wants to surface scholarly notes, Anatolios's modern Routledge translations are more current.

### 14.4 Greek-text rendering

2805 *On Luke 10:22* (and possibly others) embeds Greek-script terms. The reader UI should:
- Render Greek in an appropriate serif font (Cardo, EB Garamond, GFS Didot)
- Preserve `class="greek"` as a semantic marker
- Not normalize away the Greek as it carries theological meaning

### 14.5 LXX vs MT versification

Same risk as for Augustine and Gregory. Athanasius cites the **Septuagint** (LXX). His Psalm citations follow LXX numbering. Should be consistent with Theosis Orthodox Psalter scheme (likely LXX).

**Note:** Athanasius's *Festal Letters* and *On the Incarnation* contain LXX-specific OT citations (Wisdom, Sirach quoted as Scripture).

### 14.6 The 2806 Letters sub-page numbering

Letters span numbers 001–064 with **gaps** (some letter numbers absent). This is intentional — not all numbered letters are extant or included in NPNF. The provenance JSON's `subpages[]` is the authoritative list (43 actually downloaded). Iterate that array, don't try to predict 001–064 sequentially.

### 14.7 The 2808/2815/2816 sub-page sub-section numbering

These works' sub-pages (`28161`, `28162`, etc.) have their **own internal `<h2>` chapter numbering** that resets per discourse. E.g., 28161 has "Chapter 1, 2, 3..." and 28162 also has "Chapter 1, 2, 3...". The combined citation form is "Discourse 1.4" or "Disc. I §4." Do NOT collapse these to a single chapter sequence — preserve discourse → chapter hierarchy.

### 14.8 Inline paragraph numbering complexity in 2802

*On the Incarnation* paragraphs contain inline numbering (`1. ... 2. ... 3. ...` within a single `<p>` tag, mid-paragraph). For v1, treat each `<p>` as one paragraph; for v2, split on inline numerals. The canonical citation form *Incarnation* 54.1, 54.2 etc. relies on this sub-numbering — important for academic-precision lookups.

### 14.9 Athanasian Creed NOT in this corpus

The **"Athanasian Creed"** (*Quicunque vult*) is traditionally attributed to Athanasius but is now known to be a Western text from c. 5th century. It is **NOT in this corpus** and historically Athanasius did not write it. The Orthodox tradition does not use this creed liturgically (Western only). If the app surfaces "Athanasian creeds," distinguish *Statement of Faith* (2821, genuinely Athanasian) from the *Quicunque*.

### 14.10 Volume / compute scale

78 files × ~44 KB avg = trivial. Like Gregory.

---

## 15. Recommended next step for a separate integration chat

> **"Build the patristic ingestion pipeline for Augustine, Gregory of Nyssa, and Athanasius."**
>
> 1. Read all three planning docs (Augustine, Gregory of Nyssa, Athanasius).
> 2. Read the Theosis library schema; confirm or amend Person/Work/WorkSection/SourceRecord/BibleRef shapes.
> 4. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py`.
> 5. Confirm Psalter versification (LXX vs MT) with the user.
> 6. Build `scripts/parse_newadvent/` as a shared module. Test on **three end-to-end cases**:
>    - Augustine **1101** (Confessions) — index + 13 sub-pages
>    - Gregory **2914** (On the Making of Man) — self-contained with 30 internal chapters
>    - Athanasius **2802** (On the Incarnation) + **28161** (Discourse 1 vs Arians) — exercises 4-digit self-contained + 5-digit sub-page + inline-numbered paragraphs + Greek text
> 7. Expand to all 84 works = **48 Augustine + 15 Gregory + 21 Athanasius = 951+ HTML files** (final count pending Augustine re-acquisition).
> 8. Bible-linking passes:
>    - Mechanical `stiki` extraction across all three corpora.
>    - Augustine head-verse linking (Tractates on John, Enarrations on Psalms, etc.).
>    - Athanasius head-verse linking for 2805.
>    - Thematic editorial tags for all three (~150 hand-curated entries).
> 9. Calendar tags: Athanasius (Jan 18), Three Holy Hierarchs (Jan 30), Sunday of Orthodoxy (Lent 1), Theophany (Jan 6), Christmas, Pascha cycle.
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files in any author folder
> - Phase-2 acquisition (missing Gregory mystical works, Athanasius's *Letters to Serapion*, missing Augustine letters, etc.)
> - The Basil and Gregory Nazianzen corpora (already partially downloaded in adjacent folders; complete the Cappadocian set)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/athanasius/`
- Files: 78 `.html` + 21 `provenance_*.json` (+ ~4 legacy `.md` files to ignore)
- Total raw HTML: ~3.46 MB
- Works: 21 (entire New Advent Athanasius corpus = NPNF Series II Vol. 4)
- Largest single file: `28162.html` 258 KB (Discourse 2 Against the Arians)
- Smallest content file: `2808.html` 7.2 KB (TOC index for Apologia, content is in sub-pages 28081/28082)
- Multi-sub-page works: 4 (Letters: 43 sub-pages; Apologia: 2; Historia Arianorum: 8; Four Discourses: 4)
- Self-contained works: 17

## Appendix B — Acquisition log

Final, post-regex-fix log:
`content/raw/_index/acquisition_log_phase1_20260520T183932.json`
(21 works OK, 0 errors, 78 files downloaded on 2026-05-20.)

A pre-fix log also exists at `acquisition_log_phase1_20260520T183612.json` showing the stub problem before the regex was widened — kept for forensic reference.

## Appendix C — Sample files inspected for this plan

- `2801.html` (Against the Heathen) — large self-contained, 47 internal chapters
- `2802.html` (On the Incarnation) — large self-contained, 57 chapters, inline-numbered paragraphs
- `2805.html` (On Luke 10:22 / Matt 11:27) — short Scripture commentary; `<p>§N.</p>` section markers; Greek text inline
- `2808.html` (Apologia Contra Arianos index) — TOC pointing to 2 sub-pages with 5-digit suffixes
- `2811.html` (Vita S. Antoni) — single 180 KB hagiography, 94 numbered chapters
- `2815.html` (Historia Arianorum index) — TOC with 8 parts using descriptive blurbs
- `2816.html` (Four Discourses index) — TOC with 4 discourses
- `28161.html` (Discourse 1 Against the Arians, 216 KB) — major Trinitarian text; `<h2>Chapter N. Title.</h2>` style; very dense `stiki` refs
- `2821.html` (Statement of Faith) — short doctrinal statement
- `2806001.html` (Letter 1) — Festal letter sub-page; 7-digit ID
- `provenance_2801.json`, `provenance_2806.json`, `provenance_2816.json` — provenance schema samples
