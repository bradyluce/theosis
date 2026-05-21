# Irenaeus of Lyons Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Irenaeus of Lyons HTML corpus downloaded from New Advent. No parser or app code has been written yet.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/` (New Advent — Church Fathers)
**Translations:** **Ante-Nicene Fathers (ANF), Vol. 1** — Roberts/Donaldson/Coxe eds., 1885. Public domain. **Two translators across the corpus:**
- Adversus Haereses (0103): **Alexander Roberts and William Rambaut**
- Fragments (0134): **Alexander Roberts and James Donaldson**

> **Companion docs:** [Augustine](augustine-raw-content-integration-plan.md) · [Gregory of Nyssa](gregory-of-nyssa-raw-content-integration-plan.md) · [Athanasius](athanasius-raw-content-integration-plan.md) · [Basil](basil-raw-content-integration-plan.md) · [Chrysostom](chrysostom-raw-content-integration-plan.md) · [Gregory Nazianzen](gregory-nazianzen-raw-content-integration-plan.md) · [Ignatius](ignatius-raw-content-integration-plan.md)
>
> **Second ANF corpus** (after Ignatius). Most HTML patterns are identical to the other corpora. This doc highlights Irenaeus's most distinctive features:
> 1. **The largest single-work sub-page count of any corpus** — *Adversus Haereses* has 173 sub-pages (one per chapter)
> 2. A **structured book/chapter encoding in the sub-page ID** (`0103BCC` where B=book, CC=chapter)
> 3. The use of **`<span class="h1a">`** (not `<p class="h1a">`) for the chapter-summary epigraph
> 4. **Tight cross-corpus link to Polycarp** — Irenaeus was Polycarp's disciple

---

## 1. Where the Irenaeus files are located

```
content/raw/fathers/irenaeus/
```

Same per-author convention.

---

## 2. What files were downloaded

| Item | Count |
|---|---|
| `*.html` raw files | **175** (2 indexes + 173 sub-pages + Fragments = self-contained) |
| `provenance_<work_id>.json` files | **2** |
| Legacy `*.md` files | ~7 |
| **Total raw HTML size** | **~3.06 MB** |

**File-naming convention** — Irenaeus uses a **structured book/chapter encoding** in the sub-page ID:

| Pattern | Meaning | Example |
|---|---|---|
| `0103.html` | Adversus Haereses index page | TOC for all 173 chapters across 5 books |
| `0103BCC.html` (7-digit) | Adversus Haereses Book B, Chapter CC | `0103100` = Book I, Preface; `0103101` = Book I, Chapter 1; `0103536` = Book V, Chapter 36 |
| `0134.html` | Fragments from the Lost Writings (self-contained) | Single 35-fragment file |

**The 7-digit sub-page encoding is unique to Irenaeus** among the seven corpora. Decoding:
- `0103` = work ID (Against Heresies)
- `B` = book number (1–5)
- `CC` = chapter number, zero-padded to 2 digits (00 = preface; 01-NN = chapters)

For example:
- Book I has 32 sub-pages: `0103100` (Preface) through `0103131` (Chapter 31)
- Book II has 36 sub-pages: `0103200` through `0103235`
- Book III has 26 sub-pages: `0103300` through `0103325`
- Book IV has 42 sub-pages: `0103400` through `0103441`
- Book V has 37 sub-pages: `0103500` through `0103536`

**Total chapters: 173** (matches the downloaded sub-page count exactly).

Acquisition log: `content/raw/_index/acquisition_log_phase3_20260520T212806.json` — 2 works OK, 0 errors.

---

## 3. Major works represented

Both Irenaeus works on New Advent are present.

| ID | Title | Type | Sub-pages | Size | Notes |
|---|---|---|---|---|---|
| **0103** | Adversus Haereses (Against Heresies) | treatise | **173** (5 books × ~25-42 chapters) | 9 KB index + ~10-40 KB per chapter | **THE foundational anti-Gnostic patristic text**; first systematic Christian theology |
| **0134** | Fragments from the Lost Writings of Irenaeus | treatise | 0 (single ~120 KB self-contained file) | 35 numbered fragments | Surviving snippets from Irenaeus's lost works (notably the famous *Letter to Florinus* recalling Polycarp) |

### Adversus Haereses structure (5 books, 173 chapters)

| Book | Chapter count | Theme |
|---|---|---|
| **Book I** | 32 (preface + 31 chapters) | Description of Gnostic heresies — Valentinians, Marcionites, Basilideans, etc. (an invaluable historical record) |
| **Book II** | 36 | Refutation of Gnosticism by reason (philosophical arguments) |
| **Book III** | 26 | The Rule of Faith; the apostolic tradition; defense of the four-fold Gospel canon |
| **Book IV** | 42 | The recapitulation of Adam in Christ; the unity of the Old and New Testaments |
| **Book V** | 37 | Eschatology; the resurrection of the flesh; the millennium |

### Notable absences

- **The Demonstration of the Apostolic Preaching** (*Epideixis tou apostolikou kerygmatos*) — Irenaeus's other major surviving work. **NOT in ANF Vol. 1** because the work was rediscovered in 1904 in an Armenian translation (after ANF was published in 1885). Available in modern translations: J. Armitage Robinson (1920), Iain MacKenzie (SVS Press), John Behr (Popular Patristics series).
- Other minor lost works (the surviving fragments in 0134 are the only attested traces)

---

## 4. How the files are structured internally

Identical shell to the other corpora — `<div id="springfield2">`, `<div class="pub">`, etc. All standard NPNF/ANF patterns.

---

## 5. One file per work? Per section? **Adversus Haereses uses chapter-level pagination (most fine-grained in the library).**

### Adversus Haereses (0103)

- **Index page (0103.html)** — TOC grouped by `<h2>Book I</h2>`, `<h2>Book II</h2>`, etc., with line-broken anchors for each chapter
- **173 chapter sub-pages** — one HTML file per chapter

This is the **most granular pagination of any work in the library** (Chrysostom's Matthew Homilies had 90 sub-pages; Augustine's Psalm expositions had 150; Irenaeus's *Against Heresies* has 173 chapter-level sub-pages).

### Fragments (0134)

Single self-contained file packaging 35 numbered fragments separated by `<h2>1</h2>`, `<h2>2</h2>`, ..., `<h2>35</h2>` headings. (Fragment 2 is the famous *Letter to Florinus* recalling Polycarp's discipleship under John.)

---

## 6. HTML patterns inside content pages

Patterns are mostly identical to the other corpora. **Irenaeus-specific features below.**

### 6.1 Adversus Haereses index page

The index groups sub-page anchors under `<h2>Book N</h2>` headers, with **descriptive chapter blurbs** inline:

```html
<h2>Book I</h2>
<p>
  <a href="../fathers/0103100.htm"><strong>Preface</strong></a>
  <br><a href="../fathers/0103101.htm"><strong>Chapter 1</strong></a> Absurd ideas of the disciples of Valentinus as to the origin, name, order, and conjugal productions of their fancied aeons...
  <br><a href="../fathers/0103102.htm"><strong>Chapter 2</strong></a> The Propator was known to Monogenes alone...
  ...
</p>

<h2>Book II</h2>
<p>...</p>

...
```

**The chapter blurbs in the index are valuable metadata** — they're the chapter summaries that would otherwise have to be parsed from each sub-page's `<span class="h1a">` element. The parser could extract them directly from the index for a unified chapter-title list.

### 6.2 Chapter sub-page structure

```html
<h1>Against Heresies (Book I, Chapter 1)</h1>
<p>...Gumroad banner...</p>

<span class="h1a">Absurd ideas of the disciples of Valentinus as to the origin, name, order, and conjugal productions of their fancied Æons, with the passages of Scripture which they adapt to their opinions.</span>   <!-- ← chapter summary epigraph -->

<p>1. They maintain, then, that in the invisible and ineffable heights above there exists a certain perfect, pre-existent Æon...</p>

<p>2. These Æons having been produced for the glory of the Father...</p>

<p>3. Such are the thirty Æons in the erroneous system of these men...</p>
```

**Key Irenaeus-specific structural pattern:**

- `<h1>Against Heresies (Book B, Chapter C)</h1>` — encodes book + chapter in the title text (parseable)
- **`<span class="h1a">{chapter summary}</span>`** — chapter summary epigraph, BUT it's a `<span>` not a `<p>`. (Augustine's Confessions used `<p class="h1a">`; Irenaeus uses `<span class="h1a">`. The parser must accept both.)
- Numbered paragraphs `<p>N. ...</p>` (Arabic numerals, NPNF-style)
- No internal sub-chapter `<h2>` markers — the chapter is one continuous text broken into numbered paragraphs

### 6.3 Fragments file (0134) structure

```html
<h1>Fragments from the Lost Writings of Irenaeus</h1>
<p>...Gumroad banner...</p>

<h2>1</h2>
<p>I adjure you, who shall transcribe this book, by our Lord Jesus Christ...</p>

<h2>2</h2>
<p>These opinions, Florinus, that I may speak in mild terms, are not of sound doctrine...</p>

<h2>3</h2>
<p>For the controversy is not merely as regards the day...</p>

...

<h2>35</h2>
<p>...</p>
```

**Bare numeric `<h2>` headings** — no "Fragment N" prefix, just the bare number. The parser should treat each `<h2>` as a fragment-number boundary and label the WorkSection as "Fragment N".

### 6.4 Scripture references — `<span class="stiki">`

Standard pattern. **Density is moderate-to-high** — Irenaeus cites Scripture constantly to refute Gnostic interpretations. Books III-V especially are scripture-saturated. Estimated corpus-wide: **3,000–5,000+ stiki references** across the 175 files.

**Notable for early-Christian textual scholarship:** Irenaeus's citations are critical witnesses to the **four-fold Gospel canon** (he explicitly defends it as four-fold in Book III, Chapter 11), the early Pauline corpus, and the canonical status of John, Acts, and various other NT books.

### 6.5 Citation footer

**ANF, not NPNF** — same convention as Ignatius (0104). Translator differs per work:

```html
<!-- Adversus Haereses (0103) -->
<span id="srctrans">Translated by Alexander Roberts and William Rambaut.</span>
From <span id="srcwork">Ante-Nicene Fathers</span>, <span id="srcvolume">Vol. 1.</span>
<span id="srced">Edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe.</span>
<span id="srcyear">1885.</span>

<!-- Fragments (0134) -->
<span id="srctrans">Translated by Alexander Roberts and James Donaldson.</span>
<!-- (rest same as 0103) -->
```

**William Rambaut** (Adversus Haereses translator) is a new name to the corpus — same year/series/editors as Ignatius's Roberts-Donaldson but a different working pair for the main treatise.

---

## 7. How clean is the HTML?

Same level as the other corpora. **Two Irenaeus-specific quirks:**

1. **`<span class="h1a">`** (span tag, not paragraph) for chapter summaries — parser must accept both `<p class="h1a">` (Augustine) and `<span class="h1a">` (Irenaeus).
2. **Bare numeric `<h2>N</h2>`** markers in 0134 Fragments — no "Fragment" prefix in heading text. Parser must infer the section type from work context.

Otherwise: uniformly clean. The Roberts-Rambaut 1885 translation of *Adversus Haereses* is the standard 19th-century English Irenaeus.

---

## 8. Extractable metadata

| Field | Source | Irenaeus example |
|---|---|---|
| Author | Folder + `<title>` | `Irenaeus of Lyons` |
| Work ID | Filename + `<body id>` + `<link rel=canonical>` | `0103`, `0134` |
| Work title | `<h1>` | `Against Heresies` |
| Book number | Parsed from `<h1>` text "(Book B, Chapter C)" OR sub-page ID's 5th digit | `1`–`5` |
| Chapter number | Parsed from `<h1>` text OR sub-page ID's last 2 digits | `0` (preface), `1`–`42` |
| Chapter summary | `<span class="h1a">` immediately after `<h1>` | "Absurd ideas of the disciples of Valentinus..." |
| Paragraph number | Leading Arabic numeral in `<p>` body | `1`, `2`, `3` |
| **Fragment number** (in 0134) | Bare `<h2>N</h2>` heading | `1`–`35` |
| Source URL | `<link rel="canonical">` or provenance JSON | `https://www.newadvent.org/fathers/0103101.htm` |
| Translator | `<span id="srctrans">` | `Translated by Alexander Roberts and William Rambaut.` (varies per work) |
| Series | `<span id="srcwork">` | `Ante-Nicene Fathers` |
| Volume | `<span id="srcvolume">` | `Vol. 1.` |
| Editor | `<span id="srced">` | `Edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe.` |
| Year | `<span id="srcyear">` | `1885.` |
| Bible references | `<span class="stiki">` blocks | ~3,000–5,000+ estimated total |
| Work type | provenance JSON `work_type` | `treatise` |

---

## 9. Normalization to Theosis library records

### Person

```ts
Person {
  id:          "person.irenaeus-of-lyons"
  display:     "Irenaeus of Lyons"
  also_known:  ["St. Irenaeus", "Irenaeus Lugdunensis", "Irenaeus of Lugdunum"]
  born:        c. 130
  died:        c. 202
  feast_day:   "08-23"        // Orthodox calendar: August 23
  feast_west:  "06-28"        // Catholic Western feast day (June 28)
  tradition:   "Bishop of Lyons (Gaul); disciple of Polycarp (who was disciple of John the Apostle); the foremost anti-Gnostic theologian of the early Church; sometimes called 'father of Catholic theology' or 'first systematic theologian'"
  see:         "Lugdunum (modern Lyons, France)"
  ecumenical_role: "First systematic Christian theologian; defender of the four-fold Gospel canon; originator of the doctrine of recapitulation; key witness to apostolic succession via the Polycarp-John lineage"
  apostolic_succession: "disciple of Polycarp, who was disciple of John the Apostle"
}
```

**Orthodox significance:**
- **Second-generation Apostolic Father** — disciple of Polycarp of Smyrna (who was disciple of John the Apostle). This gives Irenaeus a direct two-step apostolic chain.
- His **doctrine of recapitulation** (*anakephalaiosis*) — that Christ recapitulates all of human history in himself, undoing what Adam did — is foundational to Eastern Christian soteriology
- His **defense of the four-fold Gospel canon** (in *Adv. Haer.* III.11) is the earliest such defense extant
- His **insistence on apostolic succession** is foundational for both Orthodox and Catholic ecclesiology
- **Adversus Haereses** is THE foundational anti-Gnostic patristic text — without it, much of our knowledge of 2nd-century Gnosticism would be lost

### Work

2 rows total — small corpus despite the huge chapter count.

```ts
Work {
  id:               "work.irenaeus.0103"
  author_id:        "person.irenaeus-of-lyons"
  title:            "Against Heresies"
  alt_titles:       ["Adversus Haereses", "Detection and Overthrow of the Pretended but False Gnosis", "On the Detection and Overthrow of the So-Called Gnosis"]
  work_type:        "treatise"
  composition_date: "c. 180"
  language_original:"Greek (original lost); Latin (complete translation survives); Greek fragments survive via quotations"
  has_subsections:  true
  section_count:    173    // chapters across 5 books
  book_count:       5
  source_id:        "src.newadvent.0103"
  description:      "The foundational anti-Gnostic patristic treatise; first systematic Christian theology; 5 books refuting Gnostic systems (Valentinian, Marcionite, etc.) and defending the apostolic Rule of Faith"
}
```

### WorkSection

For *Against Heresies* (0103), **chapter-level granularity is essential** — 173 WorkSection rows, one per chapter. Citation form is "*Adv. Haer.* III.11.8" (book.chapter.paragraph).

```ts
WorkSection {
  id:              "section.irenaeus.0103.1.1"
  work_id:         "work.irenaeus.0103"
  order_index:     2          // chapter 1 of book 1 (preface is order_index 1)
  book_number:     1
  chapter_number:  1
  section_type:    "chapter"
  short_label:     "Adv. Haer. I.1"
  display_title:   "Absurd ideas of the disciples of Valentinus as to the origin, name, order, and conjugal productions of their fancied Æons..."
  body_html:       "<cleaned content>"
  body_text:       "..."
  source_id:       "src.newadvent.0103"
  bible_refs:      BibleRef[]
}
```

For *Fragments* (0134), one WorkSection per `<h2>N</h2>` fragment → 35 rows.

### SourceRecord

Two source records (one per work) sharing ANF Vol. 1 / 1885 / Roberts-Donaldson-Coxe editor team, but **different translators**:

- 0103: Roberts + Rambaut
- 0134: Roberts + Donaldson

```ts
SourceRecord {
  id:              "src.newadvent.0103"
  work_id:         "work.irenaeus.0103"
  source_name:     "New Advent — newadvent.org/fathers/"
  source_url:      "https://www.newadvent.org/fathers/0103.htm"
  translator:      "Alexander Roberts and William Rambaut"   // ← differs per work
  series:          "Ante-Nicene Fathers"
  volume:          "Vol. 1"
  editor:          "Alexander Roberts, James Donaldson, and A. Cleveland Coxe"
  publisher:       "Buffalo, NY: Christian Literature Publishing Co."
  publication_year: 1885
  revised_by:      "Kevin Knight (New Advent)"
  license:         "public_domain_translation; transcription © New Advent LLC"
  raw_file_path:   "content/raw/fathers/irenaeus/0103.html"
  provenance_json: "content/raw/fathers/irenaeus/provenance_0103.json"
}
```

---

## 10. Bible-linking strategy

Irenaeus is **scripture-saturated polemic** — he cites Scripture constantly to refute Gnostic misinterpretations and to defend the Rule of Faith.

### 10.1 No verse-commentary works

*Against Heresies* is structured by **anti-heretical argument**, not verse-by-verse exegesis. No head-verse linking is mechanically extractable.

### 10.2 Inline scripture refs — large volume

Extract all `<span class="stiki">` blocks. Estimated **3,000–5,000+ BibleRef rows** across the 175 files — comparable to Chrysostom's density per-file but with fewer total files.

**Books III–V are the most scripture-dense:**
- Book III defends the four-fold Gospel canon and apostolic tradition — heavy NT citation
- Book IV expounds Christ as recapitulation of Adam — heavy OT/NT typological linking
- Book V argues for bodily resurrection — heavy Pauline citation (1 Cor 15)

### 10.3 Thematic Bible-linking

Each book has clear thematic anchors:

| Book | Thematic Bible passages |
|---|---|
| **Book I (Describing Gnosticism)** | Various NT passages Irenaeus shows the Gnostics misuse — Matt 20:1–16 (parable of vineyard workers), John 1, 1 Cor 15:50 |
| **Book II (Refuting Gnosticism)** | Genesis 1 (creation, against Gnostic dualism), Romans 11 (against esoteric "wisdom"), Wisdom of Solomon |
| **Book III (Rule of Faith)** | Matt 28:19 (Trinitarian baptismal formula), John 1, Luke 24, Acts (apostolic preaching), 1 Tim 6:20 (against "falsely-called knowledge"), the four Gospels (defended as four-fold) |
| **Book IV (Recapitulation)** | Genesis 2-3 (Adam), Romans 5:12-21 (Adam-Christ typology), Luke 1-2 (Mary as new Eve), Hebrews 1, Galatians 4 |
| **Book V (Resurrection)** | 1 Cor 15 (resurrection chapter), Ezekiel 37 (dry bones), Revelation 20 (millennium), Romans 8 (groaning creation), Daniel 7 |

### 10.4 The Polycarp link (Fragment 2 — Letter to Florinus)

**Fragment 2 of 0134 is one of the most famous patristic biographical passages** — Irenaeus recalls his childhood discipleship under Polycarp:

> "While I was yet a boy, I saw you in Lower Asia with Polycarp... so that I can even describe the place where the blessed Polycarp used to sit and discourse... how he would speak of his familiar intercourse with John, and with the rest of those who had seen the Lord; and how he would call their words to remembrance."

This is the **primary textual evidence for the John → Polycarp → Irenaeus apostolic chain** — foundational for apostolic-succession theology. The integration should surface this fragment specifically and cross-link to the Polycarp corpus.

### 10.5 Lectionary linking — Orthodox calendar

- **August 23 (Feast of St. Irenaeus)** — surface entire corpus.
- **Sunday of Orthodoxy (1st Sunday of Great Lent)** — appropriate for Adv. Haer. III (Rule of Faith / apostolic tradition).
- **Pascha season** — Adv. Haer. V (resurrection) reading.
- **Apostolic Fathers cluster** — Irenaeus + Polycarp + Ignatius + Clement of Rome for joint Apostolic-Fathers feast days.

---

## 11. Which Irenaeus works are most useful for the Theosis library

| Rank | Work / Sub-unit | Why it's valuable |
|---|---|---|
| 1 | **Adversus Haereses Book III** (chapters 1-25) | The Rule of Faith, apostolic succession, four-fold Gospel canon defense. Foundational ecclesiology and canonicity. |
| 2 | **Adversus Haereses Book V** (chapters 1-37) | Bodily resurrection, eschatology, recapitulation. Foundational Orthodox eschatology. |
| 3 | **Adversus Haereses Book IV** (chapters 1-42) | The recapitulation of Adam in Christ — Mary as new Eve. Foundational Orthodox soteriology and Mariology. |
| 4 | **Adversus Haereses Book I** (chapters 1-32) | Detailed description of 2nd-century Gnostic systems. Historically invaluable. |
| 5 | **Adversus Haereses Book II** (chapters 1-36) | Philosophical refutation of Gnosticism. |
| 6 | **Fragment 2 (Letter to Florinus)** | The Polycarp memoir — foundational text for apostolic succession; biographical/devotional. |
| 7 | **Fragment 3 (Letter to Victor on the Paschal Controversy)** | Historical importance for early Christian unity-in-diversity; pairs with Eusebius's account. |

---

## 12. Which Irenaeus works are mostly general library texts

Within Irenaeus's corpus, the **35 fragments** (0134) are mostly small extracts — useful for scholars but episodic for general readers. Only Fragments 2 (Florinus letter) and 3 (Paschal letter) have major standalone value.

---

## 13. Recommended parser strategy

The shared `scripts/parse_newadvent/` module covers ~95% of Irenaeus. Specific additions:

### 13.1 Sub-page ID structured decoding

```python
IRENAEUS_SUBPAGE_PATTERN = re.compile(r'^0103(\d)(\d{2})$')

def parse_irenaeus_subpage_id(sub_id: str):
    """Decode 7-digit Irenaeus sub-page ID into (book, chapter)."""
    m = IRENAEUS_SUBPAGE_PATTERN.match(sub_id)
    if not m:
        return None, None
    book = int(m.group(1))
    chapter = int(m.group(2))   # 00 = preface; 1+ = chapters
    return book, chapter
```

This gives the parser structured (book, chapter) tuples for sorting and citation generation.

### 13.2 Chapter summary extraction — accept both `<p class="h1a">` and `<span class="h1a">`

```python
def extract_chapter_summary(soup):
    """Extract the chapter summary epigraph (used by Augustine and Irenaeus)."""
    content = soup.select_one("#springfield2")
    if not content:
        return None
    # Try both <p class="h1a"> (Augustine) and <span class="h1a"> (Irenaeus)
    summary_elem = content.select_one("p.h1a, span.h1a")
    if summary_elem:
        return summary_elem.get_text(" ", strip=True)
    return None
```

### 13.3 Fragments file chunking

For 0134, chunk by bare `<h2>N</h2>` headings:

```python
def parse_irenaeus_fragments(soup):
    """Chunk 0134 by bare numeric <h2> headings."""
    content = soup.select_one("#springfield2")
    fragments = []
    current = None
    for elem in content.children:
        if elem.name == "h2":
            text = elem.get_text(strip=True)
            if text.isdigit():
                if current:
                    fragments.append(current)
                current = {
                    "fragment_number": int(text),
                    "label": f"Fragment {text}",
                    "paragraphs": []
                }
        elif elem.name == "p" and current:
            current["paragraphs"].append(elem)
    if current:
        fragments.append(current)
    return fragments
```

### 13.4 ANF series support (already handled for Ignatius)

The parser must recognize "Ante-Nicene Fathers" in `<span id="srcwork">`. Already implemented per the Ignatius plan.

### 13.5 Per-work translator handling

0103 and 0134 share series/volume/editor/year/publisher but have **different translators**. The SourceRecord schema must store translator per work, not per series.

---

## 14. Risks, edge cases, cleanup issues

### 14.1 Massive chapter count for Adversus Haereses

173 chapters is the largest single-work chapter count in the library. Storage of normalized output: ~10-15 MB JSONL for this work alone. Trivial in absolute terms but worth noting.

### 14.2 `<span class="h1a">` vs `<p class="h1a">`

Augustine uses `<p>`; Irenaeus uses `<span>`. The chapter-summary extractor must accept both.

### 14.3 Two translators for one author

0103 (Roberts + Rambaut) vs 0134 (Roberts + Donaldson). Standard handling — SourceRecord translator field varies per work.

### 14.4 Citation form for Adversus Haereses

Standard scholarly citation is "*Adv. Haer.* III.11.8" (book.chapter.paragraph). The 7-digit sub-page ID encodes book+chapter; paragraph is the leading numeral in each `<p>`. All three levels are needed for the canonical citation.

### 14.5 The Polycarp memoir (Fragment 2)

CRITICAL editorial moment: this fragment is **historically vital** for apostolic-succession theology. The integration should:
- Flag Fragment 2 with `is_historically_significant: true` or similar
- Cross-link to the Polycarp corpus
- Cross-link to the John-the-Apostle entry (if such exists)
- Possibly surface it on Polycarp's feast day (Feb 23)

### 14.6 LXX vs MT versification

Standard. Irenaeus cites the LXX (Greek OT translation circulating in the early Church).

### 14.7 Missing Demonstration of the Apostolic Preaching

CRITICAL absence: Irenaeus's other major surviving work (*Demonstration*) is **not in NPNF/ANF** because it was rediscovered in 1904 (after ANF's 1885 publication). Phase-2 acquisition strongly recommended — sources:
- John Behr, *St. Irenaeus of Lyons: On the Apostolic Preaching* (SVS Press, 1997) — most accessible modern translation
- J. Armitage Robinson, *Saint Irenaeus: The Demonstration of the Apostolic Preaching* (1920) — public domain
- Iain MacKenzie

### 14.8 Compute scale

175 files × ~16 KB avg = trivial.

---

## 15. Recommended next step for a separate integration chat

> **"Build the eight-Father patristic ingestion pipeline."**
>
> 1. Read all eight planning docs.
> 2. Read the Theosis library schema; confirm Person/Work/WorkSection/SourceRecord/BibleRef shapes.
> 3. Read `scripts/process_fetch.py` and the updated `scripts/newadvent_downloader.py`.
> 4. Confirm Psalter versification (LXX vs MT).
> 5. Build `scripts/parse_newadvent/` as a shared module. Test on **eight end-to-end cases**:
>    - Augustine **1101** + **110101** (Confessions)
>    - Gregory of Nyssa **2914**
>    - Athanasius **2802** + **28161**
>    - Basil **3201** + **32011** + **3203**
>    - Chrysostom **2310** + **23101** (head-verse epigraph)
>    - Gregory Nazianzen **3102** + **310240** + **3103a** (multi-letter Division)
>    - Ignatius **0104** + **0107** + **0114** (multi-letter Spurious)
>    - **Irenaeus 0103 + 0103302 (Book III Chapter 2 — Rule of Faith) + 0134 (Fragments with bare numeric `<h2>` chunking)** — exercises 7-digit book/chapter encoding + `<span class="h1a">` summary + Fragments chunking
> 6. Expand to all 136 works = 48 Augustine + 15 Gregory of Nyssa + 21 Athanasius + 3 Basil + 36 Chrysostom + 2 Gregory Nazianzen + 9 Ignatius + 2 Irenaeus = **2,088 HTML files**.
> 7. Bible-linking passes:
>    - Pass 1: Chrysostom head-verse extraction (~470 links)
>    - Pass 2: Augustine head-verse linking
>    - Pass 3: Basil Hexaemeron head-verse linking
>    - Pass 4: Athanasius head-verse linking (2805)
>    - Pass 5: Mechanical `stiki` extraction across all eight corpora (~30,000+ BibleRef rows; Irenaeus contributes ~3,000–5,000)
>    - Pass 6: Thematic editorial tags (~300 entries total; Irenaeus contributes ~30 — 5 per book + Fragment 2 + a few cross-corpus links)
> 8. Calendar tags:
>    - All Fathers' feast days
>    - **Irenaeus August 23**
>    - Sunday of Orthodoxy (Lent 1) cluster — surface Athanasius, Cyril of Alexandria, Irenaeus (Rule of Faith)
> 9. Cross-corpus links:
>    - **Irenaeus Fragment 2 (Letter to Florinus)** ↔ Polycarp corpus ↔ Ignatius corpus (apostolic-succession triple)
>    - **Irenaeus Fragment 3 (Paschal Controversy letter)** ↔ Eusebius corpus (when acquired)
>    - **Apostolic Fathers + sub-apostolic cluster**: Ignatius + Polycarp + Clement of Rome + Hermas + Barnabas + Mathetes + Irenaeus (second-generation)
>
> **Out of scope for that chat:**
> - Bible reader UI
> - Search indexing
> - Cleanup of legacy `.md` files
> - Phase-2 acquisition (Demonstration of the Apostolic Preaching for Irenaeus; Long Recension of Ignatius; Chrysostom's Genesis Homilies; etc.)

---

## Appendix A — File inventory at a glance

- Location: `content/raw/fathers/irenaeus/`
- Files: 175 `.html` + 2 `provenance_*.json` (+ ~7 legacy `.md` files)
- Total raw HTML: ~3.06 MB
- Works: 2 (entire New Advent Irenaeus corpus = ANF Vol. 1 Irenaeus selection)
- Largest single file: typical chapter sub-pages are ~10-40 KB; Fragments file ~120 KB
- Multi-sub-page works: 1 (Adversus Haereses: 173 sub-pages)
- Self-contained works: 1 (Fragments)
- Translators: Roberts + Rambaut (Adv. Haer.); Roberts + Donaldson (Fragments)
- Series: **Ante-Nicene Fathers (ANF)** — second ANF corpus in the library (after Ignatius)

## Appendix B — Acquisition log

`content/raw/_index/acquisition_log_phase3_20260520T212806.json` — 2 works OK, 0 errors, 175 files downloaded on 2026-05-20.

## Appendix C — Sample files inspected for this plan

- `0103.html` (Adversus Haereses index) — TOC grouped by `<h2>Book N</h2>` with inline chapter blurbs
- `0103101.html` (Book I, Chapter 1) — chapter sub-page pattern with `<span class="h1a">` summary, numbered paragraphs
- `0134.html` (Fragments) — single-file with bare numeric `<h2>N</h2>` chunking, ANF citation footer
- `provenance_0103.json`, `provenance_0134.json` — provenance schemas
