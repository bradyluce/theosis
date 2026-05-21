# Cyril of Jerusalem Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Cyril of Jerusalem HTML corpus downloaded from New Advent.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** **NPNF Series II, Vol. 7** — Schaff & Wace eds., 1894. Public domain. **Translator: Edwin Hamilton Gifford** (Cyril section; same volume that contains Gregory Nazianzen's Browne-Swallow translations of Orations and Letters).

> **Companion docs:** [Augustine](augustine-raw-content-integration-plan.md) · [Gregory of Nyssa](gregory-of-nyssa-raw-content-integration-plan.md) · [Athanasius](athanasius-raw-content-integration-plan.md) · [Basil](basil-raw-content-integration-plan.md) · [Chrysostom](chrysostom-raw-content-integration-plan.md) · [Gregory Nazianzen](gregory-nazianzen-raw-content-integration-plan.md) · [Ignatius](ignatius-raw-content-integration-plan.md) · [Irenaeus](irenaeus-raw-content-integration-plan.md)
>
> Most HTML patterns are identical across all nine corpora. This doc highlights Cyril's most distinctive features:
> 1. **A single 24-lecture work covering the entire catechumenate cycle** — Procatechesis + 18 Pre-baptismal + 5 Mystagogical
> 2. **Chrysostom-style head-verse epigraph pattern** — each lecture opens with a `<p><a href="../bible/...">Verse</a>.</p>` link, making mechanical Bible-linking extraction trivial
> 3. **Liturgical-tradition gold mine** — the Mystagogical Lectures preserve the earliest detailed description of Orthodox baptism, chrismation, and Eucharist
> 4. **Shared volume with Gregory Nazianzen** (NPNF II.7) but with a different translator (Gifford vs. Browne/Swallow)

---

## 1. Where the Cyril of Jerusalem files are located

```
content/raw/fathers/cyril-jerusalem/
```

Same per-author convention as the other Fathers.

---

## 2. What files were downloaded

| Item | Count |
|---|---|
| `*.html` raw files | **25** (1 index + 24 lecture sub-pages) |
| `provenance_<work_id>.json` files | **1** |
| Legacy `*.md` files | ~29 |
| **Total raw HTML size** | **~1.01 MB** |

**File-naming convention:**

| Pattern | Meaning | Example |
|---|---|---|
| `3101.html` | Catechetical Lectures index | TOC of all 24 lectures |
| `310100.html` | Procatechesis (Prologue) | The introductory lecture preached at the start of Lent |
| `310101.html`–`310118.html` | Pre-baptismal Lectures 1–18 | Delivered to catechumens during Lent |
| `310119.html`–`310123.html` | Mystagogical Lectures 1–5 (numbered 19–23 in NPNF) | Delivered AFTER baptism (Bright Week) explaining the sacraments |

Sub-page ID encoding: `3101NN` (6-digit) where NN is the 2-digit lecture number (00 = Prologue; 01–23 = numbered lectures).

Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T213414.json` — 1 work OK, 0 errors, 25 files.

---

## 3. Major works represented

**One work: the Catechetical Lectures** — but 24 lectures within it.

| ID | Title | Type | Sub-pages | Size | Notes |
|---|---|---|---|---|---|
| **3101** | Catechetical Lectures | homily | **24** (Procatechesis + 18 pre-baptismal + 5 mystagogical) | 9 KB index + 17–81 KB per lecture | The foundational text of the Christian catechumenate; **THE earliest detailed witness to Orthodox liturgical practice** |

### Lecture-by-lecture structure

| File | Lecture | Subtitle / Topic | Approx Size |
|---|---|---|---|
| 310100 | **Procatechesis** (Prologue) | Pre-Lenten introductory address to candidates for baptism | 27 KB |
| 310101 | Lecture 1 | On Isaiah 1:16: "Wash you, make you clean" | 20 KB |
| 310102 | Lecture 2 | On Sin and Repentance — Ezekiel 18:20 | 39 KB |
| 310103 | Lecture 3 | On Baptism — Romans 6:3-4 | 38 KB |
| 310104 | Lecture 4 | **On the Ten Points of Doctrine** — Colossians 2:8 | 57 KB |
| 310105 | Lecture 5 | On Faith — Hebrews 11:1 | 32 KB |
| 310106 | Lecture 6 | **On the Unity of God** (and the Father almighty) — Isaiah 45:16 | 65 KB |
| 310107 | Lecture 7 | On the Father | 32 KB |
| 310108 | Lecture 8 | On the Almighty | 17 KB |
| 310109 | Lecture 9 | On the Maker of Heaven and Earth | 33 KB |
| 310110 | Lecture 10 | On the One Lord Jesus Christ | 47 KB |
| 310111 | Lecture 11 | On Christ's Only-Begotten Sonship | 46 KB |
| 310112 | Lecture 12 | On Christ's Incarnation — Isaiah 7:10-14 (Virgin birth) | 65 KB |
| 310113 | Lecture 13 | **On the Crucifixion and Burial** — Isaiah 53 | **81 KB** (largest lecture) |
| 310114 | Lecture 14 | **On the Resurrection** — 1 Corinthians 15:1-4 | 63 KB |
| 310115 | Lecture 15 | On the Second Coming — Daniel 7:13-14 | 68 KB |
| 310116 | Lecture 16 | **On the Holy Spirit (I)** — 1 Corinthians 12:1-7 | 64 KB |
| 310117 | Lecture 17 | **On the Holy Spirit (II)** | 77 KB |
| 310118 | Lecture 18 | **On the Resurrection of the Flesh, the Catholic Church, and Eternal Life** | 62 KB |
| **310119** | **Mystagogical 1 (= Lecture 19)** | **On the Renunciation of Satan** — pre-baptismal rite | 20 KB |
| **310120** | **Mystagogical 2 (= Lecture 20)** | **On the Three Baths of Baptism** | 17 KB |
| **310121** | **Mystagogical 3 (= Lecture 21)** | **On Chrismation** (post-baptismal anointing) | 17 KB |
| **310122** | **Mystagogical 4 (= Lecture 22)** | **On the Body and Blood of Christ** (Eucharist) | 15 KB |
| **310123** | **Mystagogical 5 (= Lecture 23)** | **On the Sacred Liturgy and Communion** | 27 KB |

**The 24 lectures structurally form the entire catechetical-liturgical year:**
- **Procatechesis** = Pre-Lent introductory address
- **Lectures 1–18** = Pre-baptismal lectures during the **40 days of Great Lent** (delivered daily/regularly to those preparing for baptism at Pascha)
- **Mystagogical Lectures 1–5** = Post-baptismal lectures during **Bright Week / Renewal Week** (after the candidates have been baptized at the Paschal Vigil, the bishop explains the sacraments they have just received)

### Notable absences

- **Letters** — Cyril's surviving letters (notably to Constantius about the Cross apparition of 351) are not in this NPNF Vol. 7 selection
- **Other homilies** — a few homilies attributed to Cyril circulate but are not in NPNF
- **Authentic-mystagogical debate** — modern scholarship questions whether the Mystagogical Lectures (19–23) were actually delivered by Cyril or by his successor John II of Jerusalem. The NPNF translation treats them as Cyrilline; modern critical editions are split. The Theosis library should note this as a scholarly caveat but treat them as Cyrilline by convention.

For a complete Cyril library, supplementary sources:
- Edward Yarnold, *Cyril of Jerusalem* (Routledge, 2000) — selected lectures, modern translation
- Anthony Stephenson, *The Works of Saint Cyril of Jerusalem* (Fathers of the Church series)
- Migne PG 33

---

## 4. How the files are structured internally

Identical shell to the other corpora — `<div id="springfield2">`, `<div class="pub">`, etc.

---

## 5. One file per work? Per section?

One multi-sub-page work (3101 Catechetical Lectures with 24 sub-pages). No self-contained large works.

---

## 6. HTML patterns inside content pages

Patterns are mostly identical to the other corpora. **Cyril-specific structural feature below: the explicit head-verse epigraph.**

### 6.1 Index page

```html
<h1>Catechetical Lectures</h1>
<p>
  <a href="../fathers/310100.htm"><strong>Prologue</strong></a>
  <br><a href="../fathers/310101.htm"><strong>Lecture 1</strong></a>
  <br><a href="../fathers/310102.htm"><strong>Lecture 2</strong></a>
  ...
  <br><a href="../fathers/310123.htm"><strong>Lecture 23</strong></a>
</p>
```

Bare TOC — no descriptive blurbs (unlike Irenaeus's *Adversus Haereses* index which had detailed chapter summaries).

### 6.2 Lecture sub-page structure — **head-verse epigraph pattern**

Cyril's Catechetical Lectures use **a clean head-verse pattern very similar to Chrysostom's**:

```html
<h1>Catechetical Lecture 4</h1>
<p>...Gumroad banner...</p>

<p><strong>On the Ten Points of Doctrine.</strong></p>      <!-- ← lecture subtitle/topic -->

<p><a href="../bible/col002.htm#verse8">Colossians 2:8</a>.</p>    <!-- ← head-verse hyperlink -->

<p>Beware lest any man spoil you through philosophy and vain deceit, after the tradition of men...</p>   <!-- ← pericope quote -->

<p>1. Vice mimics virtue, and the tares strive to be thought wheat...</p>    <!-- ← numbered commentary begins -->

<p>2. For the method of godliness consists of these two things, pious doctrines, and virtuous practice...</p>

...
```

**Parser-friendly:**
- The `<p><strong>...</strong></p>` subtitle identifies the lecture topic
- The `<p><a href="../bible/...">Verse</a>.</p>` provides a **direct Bible-link extraction point** — like Chrysostom's pattern (§6.2 of the Chrysostom plan)
- The following `<p>` is the **pericope text being expounded**
- Then `<p>N. ...</p>` numbered paragraph commentary

**This produces ~20–22 strong head-verse links** mechanically (the Procatechesis and some of the more topical lectures don't have a specific head verse — they're introductory or on broad themes).

### 6.3 Mystagogical Lectures structure

The 5 Mystagogical Lectures (19–23) have a slightly different pattern:

```html
<h1>Catechetical Lecture 19</h1>
<p>...Gumroad banner...</p>

<p><strong>First Lecture on the Mysteries.</strong></p>                 <!-- ← mystagogical subtitle -->

<p>With a Lesson from the <a href="../bible/1pe000.htm">First General Epistle of Peter</a>,
   beginning at <em>Be sober, be vigilant</em>, to the end of the Epistle.</p>   <!-- ← Scripture lesson reference (whole book, not a single verse) -->

<p>1. I have long been wishing, O true-born and dearly beloved children of the Church...</p>
```

The Mystagogical Lectures reference a **whole-book or extended-passage Scripture lesson** rather than a single head verse. The Bible link in the `<p>` after the subtitle points to the book index (e.g., `1pe000.htm`) rather than a specific verse anchor. The parser should handle this as a "scripture lesson" rather than a "head verse" — possibly using `head_verse_text` to capture the passage description ("Be sober, be vigilant... to the end of the Epistle").

### 6.4 Paragraph numbering

Standard `<p>N. ...</p>` Arabic numerals throughout. NPNF Series II convention.

### 6.5 Scripture references — `<span class="stiki">`

Standard pattern. **Bible-citation density is high** in the theological lectures (Lectures 4–18) and moderate in the catechetical/liturgical ones (Procatechesis, Lectures 19–23). Estimated **1,500–2,500 stiki references** across the 25 files.

### 6.6 Internal sub-section headings within Lecture 4

Lecture 4 (the "Ten Points of Doctrine") uses internal `<p><strong>I. Of God.</strong></p>`-style markers to delineate the ten doctrinal points. This is a unique structural feature within the Cyril corpus — a single lecture organized as a mini-creed with 10 numbered subsections. The parser may want to detect these for finer-grained navigation, but for v1 they can be left embedded in the body text.

### 6.7 Citation footer

```html
<span id="srctrans">Translated by Edwin Hamilton Gifford.</span>
From <span id="srcwork">Nicene and Post-Nicene Fathers, Second Series</span>,
<span id="srcvolume">Vol. 7.</span>
<span id="srced">Edited by Philip Schaff and Henry Wace.</span>
<span id="srcyear">1894.</span>
```

**Same volume as Gregory Nazianzen (NPNF II Vol. 7) but different translator.** This means a single `BibliographicEdition` row for "NPNF II Vol. 7 (1894)" can be referenced by:
- All Cyril of Jerusalem works (Gifford translation)
- All Gregory Nazianzen works (Browne + Swallow translation)

The `translator` field on SourceRecord stores the work-specific translator; the volume-level edition metadata is shared.

---

## 7. How clean is the HTML?

Same level as the other corpora. **No new edge cases** beyond what's already documented in the other plans. Notably **cleaner than several other corpora** because:
- Consistent head-verse epigraph pattern (no Roman numerals, no `class="chapterN"` quirks)
- Standard Arabic-numeral paragraph numbering
- Single translator (no per-work translator variance)

---

## 8. Extractable metadata

| Field | Source | Cyril example |
|---|---|---|
| Author | Folder + `<title>` | `Cyril of Jerusalem` |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `3101` |
| Work title | `<h1>` of index | `Catechetical Lectures` |
| Lecture number | Filename suffix (00 = Prologue; 01–23 = lectures) | `0`–`23` |
| Lecture title | `<h1>` of sub-page | `Catechetical Lecture 4` |
| **Lecture subtitle** | `<p><strong>{text}</strong></p>` immediately after `<h1>` | `On the Ten Points of Doctrine.` |
| **Head-verse hyperlink** | First `<a href="../bible/...">` link after `<h1>` | `Colossians 2:8` |
| **Pericope text** | First `<p>{text}</p>` containing the quoted scripture | `Beware lest any man spoil you through philosophy...` |
| Paragraph number | Leading Arabic numeral in `<p>` body | `1`, `2`, `127` |
| Translator | `<span id="srctrans">` | `Translated by Edwin Hamilton Gifford.` (uniform across corpus) |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, Second Series` |
| Volume | `<span id="srcvolume">` | `Vol. 7.` |
| Editor | `<span id="srced">` | `Edited by Philip Schaff and Henry Wace.` |
| Year | `<span id="srcyear">` | `1894.` |
| Bible references | `<span class="stiki">` blocks | ~1,500–2,500 estimated |
| Work type | provenance JSON `work_type` | `homily` |

---

## 9. Normalization to Theosis library records

### Person

```ts
Person {
  id:          "person.cyril-of-jerusalem"
  display:     "Cyril of Jerusalem"
  also_known:  ["St. Cyril", "Cyrillus Hierosolymitanus"]
  born:        c. 313
  died:        386
  feast_day:   "03-18"        // Orthodox calendar: March 18
  feast_west:  "03-18"        // Catholic Western feast day (same date)
  tradition:   "Bishop of Jerusalem (c. 350-386); exiled three times during Arian controversies; Doctor of the Church; participant at the First Council of Constantinople (381)"
  see:         "Jerusalem"
  ecumenical_role: "Catechist of the Jerusalem Church; preserver of early Jerusalem liturgical practice; witness to early Christian sacramental theology"
}
```

**Orthodox significance:**
- **Doctor of the Church** (Western tradition); venerated as a major saint in both East and West
- Bishop of Jerusalem during the height of the Arian controversies — exiled three times
- Participated in the **First Council of Constantinople (381)**, contributing to the Niceno-Constantinopolitan Creed
- **The Catechetical Lectures preserve the earliest detailed witness to Christian liturgical practice** — pre-baptismal renunciation of Satan, baptismal rites, chrismation, the Eucharistic liturgy
- His **Mystagogical Lectures** are the foundational text for understanding the Orthodox sacramental life from the perspective of the 4th-century Jerusalem Church
- **Feast day March 18** in the Orthodox calendar

### Work

1 row total — single-work corpus.

```ts
Work {
  id:               "work.cyril-jerusalem.3101"
  author_id:        "person.cyril-of-jerusalem"
  title:            "Catechetical Lectures"
  alt_titles:       ["Catecheses", "Mystagogical Catecheses", "Κατηχήσεις"]
  work_type:        "homily"
  composition_date: "c. 350"
  language_original:"Greek"
  has_subsections:  true
  section_count:    24
  source_id:        "src.newadvent.3101"
  description:      "The complete catechetical-liturgical cycle: Procatechesis (pre-Lenten introduction) + 18 pre-baptismal Lenten lectures + 5 mystagogical post-baptismal lectures explaining the sacraments. The foundational text of the Christian catechumenate."
  composition_notes:"Mystagogical Lectures 19-23 are sometimes attributed to Cyril's successor John II of Jerusalem; modern scholarship is divided. NPNF treats them as Cyrilline."
}
```

### WorkSection

24 rows — one per lecture. Three section types:

```ts
WorkSection {
  id:              "section.cyril-jerusalem.3101.04"
  work_id:         "work.cyril-jerusalem.3101"
  order_index:     5             // 5th in sequence (Procatechesis=1, Lectures 1-23 = 2-24)
  lecture_number:  4
  section_type:    "lecture"     // or "procatechesis", "mystagogical_lecture"
  cycle_phase:     "pre-baptismal"  // or "introduction" (Procatechesis), "mystagogical"
  short_label:     "Cat. 4"
  display_title:   "On the Ten Points of Doctrine"          // extracted from <p><strong>...</strong></p>
  head_verse:      "Colossians 2:8"                          // extracted from <a href="../bible/col002.htm#verse8">
  head_verse_text: "Beware lest any man spoil you through philosophy and vain deceit..."
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.3101"
  bible_refs:      BibleRef[]
}

WorkSection {  // example: mystagogical lecture (different shape)
  id:              "section.cyril-jerusalem.3101.19"
  lecture_number:  19   // numbered 19 in NPNF / Mystagogical 1
  section_type:    "mystagogical_lecture"
  cycle_phase:     "mystagogical"
  short_label:     "Cat. Myst. 1"
  display_title:   "On the Renunciation of Satan"
  scripture_lesson: "1 Peter 5:8 onward (Be sober, be vigilant, to the end of the Epistle)"
  head_verse:      null   // mystagogical lectures don't have a single head verse
  body_html:       "<cleaned content>"
  ...
}
```

### SourceRecord

One source record — shared with the Gregory Nazianzen volume:

```ts
SourceRecord {
  id:              "src.newadvent.3101"
  work_id:         "work.cyril-jerusalem.3101"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/3101.htm"
  translator:      "Edwin Hamilton Gifford"
  series:          "Nicene and Post-Nicene Fathers, Second Series"
  volume:          "Vol. 7"
  editor:          "Philip Schaff and Henry Wace"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1894
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/cyril-jerusalem/3101.html"
  provenance_json: "content/raw/fathers/cyril-jerusalem/provenance_3101.json"
}
```

The BibliographicEdition for NPNF II Vol. 7 is shared between Cyril (Gifford translator) and Gregory Nazianzen (Browne + Swallow translators).

---

## 10. Bible-linking strategy

Cyril is the **fourth corpus with mechanically-extractable head-verse linking** (after Chrysostom, Augustine, Basil). The pattern is **Chrysostom-style** — a `<p><a href="../bible/...">Verse</a>.</p>` link immediately after the subtitle.

### 10.1 Head-verse linking — ~20 strong links extractable mechanically

For each of the 24 lectures, extract:
1. The lecture subtitle from `<p><strong>{text}</strong></p>`
2. The head-verse hyperlink from the next `<p><a href="../bible/...">`
3. The pericope text from the next `<p>{text}</p>`

Expected outcomes:
- **Procatechesis (310100)**: No head verse — it's a general introduction. Subtitle: "Introductory Lecture" or similar.
- **Lectures 1–18 (310101-310118)**: Each has a clear head verse (Colossians 2:8, Romans 6:3, Isaiah 7:14, etc.). **~18 strong head-verse links.**
- **Mystagogical Lectures 19–23 (310119-310123)**: Each has a **scripture lesson reference** (whole-book or extended passage rather than a single verse). The parser should store this as `scripture_lesson` rather than `head_verse`. **5 scripture-lesson references.**

### 10.2 Inline scripture refs

Extract all `<span class="stiki">` blocks. Estimated 1,500–2,500 BibleRef rows.

**Notable: Cyril's lectures preserve a wealth of OT typology** (e.g., Lecture 19 expounds the Exodus as a type of Baptism — Pharaoh = Satan, Red Sea = baptismal water, etc.). His OT/NT cross-referencing is rich.

### 10.3 Thematic Bible-linking

| Lecture | Thematic Bible passages |
|---|---|
| **Procatechesis** | Various — general Christian initiation |
| **Lecture 4 (Ten Points of Doctrine)** | Colossians 2:8 + many supporting verses; a mini-creed exposition |
| **Lecture 6 (Unity of God)** | Deuteronomy 6:4 (Shema), Isaiah 45 |
| **Lectures 10-12 (Christology)** | John 1, Phil 2, Isaiah 7:14 (Virgin birth), Isaiah 53 |
| **Lecture 13 (Crucifixion)** | Isaiah 53, Psalm 22, Gospel passion narratives |
| **Lecture 14 (Resurrection)** | 1 Cor 15, Gospel resurrection narratives |
| **Lectures 16-17 (Holy Spirit)** | 1 Cor 12, John 14-16, Acts 2 |
| **Lecture 18 (Resurrection of Flesh)** | 1 Cor 15, Ezekiel 37, Romans 8 |
| **Mystagogical 1 (310119, Renunciation of Satan)** | Exodus 14 (Red Sea as type of Baptism), 1 Peter 5 |
| **Mystagogical 2 (310120, Baptism)** | Romans 6:3-4, John 3:5, Colossians 2:12 |
| **Mystagogical 3 (310121, Chrismation)** | Acts 8:14-17 (laying on hands), 1 John 2:20, 27 |
| **Mystagogical 4 (310122, Eucharist)** | John 6:53-56, Matt 26:26-28, 1 Cor 11:23-26 |
| **Mystagogical 5 (310123, Liturgy)** | 1 Cor 11, Heb 9-10, Phil 4:6 |

### 10.4 Lectionary linking — Orthodox calendar

- **March 18 (Feast of St. Cyril of Jerusalem)** — surface entire corpus.
- **Great Lent (40 days before Pascha)** — surface **the 18 pre-baptismal lectures sequentially** as Lenten daily reading. Day 1 of Lent → Procatechesis → Lecture 1 → Lecture 2 → ... This is a **major liturgical-year integration opportunity** — the Catechetical Lectures were **literally preached during Lent**, so they map naturally to the Orthodox Lenten cycle.
- **Bright Week (Easter Week)** — surface **the 5 mystagogical lectures sequentially** as daily reading after Pascha. These were preached to the newly-baptized during Bright Week.
- **Theophany / Baptism of Christ (Jan 6)** — surface Mystagogical Lectures 2-3 (Baptism, Chrismation).
- **Holy Thursday (Liturgy of St. Basil, Last Supper)** — surface Mystagogical Lecture 4 (Eucharist).

The **Lenten + Bright Week sequential surfacing of Cyril is one of the most powerful liturgical-year features the Theosis app could offer.**

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Head-verse linking** for Lectures 1-18 (~18 strong links).
2. **Pass 2 — Scripture-lesson extraction** for Mystagogical Lectures 19-23 (~5 lesson refs).
3. **Pass 3 — Inline `stiki` extraction** across all 25 files (~1,500-2,500 BibleRef rows).
4. **Pass 4 — Liturgical-year mapping** — map Procatechesis + Lectures 1-18 to Lenten days; Lectures 19-23 to Bright Week days.
5. **Pass 5 — Thematic editorial tags** (~25 entries — one per lecture).

---

## 11. Which Cyril works are most useful for the Theosis library

In a 1-work corpus, ranking individual lectures:

| Rank | Lecture | Why it's valuable |
|---|---|---|
| 1 | **Mystagogical Lecture 4 (310122, On the Eucharist)** | Foundational witness to Orthodox Eucharistic theology and the early Jerusalem liturgy. |
| 2 | **Mystagogical Lecture 5 (310123, On the Sacred Liturgy)** | Earliest extant detailed description of the Orthodox Divine Liturgy — pre-Anaphora, Anaphora, communion. |
| 3 | **Mystagogical Lecture 1 (310119, On the Renunciation of Satan)** | Foundational text for the pre-baptismal renunciation rite still used in Orthodox baptism today (turning West, renouncing Satan, then turning East to confess Christ). |
| 4 | **Mystagogical Lecture 2 (310120, On the Three Baths of Baptism)** | The triple immersion baptismal rite — central to Orthodox baptismal theology. |
| 5 | **Mystagogical Lecture 3 (310121, On Chrismation)** | Earliest detailed description of the Orthodox sacrament of Chrismation (the post-baptismal anointing). |
| 6 | **Procatechesis (310100)** | Beautiful introductory address to Lent and catechumens; ideal for surfacing on Forgiveness Sunday or 1st Sunday of Great Lent. |
| 7 | **Lecture 13 (310113, On the Crucifixion)** | Longest lecture; expounds Isaiah 53 typologically. Holy Friday reading. |
| 8 | **Lecture 14 (310114, On the Resurrection)** | Pascha reading. |
| 9 | **Lecture 18 (310118, On the Resurrection of the Flesh, the Catholic Church, and Eternal Life)** | Concludes the pre-baptismal cycle with the last clauses of the Creed. |
| 10 | **Lectures 16-17 (310116-310117, On the Holy Spirit)** | Pentecost-season reading; pneumatology. |

**The complete Lenten sequence (Procatechesis → Lectures 1–18) + Bright Week sequence (Mystagogical 1–5) is the most theologically valuable arrangement for liturgical-year reading.**

---

## 12. Which Cyril works are mostly general library texts

Within Cyril's corpus, all 24 lectures are valuable. The most narrowly topical are:
- **Lecture 8 (On the Almighty)** — shortest of the substantive lectures (17 KB); brief theological note
- **Lecture 7 (On the Father)** — also brief

These are part of the Creed-exposition sequence and not standalone reading material; they belong in the library as parts of the larger sequence.

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module covers ~95% of Cyril. Specific additions:

### 13.1 Head-verse extraction (Chrysostom-pattern reuse)

The Cyril lectures use the same head-verse epigraph pattern as Chrysostom. The Chrysostom head-verse extractor (see Chrysostom plan §13.1) **works on Cyril without modification**:

```python
def extract_head_verse(soup, work_id, section_id):
    """Works for Chrysostom AND Cyril of Jerusalem."""
    content = soup.select_one("#springfield2")
    h1 = content.select_one("h1") if content else None
    if not h1:
        return None
    for elem in h1.next_siblings:
        if elem.name == "p":
            text = elem.get_text(strip=True)
            if re.match(r"^\d+\.\s", text):
                return None  # Reached body without finding head-verse
            bible_link = elem.find("a", href=re.compile(r"\.\./bible/"))
            if bible_link:
                return parse_bible_link(bible_link)
    return None
```

### 13.2 Mystagogical lecture handling

For sub-pages 310119–310123, the head-verse extractor will find a Bible link, but it will point to a book index (e.g., `1pe000.htm`) rather than a specific verse. Treat this as a `scripture_lesson` reference rather than a precise `head_verse`. Detect by checking if the verse anchor is missing:

```python
def parse_bible_link(a_tag):
    href = a_tag["href"]
    m = re.match(r"\.\./bible/([a-z123]{3})(\d{3})\.htm(?:#verse(\d+))?", href)
    if not m:
        return None
    book = NEWADVENT_TO_OSIS.get(m.group(1))
    chapter = int(m.group(2))
    verse_start = int(m.group(3)) if m.group(3) else None
    if chapter == 0 and verse_start is None:
        # Whole-book reference (e.g., "../bible/1pe000.htm" → 1 Peter book index)
        return ScriptureLesson(book=book, kind="whole_book")
    return BibleRef(book, chapter, verse_start, ...)
```

### 13.3 Lecture-cycle classification

The 24 lectures fall into 3 cycle phases. Add a `cycle_phase` field to WorkSection:

```python
def classify_cyril_lecture(section_id: str) -> str:
    """Classify lecture by cycle phase based on section ID."""
    if section_id == "310100":
        return "procatechesis"            # Procatechesis / Prologue
    elif section_id.startswith("31010") or section_id.startswith("31011"):
        n = int(section_id[-2:])
        if 1 <= n <= 18:
            return "pre-baptismal"        # Lectures 1-18
    n = int(section_id[-2:])
    if 19 <= n <= 23:
        return "mystagogical"             # Mystagogical Lectures 1-5 (= 19-23)
    return "unknown"
```

### 13.4 Shared BibliographicEdition with Gregory Nazianzen

NPNF II Vol. 7 (1894) is shared between Cyril (Gifford translator) and Gregory Nazianzen (Browne + Swallow translators). If the schema has a `BibliographicEdition` table, both authors reference the same row. The `translator` field stays per-SourceRecord (work-level).

---

## 14. Risks, edge cases, cleanup issues

### 14.1 Mystagogical Lectures authenticity debate

CRITICAL editorial note: modern scholarship is split on whether the 5 Mystagogical Lectures were delivered by Cyril or by his successor John II of Jerusalem. The NPNF translation treats them as Cyrilline. The Theosis library should:
- Accept NPNF's attribution as the default (Cyrilline)
- Add an `authorship_note` field flagging the scholarly debate
- Not hide or de-emphasize them — they are universally accepted as a 4th-century Jerusalem text regardless of which bishop preached them

### 14.2 Numbering: NPNF vs. modern

NPNF numbers the lectures Procatechesis + Lectures 1–18 + Lectures 19–23 (= Mystagogical 1–5). Modern critical editions often renumber the Mystagogical Lectures as 1–5 separately. **The Theosis schema should preserve both numbering conventions** — `lecture_number` for the NPNF sequence and `mystagogical_number` (or a label like "Cat. Myst. 1") for the standard scholarly form.

### 14.3 Shared volume with Gregory Nazianzen

NPNF II Vol. 7 contains both authors. Translators differ (Gifford for Cyril; Browne + Swallow for Gregory Nazianzen). Standard handling — `translator` is per-SourceRecord.

### 14.4 LXX vs MT versification

Same risk as the other Greek Fathers. Cyril cites LXX; Theosis Psalter likely LXX-numbered.

### 14.5 Internal `<p><strong>I. Of God.</strong></p>` headers in Lecture 4

Lecture 4 ("Ten Points of Doctrine") has 10 internal subsections marked by `<p><strong>I. Of God.</strong></p>`, `<p><strong>II. Of Christ.</strong></p>`, etc. These are unique within the Cyril corpus. For v1, leave them embedded in the body text; for v2, extract them as subsections.

### 14.6 Compute scale

25 files × ~40 KB avg = trivial.

---

## 15. Recommended next step for a separate integration chat

> **"Build the nine-Father patristic ingestion pipeline."**
>
> 1. Read all nine planning docs.
> 2. Read the Theosis library schema; confirm Person/Work/WorkSection/SourceRecord/BibleRef shapes. **Add `head_verse_text`, `scripture_lesson`, `cycle_phase`, `is_authentic`, `recension`, `authorship_note` fields** to WorkSection/Work as needed.
> 3. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py`.
> 4. Confirm Psalter versification (LXX vs MT) with the user.
> 5. Build `scripts/parse_newadvent/` as a shared module. Test on **nine end-to-end cases**:
>    - Augustine **1101** (Confessions)
>    - Gregory of Nyssa **2914** (On the Making of Man)
>    - Athanasius **2802** + **28161**
>    - Basil **3201** + **32011** + **3203**
>    - Chrysostom **2310** + **23101** (head-verse epigraph)
>    - Gregory Nazianzen **3102** + **310240** + **3103a** (multi-letter Division)
>    - Ignatius **0104** + **0107** + **0114**
>    - Irenaeus **0103** + **0103302** + **0134** (Fragments with bare numeric `<h2>` chunking)
>    - **Cyril of Jerusalem 3101 + 310104 (Lecture 4 with head-verse) + 310119 (Mystagogical Lecture with whole-book scripture lesson)**
> 6. Expand to all 137 works = 48 Augustine + 15 Gregory of Nyssa + 21 Athanasius + 3 Basil + 36 Chrysostom + 2 Gregory Nazianzen + 9 Ignatius + 2 Irenaeus + 1 Cyril of Jerusalem = **2,113 HTML files**.
> 7. Bible-linking passes:
>    - Pass 1: Chrysostom head-verse extraction (~470 links)
>    - **Pass 1b: Cyril of Jerusalem head-verse extraction (~18 links from Lectures 1-18 + 5 scripture-lesson refs from Mystagogical Lectures)**
>    - Pass 2: Augustine head-verse linking
>    - Pass 3: Basil Hexaemeron head-verse linking
>    - Pass 4: Athanasius head-verse linking (2805)
>    - Pass 5: Mechanical `stiki` extraction across all nine corpora
>    - Pass 6: Thematic editorial tags
> 8. Calendar tags:
>    - All previous Fathers' feast days
>    - **Cyril of Jerusalem March 18**
>    - **MAJOR LITURGICAL-YEAR INTEGRATION: Cyril's Lenten sequence**:
>      - Procatechesis → Forgiveness Sunday / 1st Sunday of Great Lent
>      - Lectures 1-18 → 40 days of Great Lent (one per day or grouped)
>      - Mystagogical Lectures 1-5 → 5 days of Bright Week (Mon-Fri after Pascha)
>    - **Theophany (Jan 6)** → Mystagogical Lectures 2-3 (Baptism, Chrismation)
>    - **Holy Thursday** → Mystagogical Lecture 4 (Eucharist)
> 9. Cross-corpus links:
>    - **Cyril shares NPNF II Vol. 7** with Gregory Nazianzen — surface as "preserved in the same volume"
>    - **Liturgical-tradition cluster**: Cyril + Basil's *De Spiritu Sancto* + Chrysostom's Mystagogical-relevant homilies for "early Christian liturgical practice" theme
>    - **Catechetical-tradition cluster**: Cyril + Augustine's *De Catechizandis Rudibus* (1303) — patristic catechesis comparison
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files
> - Phase-2 acquisition (Cyril's letters; modern critical editions; etc.)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/cyril-jerusalem/`
- Files: 25 `.html` + 1 `provenance_*.json` (+ ~29 legacy `.md` files to ignore)
- Total raw HTML: ~1.01 MB
- Works: 1 (entire New Advent Cyril of Jerusalem corpus = NPNF Series II Vol. 7 Cyril selection)
- Largest single lecture: `310113.html` 81 KB (Lecture 13 — On the Crucifixion)
- Smallest substantive lecture: `310108.html` 17 KB (Lecture 8 — On the Almighty)
- Multi-sub-page works: 1
- Self-contained works: 0
- Translator: **Edwin Hamilton Gifford** (uniform across corpus)
- Series: NPNF Series II Vol. 7 (shared with Gregory Nazianzen — different translator)

## Appendix B — Acquisition log

`content/raw/_index/acquisition_log_phase1_20260520T213414.json` — 1 work OK, 0 errors, 25 files downloaded on 2026-05-20.

## Appendix C — Sample files inspected for this plan

- `3101.html` (Catechetical Lectures index) — bare line-broken TOC of 24 lectures
- `310104.html` (Lecture 4, On the Ten Points of Doctrine) — **head-verse epigraph pattern with `<a href="../bible/col002.htm#verse8">Colossians 2:8</a>`**, internal `<p><strong>I. Of God.</strong></p>` subsections
- `310119.html` (Mystagogical Lecture 1, On the Renunciation of Satan) — **scripture-lesson pattern** with whole-book Bible link `<a href="../bible/1pe000.htm">First General Epistle of Peter</a>`
- `provenance_3101.json` — provenance schema
