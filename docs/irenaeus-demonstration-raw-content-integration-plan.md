# Irenaeus — Demonstration of the Apostolic Preaching — Raw Content Integration Plan

**Status:** Planning document — Phase 2 supplementary acquisition (NOT from New Advent).

**Date inspected:** 2026-05-20
**Source:** tertullian.org (Roger Pearse HTML transcription of J. Armitage Robinson 1920)
**Translation:** **J. Armitage Robinson, 1920** — Society for Promoting Christian Knowledge, London / Macmillan, New York. *Translations of Christian Literature, Series IV: Oriental Texts.* Public domain.

> Irenaeus's *Demonstration of the Apostolic Preaching* is his **only other surviving major work** besides *Against Heresies*. Unknown to scholarship for over a millennium, it was **rediscovered in 1904** in an Armenian translation (Yerevan manuscript), making it absent from ANF (1885) and NPNF (1894). Robinson's 1920 English translation — from the Armenian via Harnack/Ter-Mekerttschian's German — is the **first complete English Demonstration** and remains the standard PD scholarly edition.

---

## 1. Why this is a Phase-2 supplementary acquisition

The main Irenaeus corpus (ANF Vol. 1 acquired Phase 1) contains:
- **0103** *Against Heresies* (5 books, 173 chapters)
- **0134** Fragments

The Demonstration is **the second major Irenaeus work** — a brief catechetical summary of Christian faith in 100 chapters, written ~AD 190 for a Christian named Marcianus. It was lost in Greek for 1,700 years; the single surviving Armenian manuscript (discovered by Karapet ter Mekerttschian in 1904 in Yerevan) is the only witness.

**Why this matters for Theosis:**

- It is **arguably more accessible** than *Adversus Haereses* — a positive exposition of the faith rather than a polemical refutation
- It contains the earliest systematic articulation of the **economy of salvation** in trinitarian form
- It quotes scripture extensively, providing critical witnesses to **2nd-century Christian biblical interpretation**
- It is on every "essential Irenaeus" reading list and is **regularly recommended for catechumens**

Without it, the Irenaeus library is incomplete.

---

## 2. Location & Inventory

```
content/raw/fathers/irenaeus/demonstration/
├── irenaeus_01_proof_intro.htm         # Robinson's Introduction (pp. 1-23, 61 KB)
├── irenaeus_02_proof.htm               # The Demonstration proper (pp. 69-151, 167 KB)
└── provenance_irenaeus-demonstration.json
```

| File | Pages (in 1920 print) | Size | Content |
|---|---|---|---|
| `irenaeus_01_proof_intro.htm` | 1–23 | 61 KB | Robinson's Preface + 3-part scholarly Introduction (Doc & Value; Debt to Justin; Holy Spirit doctrine). Not the patristic text. |
| `irenaeus_02_proof.htm` | 69–151 | 167 KB | **The Demonstration** — Irenaeus's 100 numbered chapters. |

Robinson's edition page break: pp. 24-68 (omitted from these HTML files) contained the original Armenian text + scholarly apparatus that Pearse's transcription does not reproduce.

---

## 3. Translation & licensing

| Field | Value |
|---|---|
| **Translator** | J. Armitage Robinson, D.D. |
| **Translation year** | 1920 |
| **Translation series** | *Translations of Christian Literature, Series IV: Oriental Texts* |
| **Publishers** | Society for Promoting Christian Knowledge (London) + Macmillan (New York) |
| **General Editors** | W. J. Sparrow Simpson, D.D.; W. K. Lowther Clarke, B.D. |
| **Source language chain** | Greek (lost, c. 190) → Armenian (c. 6th c., extant) → German (Harnack/Ter-Mekerttschian 1907) → English (Robinson 1920) |
| **Status** | **U.S. public domain** — pre-1930 publication; copyright lapsed; not renewed |
| **Transcription** | Roger Pearse, tertullian.org — freely redistributable per site license |
| **Quality** | Clean HTML; chapter numbering preserved; no significant OCR issues |

---

## 4. HTML structure

Roger Pearse's tertullian.org transcription uses a consistent template:

### Page wrapper
- `<head>` with CSS links (`fathers-all.css`, `fathers-ie.css`), title, meta author/description
- `<body bgcolor="#FFFFFF">` — single color, no semantic markup
- Top nav: `<p align="center">` with 3 nav images (`mroon*.gif`) for Prev/TOC/Next — **drop during parsing**
- `<hr>` separators between major divisions

### Content markers

For the intro page (`irenaeus_01_proof_intro.htm`):
- `<h3 align="center">` for the title block (e.g., "ST. IRENAEUS")
- `<h4>` for subsection numerals ("I.", "II.", "III.")
- `<p>` for body paragraphs

For the main text (`irenaeus_02_proof.htm`):
- 100 numbered chapters; chapter numbers appear as **bold inline numerals** at paragraph starts (e.g., `<p>1. ...`)
- Some chapters have descriptive headers (e.g., chapter 6 has "I. ...")
- Footnotes (Robinson's apparatus) intercalated in the text

### Structural skeleton

```
PREFACE (1 page)
INTRODUCTION
  I. The Document and Its Value
  II. The Debt of Irenaeus to Justin Martyr
  III. The Doctrine of the Holy Spirit in Justin and Irenaeus
THE DEMONSTRATION OF THE APOSTOLIC PREACHING
  Chapters 1-100 (Robinson's chapter numbering follows the Armenian manuscript division)
```

### Page navigation footer
```html
<a href="irenaeus_01_proof_intro.htm"><img SRC="mroonppv.gif"></a>
<a href="index.htm#The_Proof_of_the_Apostolic_Preaching"><img SRC="mroontoc.gif"></a>
<a href="irenaeus_02_proof.htm"><img SRC="mroonpnx.gif"></a>
```

---

## 5. Internal divisions of the Demonstration

Robinson divides the 100 chapters into thematic blocks (his analysis, not Irenaeus's). These are useful for surfacing reading sections:

| Chapters | Topic |
|---|---|
| 1–7 | Preface, the rule of faith, the Trinity |
| 8–11 | Creation and the angelic world |
| 12–16 | Paradise and the Fall |
| 17–30 | OT history: Noah, Babel, Abraham, Moses, the prophets |
| 31–42 | The Incarnation: God's plan, Christ's two natures, Virgin Birth |
| 43–85 | Scripture proofs of Christ — extensive OT citations showing prophetic fulfillment |
| 86–97 | Apostolic teaching and ethical instruction |
| 98–100 | Final exhortations |

This structure makes the Demonstration **ideal for sequential lectionary surfacing** (e.g., one chapter per day during Lent).

---

## 6. Person record (extension to existing Irenaeus entry)

The existing Person record for `person.irenaeus-of-lyons` from Phase 1 already covers the biographical/ecclesiastical details. This work just adds:

```ts
// Existing record receives a new related-work pointer
{
  related_works: [
    { id: "work.irenaeus-adversus-haereses", primary: true },
    { id: "work.irenaeus-fragments" },
    { id: "work.irenaeus-demonstration", note: "Lost 1700 years; rediscovered 1904 in Armenian." }
  ]
}
```

Discovery story is worth surfacing in the work entry itself — the **rediscovery in 1904** is one of the great patristic textual events of the 20th century.

---

## 7. Bible-linking strategy

The Demonstration is **extremely Bible-dense** — Robinson's apparatus identifies hundreds of scripture citations across the 100 chapters. Key passages:

| Chapter range | OT/NT focus |
|---|---|
| 1–7 | Brief NT framing |
| 8–30 | Genesis-Exodus heavy |
| 31–42 | Isaiah, Genesis 3:15 |
| 43–85 | **The "proof from prophecy" chapters** — densest scripture citation. Isaiah, Psalms, Micah, Daniel, Zechariah. **Highest Bible-linking value in the entire work.** |
| 86–97 | Pauline epistles + Synoptics |

**LXX vs MT:** Irenaeus's quotations follow the **LXX** as transmitted through Greek and Armenian. Some LXX-vs-MT differences (e.g., Isaiah 7:14 "virgin" vs "young woman") are theologically load-bearing. The integration plan must use **LXX numbering** for psalms cited and flag LXX text variants.

**Robinson's apparatus** identifies most citations but is not in machine-readable form — parser will need to detect quotations via standard scripture-reference patterns + Robinson's footnote numbering.

### Lectionary linking opportunities

- **St. Irenaeus's feast day**: June 28 (Western) / August 23 (Eastern)
- **Catechumenal use**: Lent sequential reading (40 days; ~2.5 chapters/day)
- **Cross-link with *Adversus Haereses* Book IV–V** — the OT/NT economy themes overlap with chapters 8–42 here

---

## 8. Cross-corpus links

- **Irenaeus *Adversus Haereses*** (0103) ↔ this Demonstration — same author, complementary works
- **Justin Martyr *Dialogue with Trypho*** — Robinson's Introduction (Part II) traces Irenaeus's literary dependence on Justin; cross-link these works
- **Theophilus of Antioch *To Autolycus*** — earlier Greek apologist; similar "economy of salvation" framework
- **Cyril of Jerusalem Catechetical Lectures** — the Demonstration is a 2nd-century precursor to the 4th-century catechetical genre
- **Apostles' Creed (Rufinus 2711)** — Demonstration ch. 6 contains the **earliest extant rule-of-faith summary** that the Apostles' Creed later codifies

---

## 9. Parser strategy

### File handling
- 2 input files; parse each separately
- Strip `<head>`, nav image rows, `<hr>` separators
- Footer nav images at end of each file should be dropped

### Chapter extraction (the harder part)
- Robinson's chapter numbers appear as **bold inline numerals at paragraph starts** in the main text file
- Pattern: `<p>\s*(\d+)\.` — capture chapter number + opening paragraph
- Subsequent paragraphs in the same chapter have no number — continue until next numbered paragraph
- Some chapters have a leading descriptive header in italic — preserve as `display_title` if present

### Robinson's footnotes
- Intercalated in the text, not at page end
- Parser should detect Robinson's apparatus notes and tag them as `editorial_note` rather than `body`

---

## 10. Risks & caveats

### 10.1 Quotation accuracy through translation chain
Irenaeus → Greek (lost) → Armenian (c. 6th c.) → German (1907) → English (1920). Each step introduced potential drift. The Robinson translation is **scholarly but not infallible**; modern scholarship (Behr's 1997 SVS edition) corrects some readings. The integration plan should:
- Note prominently that this is a **multi-translation chain**
- Avoid presenting Robinson's text as a verbatim Irenaeus quote
- Where appropriate, flag passages where Behr departs significantly

### 10.2 Chapter divisions are editorial
The 100-chapter division is **Robinson's editorial choice** based on the Armenian manuscript's natural breaks. They are **not original to Irenaeus** and are not universally followed in modern editions.

### 10.3 Greek terminology
Robinson uses Greek terms in transliteration (with Greek font fallback CSS). The HTML has `class="Greek"` spans — parser should extract these as glossary tags.

### 10.4 Modern alternative
Behr (1997) is the modern SVS Press translation — **copyrighted**. We cannot use it in the library, but the integration doc should note its existence and recommend it as a Phase-3 acquisition target if a licensing arrangement becomes available.

---

## 11. Appendix

- Source acquisition: `2026-05-20T19:30:00+00:00` via curl from tertullian.org
- Primary URL: https://www.tertullian.org/fathers/irenaeus_01_proof_intro.htm + irenaeus_02_proof.htm
- Alternative scholarly source: https://archive.org/details/stirenusdemons00irenuoft (DjVu OCR of original 1920 print)
- Sample sub-pages: `irenaeus_02_proof.htm` chapters 1, 6, 31, 100
