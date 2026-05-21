# John of Damascus Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw John of Damascus HTML corpus downloaded from New Advent.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 9** — Schaff & Wace eds., 1899. Public domain. **Translators: E.W. Watson and L. Pullan.**

> **Companion docs:** [Augustine](augustine-raw-content-integration-plan.md) · [Gregory of Nyssa](gregory-of-nyssa-raw-content-integration-plan.md) · [Athanasius](athanasius-raw-content-integration-plan.md) · [Basil](basil-raw-content-integration-plan.md) · [Chrysostom](chrysostom-raw-content-integration-plan.md) · [Gregory Nazianzen](gregory-nazianzen-raw-content-integration-plan.md) · [Ignatius](ignatius-raw-content-integration-plan.md) · [Irenaeus](irenaeus-raw-content-integration-plan.md) · [Cyril of Jerusalem](cyril-jerusalem-raw-content-integration-plan.md)
>
> Most HTML patterns are identical across all ten corpora. This doc highlights John Damascene's distinctive features:
> 1. **The first systematic Eastern theology summa** — *De Fide Orthodoxa* (Exposition of the Orthodox Faith) is the foundational text from which medieval Eastern theology was structured
> 2. **NPNF II Vol. 9 (1899)** — the latest-dated source volume in the patristic corpus so far (a decade later than Vol. 4-7)
> 3. **No mechanically-extractable head-verse pattern** — this is a systematic theology, not a sermon series. Bible linking is via inline `stiki` refs only.
> 4. **Massive cross-corpus role** — John of Damascus synthesizes everything that came before; his Paschal Canon (NOT in this corpus) is the source of the Orthodox Easter hymnody that paraphrases Gregory Nazianzen Oration 45.

---

## 1. Where the John of Damascus files are located

```
content/raw/fathers/john-damascus/
```

Same per-author convention as the other nine Fathers.

---

## 2. What files were downloaded

| Item | Count |
|---|---|
| `*.html` raw files | **5** (1 index + 4 book sub-pages) |
| `provenance_<work_id>.json` files | **1** |
| Legacy `*.md` files | ~5 |
| **Total raw HTML size** | **~0.62 MB** |

**File-naming convention:**

| Filename | Meaning |
|---|---|
| `3304.html` | Exposition of the Orthodox Faith — index |
| `33041.html` | Book I (On God / Trinity) — 99 KB |
| `33042.html` | Book II (On Creation, Angels, Demons, Man) — 153 KB |
| `33043.html` | Book III (On the Incarnation / Christology) — 176 KB |
| `33044.html` | Book IV (On Sacraments, Mary, Last Things, Scripture canon) — 199 KB |

Sub-page IDs use **5-digit format** (`3304N` where N = book number 1–4). Same 1-digit-suffix convention as Augustine's 1408, Athanasius's 2816, Basil's 3201 Hexaemeron, etc. Handled by the post-regex-fix downloader.

Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T214111.json` — 1 work OK, 0 errors, 5 files.

---

## 3. Major works represented

**One work: Exposition of the Orthodox Faith** (also known as *De Fide Orthodoxa* — the third part of John's larger trilogy *Fountain of Knowledge*).

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **3304** | Exposition of the Orthodox Faith | treatise | 4 books | **THE first systematic summa of Eastern Christian theology** — a comprehensive synthesis of patristic doctrine in 4 books / ~100 chapters total. Influenced both Orthodox theological tradition and (via Latin translation in the 12th c.) Western Scholasticism. |

### Book-by-book structure

| Book | File | Size | Theme |
|---|---|---|---|
| **Book I** | 33041 | 99 KB | **On God** — God's incomprehensibility, the Trinity, attributes of God, Trinitarian processions |
| **Book II** | 33042 | 153 KB | **On Creation** — angelic hierarchy, demons, the visible creation, man (anthropology), the Fall, providence |
| **Book III** | 33043 | 176 KB | **On the Incarnation (Christology)** — full assumption of human nature, hypostatic union, the two wills (dyothelitism), the Theotokos |
| **Book IV** | 33044 | 199 KB | **On Sacraments, Resurrection, and Last Things** — Baptism, Eucharist, Mary (Mariology), the Cross, Sunday, icons, the Scripture canon, the resurrection, eschatology |

### Notable absences

John of Damascus's New Advent corpus is **highly incomplete** relative to his actual output:

- **The Three Treatises on the Divine Images** (*Three Apologies Against Those Who Attack the Divine Images*) — John's **most famous and theologically central work** for the Orthodox iconographic tradition. Defends the veneration of icons during the iconoclastic controversy (726–842). **NOT on New Advent.** Essential Phase-2 acquisition.
- **Fountain of Knowledge Parts I and II** — *Philosophical Chapters* (Dialectic) and *On Heresies*. Only Part III (Exposition) is on New Advent.
- **The Sacred Parallels** (*Sacra Parallela*) — a massive florilegium of patristic and Scripture passages organized by topic.
- **The Liturgical Hymns** — including:
  - **The Paschal Canon** (sung at every Orthodox Pascha midnight service) — paraphrases Gregory Nazianzen Oration 45 (cross-link with Gregory Nazianzen plan §10.5)
  - The Octoechos hymns
  - Hymns for the major feasts
- **Barlaam and Josaphat** — a Christianized version of the Buddha legend; traditionally attributed to John (now disputed)

**Phase-2 acquisition priorities (in order):**
1. Andrew Louth, *St. John of Damascus: Three Treatises on the Divine Images* (SVS Press, 2003) — modern translation of the iconodule treatises
2. Frederic Chase, *Saint John of Damascus: Writings* (Fathers of the Church series) — includes the Three Treatises on the Divine Images, *On Heresies*, and *The Philosophical Chapters*
3. Orthodox liturgical books for the Paschal Canon and other hymns
4. Migne PG 94–96 (Greek + Latin, public domain — but no English)

**Implication:** Without the *Three Treatises on the Divine Images*, the John of Damascus corpus is missing what is arguably his most important contribution to Orthodox theology and spirituality. The library should clearly flag this absence and prioritize Phase-2 acquisition.

---

## 4. How the files are structured internally

Identical shell to the other corpora — `<div id="springfield2">`, `<div class="pub">`, etc.

---

## 5. One file per work? Per section?

One multi-sub-page work (3304 with 4 books). Each book sub-page contains many `<h2>Chapter N. {Title}</h2>` sections internally.

---

## 6. HTML patterns inside content pages

Patterns are identical to the other NPNF corpora. **John of Damascus-specific notes below.**

### 6.1 Index page

Bare line-broken TOC with all-caps book labels:

```html
<h1>An Exposition of the Orthodox Faith</h1>
<p>
  <a href="../fathers/33041.htm">BOOK I</a>
  <br><a href="../fathers/33042.htm">BOOK II</a>
  <br><a href="../fathers/33043.htm">BOOK III</a>
  <br><a href="../fathers/33044.htm">BOOK IV</a>
</p>
```

No descriptive blurbs for each book (unlike Irenaeus's *Adv. Haer.* index which had detailed chapter summaries).

### 6.2 Book sub-page structure

Each book contains many `<h2>Chapter N. {Title}.</h2>` headings followed by paragraphs:

```html
<h1>An Exposition of the Orthodox Faith (Book I)</h1>
<p>...Gumroad banner...</p>

<h2>Chapter 1. That the Deity is incomprehensible, and that we ought not to pry into and meddle with the things which have not been delivered to us by the holy Prophets, and Apostles, and Evangelists.</h2>
<p><em>No one has seen God at any time; the Only-begotten Son, which is in the bosom of the Father, He has declared Him</em>. The Deity, therefore, is ineffable and incomprehensible...</p>
<p>God, however, did not leave us in absolute ignorance...</p>

<h2>Chapter 2. Concerning things utterable and things unutterable, and things knowable and thing unknowable.</h2>
<p>It is necessary, therefore, that one who wishes to speak or to hear of God should understand clearly...</p>
...
```

**Chapter heading style:** standard `<h2>Chapter N. {Long descriptive title}.</h2>` — same as Athanasius, Augustine NPNF First Series, etc. Chapter titles are often **very long and descriptive** (sometimes a full sentence).

### 6.3 Paragraph numbering

**Paragraphs are NOT numbered** in this NPNF translation. Unlike Augustine/Basil/Chrysostom NPNF (which use `<p>1. ...</p>` numbering), and unlike Gregory Nazianzen (Roman numerals), John of Damascus uses **bare `<p>...</p>` tags** with no leading numerals.

**Implication for citation:** The canonical citation form for *Exposition of the Orthodox Faith* is "**Exp. fid. I.4**" (book + chapter, no paragraph subnumber). This is simpler than Augustine ("*Conf.* 1.3.3" = book + chapter + paragraph) or Chrysostom ("*Hom. in Matt.* 5.4" = homily + paragraph). The parser should preserve chapter-level addressing only.

### 6.4 No head-verse epigraph pattern

Unlike Chrysostom, Cyril of Jerusalem, and Basil's Hexaemeron, **John of Damascus's chapters do NOT open with a head-verse hyperlink.** Each chapter dives directly into theological exposition. **No mechanical head-verse extraction is possible** for this corpus.

This is consistent with the work's genre — a systematic theology, not a sermon series or commentary. Bible references are integrated throughout the body of each chapter, not anchored at the chapter-opening.

### 6.5 Scripture references — `<span class="stiki">`

Standard pattern. **Density is moderate** — John cites Scripture frequently but not as densely as Chrysostom or Augustine. Estimated **800–1,500 stiki references** across the 5 files.

**Notably:** Book IV Chapter 17 ("Concerning Scripture") contains John's enumeration of the canonical OT and NT books — a valuable witness to the 8th-century Eastern canon. This chapter could be specially flagged for scholars interested in canon history.

### 6.6 Citation footer

```html
<span id="srctrans">Translated by E.W. Watson and L. Pullan.</span>
From <span id="srcwork">Nicene and Post-Nicene Fathers, Second Series</span>,
<span id="srcvolume">Vol. 9.</span>
<span id="srced">Edited by Philip Schaff and Henry Wace.</span>
<span id="srcyear">1899.</span>
```

**NPNF II Vol. 9 (1899)** — this is the **latest publication year** of any NPNF volume in the patristic library so far. (NPNF II Vols. 4-8 are 1892-1895; Vol. 9 is 1899; Vol. 14 is 1900s for some later works.)

**Important note about NPNF II Vol. 9:** this volume is a mixed collection that includes:
- John of Damascus (this corpus): *Exposition of the Faith*
- **Hilary of Poitiers**: *On the Trinity*, *On the Councils*, *Homilies on the Psalms* (separate corpus, not yet acquired)
- **John Cassian**: *Institutes*, *Conferences* (separate corpus, not yet acquired)

When those corpora are acquired, the BibliographicEdition for "NPNF II Vol. 9 (1899)" will be shared between John of Damascus, Hilary, and Cassian.

---

## 7. How clean is the HTML?

Same level as the other corpora. **No new edge cases** in John of Damascus.

The Watson-Pullan 1899 translation is clean, scholarly Victorian English. The Greek-text-in-Greek-letters convention seen in some other corpora (e.g., Athanasius 2805) is rare here — terms are mostly translated/transliterated.

---

## 8. Extractable metadata

| Field | Source | John of Damascus example |
|---|---|---|
| Author | Folder + `<title>` | `John of Damascus` |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `3304` |
| Work title | `<h1>` of index | `An Exposition of the Orthodox Faith` |
| Book number | Filename suffix digit | `1`–`4` |
| Book title | `<h1>` of sub-page | `An Exposition of the Orthodox Faith (Book I)` |
| Chapter number | `<h2>Chapter N. {Title}</h2>` heading text | `1`, `2`, ..., `~30` per book |
| Chapter title | After `Chapter N. ` in heading | `That the Deity is incomprehensible, and that we ought not to pry...` |
| Paragraph | Bare `<p>` tags (no numbering) | — |
| Translator | `<span id="srctrans">` | `Translated by E.W. Watson and L. Pullan.` (uniform across corpus) |
| Series | `<span id="srcwork">` | `Nicene and Post-Nicene Fathers, Second Series` |
| Volume | `<span id="srcvolume">` | `Vol. 9.` |
| Editor | `<span id="srced">` | `Edited by Philip Schaff and Henry Wace.` |
| Year | `<span id="srcyear">` | `1899.` |
| Bible references | `<span class="stiki">` blocks | ~800–1,500 estimated |
| Work type | provenance JSON `work_type` | `treatise` |

---

## 9. Normalization to Theosis library records

### Person

```ts
Person {
  id:          "person.john-of-damascus"
  display:     "John of Damascus"
  also_known:  ["John Damascene", "St. John Damascene", "Ioannes Damascenus", "Mansur ibn Sarjun", "Yuhanna al-Dimashqi"]
  born:        c. 675/676
  died:        749
  feast_day:   "12-04"        // Orthodox calendar: December 4
  feast_west:  "12-04"        // Catholic Western feast day (same)
  tradition:   "Last of the Greek Fathers; bridge between patristic theology and medieval scholasticism; Doctor of the Church; champion of icons during the Iconoclastic Controversy; monk at Mar Saba near Jerusalem"
  see:         "Mar Saba (monastery near Jerusalem, in Muslim-ruled territory)"
  ecumenical_role: "Systematized Greek patristic theology in De Fide Orthodoxa; defended the veneration of icons in the Three Treatises against the iconoclasts; major hymnographer of the Orthodox liturgical tradition (Paschal Canon, Octoechos hymns)"
}
```

**Orthodox significance:**
- **Last of the Greek Fathers** — chronologically the final figure in the patristic age (8th century)
- **Defender of icons** during the Iconoclastic Controversy — his *Three Treatises on the Divine Images* (NOT in this corpus; Phase-2 acquisition) are foundational for Orthodox iconographic theology
- **Author of the Paschal Canon** — sung at every Orthodox Pascha midnight service. Paraphrases Gregory Nazianzen Oration 45. (NOT in this corpus — Phase-2 acquisition)
- **Major hymnographer** — composed many of the Octoechos hymns still in Orthodox use
- **Doctor of the Church** (declared by Pope Leo XIII in 1890)
- His **Exposition of the Orthodox Faith** is THE systematic theology of Eastern Christianity — comparable in scope and influence to Aquinas's *Summa* in the West (which it influenced via Latin translation)
- Lived under Muslim Umayyad rule in Damascus, then withdrew to the Mar Saba monastery near Jerusalem
- Feast day **December 4** (Orthodox and Catholic)

### Work

1 row total — single-work corpus.

```ts
Work {
  id:               "work.john-damascus.3304"
  author_id:        "person.john-of-damascus"
  title:            "An Exposition of the Orthodox Faith"
  alt_titles:       ["De Fide Orthodoxa", "Exposition of the Faith", "Έκδοσις ἀκριβὴς τῆς ὀρθοδόξου πίστεως"]
  work_type:        "treatise"
  composition_date: "c. 743"
  language_original:"Greek"
  has_subsections:  true
  section_count:    4 books    // ~25-30 chapters per book
  source_id:        "src.newadvent.3304"
  description:      "The third and most influential part of John's trilogy 'Fountain of Knowledge'; the first systematic summa of Eastern Christian theology; 4 books covering God, Creation, Christology, and the Sacraments/Eschatology"
  trilogy_part:     3   // of "Fountain of Knowledge" — Parts I (Philosophical Chapters) and II (On Heresies) are NOT in this corpus
}
```

### WorkSection

Two-tier modeling:
- **Option A**: one WorkSection per book (4 rows). Coarse — doesn't enable chapter-level deep-linking.
- **Option B (recommended)**: one WorkSection per `<h2>Chapter N</h2>` inside each book. Yields **~100-110 WorkSection rows** across all 4 books (Book I has ~14 chapters, II has ~30, III has ~29, IV has ~27).

```ts
WorkSection {
  id:              "section.john-damascus.3304.1.1"
  work_id:         "work.john-damascus.3304"
  order_index:     1
  book_number:     1
  chapter_number:  1
  section_type:    "chapter"
  short_label:     "Exp. fid. I.1"   // standard scholarly citation form
  display_title:   "That the Deity is incomprehensible, and that we ought not to pry into and meddle with the things which have not been delivered to us by the holy Prophets, and Apostles, and Evangelists"
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.3304"
  bible_refs:      BibleRef[]
}
```

### SourceRecord

One record (shared with future Hilary and Cassian corpora via the NPNF II Vol. 9 BibliographicEdition):

```ts
SourceRecord {
  id:              "src.newadvent.3304"
  work_id:         "work.john-damascus.3304"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/3304.htm"
  translator:      "E.W. Watson and L. Pullan"
  series:          "Nicene and Post-Nicene Fathers, Second Series"
  volume:          "Vol. 9"
  editor:          "Philip Schaff and Henry Wace"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1899
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/john-damascus/3304.html"
  provenance_json: "content/raw/fathers/john-damascus/provenance_3304.json"
}
```

---

## 10. Bible-linking strategy

John of Damascus is **systematic theology**, not exegetical commentary. Bible-linking is primarily via inline references plus thematic mapping.

### 10.1 No head-verse linking

Unlike Chrysostom, Cyril of Jerusalem, Basil's Hexaemeron, and Augustine's commentary works, John of Damascus's chapters have **no opening head-verse epigraph**. No mechanical head-verse extraction.

### 10.2 Inline scripture refs

Extract all `<span class="stiki">` blocks. Estimated 800-1,500 BibleRef rows across the 5 files.

### 10.3 Thematic Bible-linking — book-level themes

Each book has clear thematic anchors:

| Book | Major themes | Anchor passages |
|---|---|---|
| **Book I (On God)** | Incomprehensibility, Trinity, divine attributes | Exodus 3:14 (I AM), John 1:1, Matt 28:19 (Trinitarian formula), Deut 6:4 (Shema), 1 Cor 8:6 |
| **Book II (On Creation)** | Angels, fall, providence, anthropology | Genesis 1-3, Isaiah 14, Ezekiel 28, Romans 5, Psalms 103 (104 LXX) |
| **Book III (On the Incarnation)** | Christology, two natures, Theotokos | John 1:14, Phil 2:5-11, Luke 1-2, Heb 1, Col 1:15-20, Isaiah 7:14 |
| **Book IV (Sacraments, Last Things)** | Baptism, Eucharist, Mary, the Cross, Sunday, icons (sort of), the canon, resurrection | 1 Cor 11 (Eucharist), Matt 28 (resurrection), John 6 (Bread of Life), Acts 2 (Pentecost), 1 Cor 15 (resurrection), Rev 20-22 |

**Important sub-chapters worth thematic flagging:**
- **Book IV Chapter 9** (Concerning Faith) and **Chapter 10** (Concerning Baptism) — sacramental theology
- **Book IV Chapter 13** (Concerning the Holy and Immaculate Mysteries of the Lord) — **the foundational Orthodox systematic Eucharistic theology** in patristic literature
- **Book IV Chapter 14** (Concerning the genealogy of the Lord and concerning the holy Mother of God) — major Mariological text
- **Book IV Chapter 16** (Concerning images / icons) — John's brief defense of icons in the Exposition (his fuller treatment is in *Three Treatises*)
- **Book IV Chapter 17** (Concerning Scripture) — John's enumeration of the canonical books of the OT and NT (valuable for canon history)
- **Book IV Chapter 27** (That God is not the cause of evils)
- **Book IV Chapter 29** (Against the Manichaeans, concerning evil)

### 10.4 Lectionary linking — Orthodox calendar

- **December 4 (Feast of St. John of Damascus)** — surface entire corpus.
- **First Sunday of Great Lent / Sunday of Orthodoxy** — when the Orthodox Church celebrates the triumph of icons over iconoclasm. John of Damascus is the iconodule par excellence; this feast is essentially his theological victory. The **Three Treatises on the Divine Images** are the natural reading (Phase-2). For now, **Exposition Book IV Chapter 16** (on images) can be surfaced.
- **Pascha (Easter) midnight service** — the **Paschal Canon** by John of Damascus is sung at every Orthodox Pascha. **Not in this corpus** — Phase-2 acquisition essential. Until then, cross-link to Gregory Nazianzen Oration 45 (the source John paraphrased).
- **Major feasts of the Theotokos (Dormition Aug 15, Nativity of Mary Sep 8, Annunciation Mar 25)** — Exposition Book III on the Incarnation + Book IV Chapter 14 (Theotokos).
- **Christmas / Nativity (Dec 25)** — Exposition Book III on the Incarnation.

### 10.5 Recommended Bible-linking pass order

1. **Pass 1 — Inline `stiki` extraction**: ~800-1,500 BibleRef rows.
2. **Pass 2 — Thematic mapping**: ~30-50 hand-curated entries (one per major chapter).
3. **Pass 3 — Calendar mapping**: Dec 4 feast, Sunday of Orthodoxy, Pascha (with Phase-2 Paschal Canon link), Christmas, Marian feasts.

---

## 11. Which John of Damascus works/chapters are most useful

In a 1-work corpus, ranking individual chapters:

| Rank | Chapter | Why it's valuable |
|---|---|---|
| 1 | **Book IV Chapter 13** (Concerning the Holy and Immaculate Mysteries of the Lord) | Foundational Orthodox Eucharistic theology — explicit real-presence, transformation language. |
| 2 | **Book III** (entire book on the Incarnation) | The most systematic patristic Christology — assimilates Cyril of Alexandria, the Cappadocians, Maximus the Confessor. Includes dyothelitism (two wills). |
| 3 | **Book I Chapters 1-4** (On Divine Incomprehensibility) | Apophatic theology par excellence — pairs with Gregory of Nyssa and Pseudo-Dionysius. |
| 4 | **Book IV Chapter 14** (On the Theotokos) | Major Mariological text — addresses Mary's role in salvation history. |
| 5 | **Book IV Chapter 16** (On Images) | Brief but central defense of icons within the systematic theology. |
| 6 | **Book IV Chapter 17** (On Scripture) | John's biblical canon — important for canon-history scholarship. |
| 7 | **Book II Chapters 12-30** (Anthropology, Fall, Providence) | Patristic anthropology — pairs with Gregory of Nyssa *On the Making of Man*. |
| 8 | **Book I Chapters 8-14** (On the Trinity) | Comprehensive Trinitarian theology — synthesizes Cappadocians, Athanasius. |

---

## 12. Which John of Damascus works are mostly general library texts

Within this 1-work corpus, all 4 books are essential reading for serious Orthodox theology. The least immediately accessible chapters are:
- **Book II Chapters 6-11** (on demons and angelic hierarchy) — useful but specialized
- **Book IV Chapter 21-26** (on various miscellaneous topics) — fragmentary, less systematic

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module covers ~99% of John of Damascus. Specific notes:

### 13.1 Chapter chunking by `<h2>Chapter N. {Title}.</h2>`

Standard `<h2>` chunking. The chapter number is in the heading text — use a regex to extract:

```python
CHAPTER_HEADING = re.compile(r"^Chapter\s+(\d+)\.\s+(.+?)\.?\s*$", re.I)

def parse_chapter_heading(h2_text: str):
    m = CHAPTER_HEADING.match(h2_text.strip())
    if m:
        return int(m.group(1)), m.group(2)
    return None, h2_text
```

### 13.2 No paragraph numbering

Paragraphs in this NPNF translation are NOT numbered. The parser should treat each `<p>` as a paragraph but **not attempt to extract a leading numeral**. The citation form for *Exp. fid.* is book + chapter only (no paragraph subnumber).

### 13.3 Book-number extraction from filename

The sub-page ID encodes the book number directly: `3304N` where N=1–4. Trivial extraction.

### 13.4 Shared BibliographicEdition for NPNF II Vol. 9

When Hilary of Poitiers and John Cassian are acquired (both in NPNF II Vol. 9), the `BibliographicEdition` row for "NPNF II Vol. 9 (1899) — Schaff & Wace eds." is shared. Each author's `SourceRecord` has its own translator field.

---

## 14. Risks, edge cases, cleanup issues

### 14.1 Missing Three Treatises on the Divine Images

CRITICAL absence: John's most theologically important work (defending icons) is **not on New Advent**. The library should:
- Note this absence prominently in any "complete John of Damascus" view
- Cross-link to a Phase-2 source recommendation (Andrew Louth's SVS Press translation)
- Possibly surface the *Sunday of Orthodoxy* in the calendar with a note: "St. John of Damascus's full defense of icons is not yet in our library — Phase 2"

### 14.2 Missing Paschal Canon

The **Paschal Canon** is one of the most-sung Orthodox liturgical texts in the world (every Pascha midnight service). It's **not on New Advent** because it's a liturgical hymn, not a treatise. Phase-2 acquisition from any Orthodox liturgical source.

**Cross-link until Phase-2:** Gregory Nazianzen Oration 45 (Second Oration on Easter) — the source John paraphrased.

### 14.3 No paragraph numbering

Unlike Augustine/Basil/Chrysostom NPNF, John of Damascus paragraphs are unnumbered. Citation form is chapter-only.

### 14.4 Long chapter titles

Some chapter titles are full-sentence-length (e.g., Chapter 1 of Book I is 23 words). The schema's `display_title` field needs to accommodate strings up to ~250 characters.

### 14.5 LXX vs MT versification

Same risk as the other Greek Fathers. John cites LXX.

### 14.6 Phase-2 cross-corpus links

When acquired:
- **Three Treatises on Divine Images** → cross-link to Sunday of Orthodoxy
- **Paschal Canon** → cross-link to Gregory Nazianzen Oration 45
- **Octoechos hymns** → cross-link to the daily Octoechos cycle
- **Philosophical Chapters / On Heresies** → completes the Fountain of Knowledge trilogy

### 14.7 Compute scale

5 files × ~125 KB avg = trivial. Smallest acquisition since Ignatius.

---

## 15. Recommended next step for a separate integration chat

> **"Build the ten-Father patristic ingestion pipeline."**
>
> 1. Read all ten planning docs.
> 2. Read the Theosis library schema; confirm Person/Work/WorkSection/SourceRecord/BibleRef shapes.
> 3. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py`.
> 4. Confirm Psalter versification (LXX vs MT).
> 5. Build `scripts/parse_newadvent/` as a shared module. Test on **ten end-to-end cases**:
>    - Augustine **1101**
>    - Gregory of Nyssa **2914**
>    - Athanasius **2802** + **28161**
>    - Basil **3201** + **32011** + **3203**
>    - Chrysostom **2310** + **23101**
>    - Gregory Nazianzen **3102** + **310240** + **3103a**
>    - Ignatius **0104** + **0107** + **0114**
>    - Irenaeus **0103** + **0103302** + **0134**
>    - Cyril of Jerusalem **3101** + **310104** + **310119**
>    - **John of Damascus 3304 + 33041 (Book I — apophatic theology)** — exercises 5-digit sub-page, long chapter titles, no paragraph numbering
> 6. Expand to all 138 works = 48 Augustine + 15 Gregory of Nyssa + 21 Athanasius + 3 Basil + 36 Chrysostom + 2 Gregory Nazianzen + 9 Ignatius + 2 Irenaeus + 1 Cyril of Jerusalem + 1 John of Damascus = **2,118 HTML files**.
> 7. Bible-linking passes:
>    - Pass 1: Chrysostom head-verse extraction (~470 links)
>    - Pass 1b: Cyril of Jerusalem head-verse extraction (~18 links)
>    - Pass 2: Augustine head-verse linking
>    - Pass 3: Basil Hexaemeron head-verse linking
>    - Pass 4: Athanasius head-verse linking (2805)
>    - Pass 5: Mechanical `stiki` extraction across all ten corpora (John of Damascus contributes ~800–1,500 refs)
>    - Pass 6: Thematic editorial tags
> 8. Calendar tags:
>    - All Fathers' feast days
>    - **John of Damascus December 4**
>    - **Sunday of Orthodoxy (1st Lent)** — features John's defense of icons (Book IV Ch. 16 here; *Three Treatises* in Phase 2)
>    - **Pascha (Easter) midnight** — flagged with "Paschal Canon Phase-2 acquisition needed"
>    - Marian feasts → Exposition III + IV.14
> 9. Cross-corpus links:
>    - **John of Damascus Paschal Canon** ↔ **Gregory Nazianzen Oration 45** (paraphrase relationship — flag this for Phase-2 when the Paschal Canon is acquired)
>    - **John of Damascus Christology** ↔ **Cyril of Alexandria, Athanasius, Cappadocians** (synthesis relationship — when those corpora are acquired)
>    - **John of Damascus shares NPNF II Vol. 9** with future Hilary of Poitiers and John Cassian corpora
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files
> - Phase-2 acquisition (Three Treatises on Divine Images, Paschal Canon, Octoechos hymns, Philosophical Chapters, On Heresies — for John of Damascus alone)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/john-damascus/`
- Files: 5 `.html` + 1 `provenance_*.json` (+ ~5 legacy `.md` files to ignore)
- Total raw HTML: ~0.62 MB
- Works: 1 (entire New Advent John of Damascus corpus = NPNF Series II Vol. 9 John of Damascus selection)
- Largest file: `33044.html` 199 KB (Book IV — Sacraments, Mary, Last Things)
- Multi-sub-page works: 1
- Self-contained works: 0
- Translators: **E.W. Watson and L. Pullan** (uniform across corpus)
- Series: NPNF Series II Vol. 9 (1899) — shared with future Hilary of Poitiers and John Cassian corpora

## Appendix B — Acquisition log

`content/raw/_index/acquisition_log_phase1_20260520T214111.json` — 1 work OK, 0 errors, 5 files downloaded on 2026-05-20.

## Appendix C — Sample files inspected for this plan

- `3304.html` (Exposition index) — bare line-broken TOC of 4 books
- `33041.html` (Book I — On God) — `<h2>Chapter N. {Title}.</h2>` pattern, NPNF Vol. 9 citation footer, no paragraph numbering, Watson-Pullan translation
- `provenance_3304.json` — provenance schema
