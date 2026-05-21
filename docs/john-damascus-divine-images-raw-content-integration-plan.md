# John of Damascus — Three Treatises on the Divine Images — Raw Content Integration Plan

**Status:** Planning document — Phase 2 supplementary acquisition (NOT from New Advent).

**Date inspected:** 2026-05-20
**Source:** Project Gutenberg eBook #49917 (clean HTML transcription of Mary H. Allies 1898 print edition)
**Translation:** **Mary H. Allies, 1898** — *St. John Damascene on Holy Images: Followed by Three Sermons on the Assumption.* Thomas Baker, London. Public domain.

> The **Three Treatises Against Those Who Decry Holy Images** (the *Three Apologiai*) are St. John of Damascus's **theological response to the Byzantine iconoclast controversy** (726–842). They are the **single most important Orthodox patristic defense of icons** — the textual foundation for the **Sunday of Orthodoxy** in the Triodion. Without them, the JoD corpus is missing what is arguably his most enduring contribution to Orthodox theology and spirituality.

---

## 1. Why this is a Phase-2 supplementary acquisition

The main JoD corpus from New Advent (Phase 1) contains only:
- **3304** *Exposition of the Orthodox Faith* (4 books) — JoD's systematic dogmatics

The Three Treatises are **separately published and not on New Advent**. They survive in Greek (PG 94:1232–1420). The standard PD English translation is **Mary H. Allies, 1898**, available cleanly via Project Gutenberg.

**Why this matters for Theosis:**

- **Sunday of Orthodoxy** (first Sunday of Lent) commemorates the restoration of icons in 843 — the **Three Treatises are read on this day**
- The treatises define the foundational Orthodox theology of **image-veneration** (*proskynesis*) vs. **worship** (*latreia*)
- They are cited in virtually every modern Orthodox iconography discussion
- Without them, the library cannot serve the Sunday of Orthodoxy with primary-source content

---

## 2. Location & Inventory

```
content/raw/fathers/john-damascus/divine-images/
├── pg49917-images.html                  # Single complete HTML (361 KB)
└── provenance_jod-divine-images.json
```

| Field | Value |
|---|---|
| HTML files | 1 (single self-contained Project Gutenberg eBook) |
| Total size | ~361 KB |
| Format | Project Gutenberg structured HTML |
| Encoding | UTF-8 with Greek and Latin transliteration |

---

## 3. Contents of the Allies 1898 volume

Allies's volume contains **two distinct work-groups** bundled in a single book:

### 3.1 The Three Treatises Against Those Who Decry Holy Images
The canonical Damascene iconodule trilogy. Each "Part" in the HTML = one Apologia/Treatise.

| Part | HTML Anchor | Print Page | Topic | Length |
|---|---|---|---|---|
| **Part I** | `part-i-nl-apologia-of-st-john-damascene-against-those-who-decry-holy-images` | 1–54 | The fundamental defense — Incarnation theology + biblical precedents for material visual representation | longest |
| **Part II** | `part-ii` | 55–86 | Response to specific iconoclast arguments + patristic florilegium | medium |
| **Part III** | `part-iii-20` | 87–146 | Most systematic — defines *image*, *adoration*, kinds of veneration | medium |

Each Part has internal subsections:

#### Part I subsections
- The Apologia proper (no chapter division — flowing argument)
- "Authentic Testimony of Ancient Fathers in favour of Images" — patristic florilegium (Basil, Gregory Nazianzen, Chrysostom, Athanasius, Cyril of Alexandria, Leontius of Neapolis, etc.)

#### Part II subsections
- The Apologia continuation
- "Testimony of Ancient and Learned Fathers to Images" (second florilegium)

#### Part III subsections — Systematic
- 1st Point: What is an Image?
- 2nd Point: For what purpose the Image is made.
- 3rd Point: How many kinds of Images there are.
- Fourth Chapter: What an Image is, what it is not; and how each Image is to be set forth.
- Who first made an Image.
- On Adoration. What is Adoration?
- On the kinds of Adoration.
- What we find worshipped in Scripture, and in how many ways we show worship to creatures.
- Testimony of Ancient and Learned Fathers concerning Images. (third florilegium — largest)

### 3.2 Three Sermons on the Assumption (Koimesis)
**Bundled bonus material.** Separate work — JoD's sermons on the Dormition of the Theotokos (August 15).

| Sermon | HTML Section | Print Page | Topic |
|---|---|---|---|
| Sermon I | "SERMON I. ON THE ASSUMPTION" | 147–170 | Dogmatic-narrative — the Dormition event |
| Sermon II | "SERMON II. ON THE ASSUMPTION" | 171–200 | More expansive — Mariological theology |
| Sermon III | "SERMON III. ON THE ASSUMPTION" | 201–212 | Festal exhortation |

These sermons are **separate works** liturgically — they correspond to the **Feast of the Dormition (August 15)**, not the Sunday of Orthodoxy. The library should treat them as 3 distinct `Work` entries.

---

## 4. Translation & licensing

| Field | Value |
|---|---|
| **Translator** | Mary H. Allies (1852–1927) |
| **Translation year** | 1898 |
| **Publisher** | Thomas Baker, London |
| **Source language** | Greek (Migne PG 94) |
| **Source text** | PG 94:1232–1420 for the Three Treatises; PG 96:699–762 for the Assumption sermons |
| **Status** | **U.S. public domain** — pre-1930 publication; copyright expired |
| **Digital source** | Project Gutenberg eBook #49917, prepared by volunteers |
| **Allies's family note** | Mary H. Allies was the daughter of Thomas William Allies, a major Anglican-to-Catholic theological author. She translated multiple Damascene works. |
| **Quality** | High; Allies is generally faithful to the Greek; her introduction provides solid historical context |

---

## 5. HTML structure

Project Gutenberg's modern HTML structure — much cleaner than older PG plain-text editions:

### 5.1 Page wrapper (to skip during parsing)

```
Lines 1–657: Project Gutenberg boilerplate (CSS, metadata, license header)
<section class="pg-boilerplate pgheader">  → DROP
<section class="pg-boilerplate pgfooter">  → DROP (lines 2171+)
```

### 5.2 Document title
```html
<h1 class="center document-title level-1 pfirst title">
  <span class="x-large">St John Damascene on Holy Images</span>
</h1>
```

### 5.3 Translator's preface
```html
<h2 class="level-2 no-bold pfirst section-title title">
  <span class="pageno target" title="vii" id="page-vii"></span>
  <span>TRANSLATOR'S PREFACE</span>
</h2>
```

### 5.4 Contents
Each TOC entry is a `<p class="first pfirst">` with internal anchor links:
```html
<p class="first pfirst">
  <a class="reference internal pginternal" href="#part-i-..." id="id98">
    <span>PART I. APOLOGIA OF ST JOHN DAMASCENE AGAINST THOSE WHO DECRY HOLY IMAGES</span>
  </a>
  <span class="toc-pageref">1</span>
</p>
```

### 5.5 Parts (= Treatises)
```html
<h2 class="level-2 no-bold pfirst section-title title">
  <span class="pageno target" title="1" id="page-1"></span>
  <span>PART I.</span>
  <span><br></span>
  <span>APOLOGIA OF ST JOHN DAMASCENE AGAINST THOSE WHO DECRY HOLY IMAGES.</span>
</h2>
```

### 5.6 Subsections within Parts
```html
<h3 class="level-3 no-bold pfirst section-title title">
  <span>1st Point.—</span>
  <em class="italics">What is an Image?</em>
</h3>
```

### 5.7 Sermons
Same pattern as Parts:
```html
<h2 class="level-2 no-bold pfirst section-title title">
  <span class="pageno target" title="147" id="page-147"></span>
  <span>SERMON I.</span> <span><br></span>
  <span>ON THE ASSUMPTION (κοίμησις).</span>
</h2>
```

### 5.8 Footnotes
- Inline footnote references: `<sup>N</sup>` linked via `<a class="footnote-reference pginternal" href="#idNN" id="idMM">`
- Footnote content collected in their own section
- Parser should extract and pair them as footnote entries on the relevant section

### 5.9 Pagination markers (preserve for citation)
- `<span class="pageno target" title="<N>" id="page-<N>"></span>` — inline page markers
- Useful for citation: "Allies 1898, p. 87"

---

## 6. Suggested Work record decomposition

```ts
// One Person record (already exists as person.john-of-damascus from Phase 1)

// Five distinct Work records:
Work {
  id: "work.jod-divine-images-1"
  display: "First Apologia Against Those Who Decry Holy Images"
  short_title: "On the Divine Images I"
  work_type: "treatise"
  person_id: "person.john-of-damascus"
  written_circa: "AD 726-730"
  source_record_id: "source.allies-1898"
  feast_day_anchor: "sunday-of-orthodoxy"  // 1st Sunday of Lent
}

Work {
  id: "work.jod-divine-images-2"
  display: "Second Apologia Against Those Who Decry Holy Images"
  short_title: "On the Divine Images II"
  // ...same shape
}

Work {
  id: "work.jod-divine-images-3"
  display: "Third Apologia Against Those Who Decry Holy Images"
  short_title: "On the Divine Images III"
  // ...same shape
}

Work {
  id: "work.jod-dormition-sermon-1"
  display: "First Sermon on the Dormition of the Theotokos"
  // ...
  feast_day_anchor: "dormition"  // August 15
}
// ...sermons 2 and 3 similarly
```

---

## 7. Bible-linking strategy

The Three Treatises cite scripture **extensively** in defense of material veneration:

### High-value head-verses

- **Exodus 25–26** (Tabernacle furniture as God-commanded religious imagery)
- **1 Kings 6–7** (Solomonic Temple imagery)
- **Numbers 21:8–9** (Brazen serpent)
- **Genesis 1:26–27** (Image of God in humanity)
- **John 14:9** ("He who has seen me has seen the Father")
- **Colossians 1:15** ("the image of the invisible God")
- **Hebrews 1:3** ("the radiance of God's glory")
- **2 Corinthians 4:4** ("the image of God")

### Patristic florilegia
Each of the three treatises contains a substantial **patristic citation list** at its end — quotations from Basil, Gregory Nazianzen, Chrysostom, Athanasius, Cyril of Alexandria, Dionysius the Areopagite, Severian of Gabala, Leontius of Neapolis, Anastasius of Sinai, and others.

These florilegia are **cross-corpus link goldmines** — they should be parsed to extract:
- The cited author's name
- The work title cited
- The quoted passage
- Cross-link to that author's entry in our library

### Lectionary
- **First Sunday of Lent (Sunday of Orthodoxy)** — Three Treatises
- **Dormition (August 15)** — Three Sermons on the Dormition
- **December 4** — JoD's feast day (in some calendars; also commemorated on other days)

---

## 8. Cross-corpus links

- **JoD Exposition of the Orthodox Faith (3304)** — same author, complementary subjects (one dogmatic systematic, the other iconographic apologetic)
- **The Seventh Ecumenical Council (Nicaea II, 787)** — Acts in `councils/ecumenical/nicaea-ii/` — the **conciliar settlement** of the iconoclast controversy. Direct theological dependence on JoD.
- **Basil the Great's De Spiritu Sancto** — JoD cites Basil's distinction between *latreia* and *proskynesis* (worship vs. veneration) — foundational to the icon argument.
- **Theodore the Studite** (later corpus — not yet acquired) — second-generation iconodule defender; theologically dependent on JoD.
- **Patristic florilegia** in Parts I, II, III — link to existing corpus entries for: Basil (Hexaemeron, De Spiritu Sancto, Letters), Gregory Nazianzen (Orations), Chrysostom (Homilies), Athanasius (Contra Gentes, Letters), Cyril of Jerusalem (Catechetical Lectures), Dionysius the Areopagite (not yet acquired), Leontius of Neapolis (not in our corpus).

---

## 9. Parser strategy

### Step 1: Strip Project Gutenberg boilerplate
- Lines before `<section ... id="pg-start-separator">` (PG headers)
- Lines after `<section ... id="pg-end-separator">` (PG footer + license)

### Step 2: Extract document title from `<h1 class="document-title">`

### Step 3: Walk `<h2>` and `<h3>` tags

The document structure is consistent — `<h2>` for top-level sections (preface, contents, Parts, sermons, index), `<h3>` for subsections within Parts.

### Step 4: Capture paragraphs between headings

All body paragraphs are `<p>` with various classes (`first`, `pfirst`, etc.). Parser should accept all `<p>` text between adjacent heading boundaries.

### Step 5: Footnote extraction

Inline `<sup>N</sup>` references → pair with the footnote content section. Many footnotes contain **patristic source citations** that are extractable as `editorial_note` records.

### Step 6: Pagination preservation

Each `<span class="pageno target" id="page-<N>">` marks a print-page boundary. Useful for citation; parser should record these but not render them.

---

## 10. Risks & caveats

### 10.1 Three Treatises = Three Works, NOT One
The HTML structure presents them as Part I/II/III of a single document. **They are theologically three separate apologetic works** written at slightly different times in response to evolving iconoclast positions. The library should model them as three Work entries linked by a parent "Three Treatises" collection.

### 10.2 Allies's 1898 language is dated
Some Greek terms (e.g., *proskynesis*, *latreia*) are translated with archaic English equivalents. The integration plan should preserve original Greek transliterations where Allies provides them; modern parallel translation (e.g., Andrew Louth 2003) is copyrighted and unavailable to us.

### 10.3 The patristic florilegia accuracy
JoD quotes many earlier Fathers — but some quotations are **paraphrastic** or come from now-lost works. The library should flag florilegia citations as `paraphrastic_citation` rather than `verbatim_quotation` when they can't be matched to a canonical source.

### 10.4 The Assumption Sermons separately
The three Dormition sermons are theologically distinct from the iconodule treatises. They're bundled in Allies's print edition for editorial reasons (same translator, same author, contemporaneous composition), but should be surfaced separately in the library — especially around the August 15 feast.

### 10.5 LXX vs MT
JoD cites the LXX (Greek OT). LXX-MT differences in cited passages should be noted; psalm numbers should be **LXX-numbered** consistent with the Theosis-wide convention for Greek Fathers.

---

## 11. Appendix

- Source acquisition: `2026-05-20T19:30:00+00:00` via curl from Project Gutenberg
- Primary URL: https://www.gutenberg.org/cache/epub/49917/pg49917-images.html
- Print provenance: archive.org/details/stjohndamasceneo00alliuoft (1898 first edition, Thomas Baker, London)
- Modern parallel: Andrew Louth, *St. John of Damascus: Three Treatises on the Divine Images* (SVS Press, 2003) — **copyrighted, not used**
- Migne PG 94:1232–1420 (Greek + Latin parallel, PD but no English)
