# Other Western Witnesses — Raw Content Integration Plan

**Status:** Planning document — combined doc for the smaller Phase 2 Latin-tradition corpora.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`

> Combined doc for four authors with small corpora but **outsized influence** on Western tradition: **Hilary of Poitiers** ("the Athanasius of the West"), **Vincent of Lerins** (the *ubique, semper, ab omnibus* canon), **Alexander of Alexandria** (Athanasius's predecessor), and **Gennadius** (Jerome's continuator).

---

## 1. Location & Inventory

| Folder | Author | Works | HTML | NPNF Volume |
|---|---|---|---|---|
| `fathers/hilary-poitiers/` | Hilary of Poitiers | 3 | 18 | II Vol. 9 (1899) |
| `fathers/vincent-lerins/` | Vincent of Lerins | 1 | 1 | II Vol. 11 (1894) |
| `fathers/gennadius/` | Gennadius of Marseilles | 1 | 1 | II Vol. 3 (1892) |
| `fathers/alexander-alexandria/` | Alexander of Alexandria | 1 | 1 | (cross-listed) |
| **TOTAL** | **4 authors** | **6 works** | **21 files** | — |

---

## 2. Works

### Hilary of Poitiers (c. 310-367)
NPNF II Vol. 9, 1899 (shared with John of Damascus); translators E.W. Watson and L. Pullan.

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **3301** | On the Councils (De Synodis) | treatise | self-contained | History/theology of 4th-c. councils; key source on Arianism |
| **3302** | **On the Trinity** (De Trinitate) | treatise | **12 books** | The most important Western Trinitarian treatise pre-Augustine |
| **3303** | Homilies on the Psalms | commentary | **multiple sub-pages** (with gaps — 6-digit IDs like `3303001`, `3303053`, `3303131`) | Hilary's psalm exegesis (selected psalms only) |

### Vincent of Lerins (died c. 445)
NPNF II Vol. 11, 1894; translator C.A. Heurtley.

| ID | Title | Type | Notes |
|---|---|---|---|
| **3506** | **Commonitory** (Commonitorium) | treatise | The single-text source for the Vincentian Canon: *quod ubique, quod semper, quod ab omnibus creditum est* ("what has been believed everywhere, always, by all") |

### Gennadius of Marseilles (died c. 496)
NPNF II Vol. 3, 1892; translator E.C. Richardson.

| ID | Title | Type | Notes |
|---|---|---|---|
| **2719** | Illustrious Men (Supplement to Jerome's De Viris Illustribus) | reference | Continues Jerome's bibliography of Christian writers through the 5th century |

### Alexander of Alexandria (died 326)
ANF Vol. 6 (cross-referenced; metadata may vary); translator Anonymous.

| ID | Title | Type | Notes |
|---|---|---|---|
| **0622** | Epistles on the Arian Heresy | letter | Pre-Nicene encyclical letters denouncing Arius; Athanasius's predecessor as Bishop of Alexandria |

---

## 3. HTML structure

Standard New Advent shell. Per-work observations:

### Hilary On the Trinity (3302)
- Index lists 12 books (`<a href="../fathers/330201.htm">Book I</a>` through `<a href="../fathers/330212.htm">Book XII</a>`)
- Each book has chapter `<h2>` markers + numbered paragraphs

### Hilary Homilies on Psalms (3303)
- 6-digit sub-page IDs use **Psalm numbers** (Psalm 1 = `3303001`, Psalm 53 = `3303053`, Psalm 131 = `3303131`)
- NPNF includes only selected psalms — provenance JSON lists which

### Vincent Commonitory (3506)
- Single self-contained file with numbered chapters
- Famous for the **Vincentian Canon** in Chapter 2

### Gennadius De Viris Illustribus (2719)
- Single file packaging short biographies (one per chapter)
- Numbered chapters

### Alexander of Alexandria (0622)
- Single file with multiple letters

---

## 4. Person records

```ts
Person {
  id:          "person.hilary-of-poitiers"
  display:     "Hilary of Poitiers"
  also_known:  ["St. Hilary", "Hilarius Pictaviensis", "Hilary the Athanasius of the West"]
  born:        c. 310
  died:        367
  feast_day:   "01-13"            // Orthodox commemoration also Jan 13/14
  feast_west:  "01-13"            // Catholic
  tradition:   "Bishop of Poitiers; exiled to Phrygia by Constantius II for opposing Arianism; brought back Eastern Trinitarian theology to the Latin West; Doctor of the Church"
  see:         "Poitiers (Gaul)"
  ecumenical_role: "Foundational Latin Trinitarian theologian; bridged Greek and Latin theological vocabulary"
}

Person {
  id:          "person.vincent-of-lerins"
  display:     "Vincent of Lerins"
  also_known:  ["Vincentius Lirinensis", "St. Vincent"]
  born:        late 4th c.
  died:        c. 445
  feast_day:   "05-24"            // Western
  tradition:   "Monk of Lérins; formulated the canon of orthodox tradition (Vincentian Canon)"
  see:         "Monastery of Lérins (Gaul)"
}

Person {
  id:          "person.gennadius-of-marseilles"
  display:     "Gennadius of Marseilles"
  also_known:  ["Gennadius Massiliensis"]
  born:        early 5th c.
  died:        c. 496
  tradition:   "Priest of Marseilles; continued Jerome's biographical catalog of Christian writers; semi-Pelagian sympathies"
  see:         "Marseilles"
}

Person {
  id:          "person.alexander-of-alexandria"
  display:     "Alexander of Alexandria"
  also_known:  ["St. Alexander"]
  born:        c. 250
  died:        326
  feast_day:   "05-29"            // Orthodox
  tradition:   "Patriarch of Alexandria (313-326); first opponent of Arius; predecessor and mentor of St. Athanasius; attendee at Nicaea I"
  see:         "Alexandria"
}
```

---

## 5. Bible-linking strategy

- **Hilary's Homilies on the Psalms (3303)** is the most Bible-linkable — one homily per Psalm. Each sub-page ID encodes the Psalm number directly. **Strong head-verse linking opportunity** for the Psalter (selected psalms).
- **Hilary's On the Trinity (3302)** is theological-exegetical, heavily citing John, Phil 2, Heb 1
- **Vincent's Commonitory (3506)** has minimal Bible quotation; primary topic is the rule of orthodox tradition
- **Gennadius De Viris Illustribus (2719)** is bibliographic; no Bible-linking value
- **Alexander's letters (0622)** are doctrinal; cite scripture for anti-Arian arguments

### Lectionary

- **January 13/14** — Hilary's feast day
- **May 29** — Alexander of Alexandria (Orthodox; pairs with Athanasius's feast Jan 18)
- **May 24** — Vincent of Lerins (Western)
- **Sunday of Orthodoxy / Pentecost** — Hilary On the Trinity reading

---

## 6. Parser strategy

Standard parser. Hilary's Homilies on the Psalms 6-digit sub-page IDs (with Psalm-number encoding) handled by current regex. Provenance JSON lists which Psalms are present.

---

## 7. Cross-corpus links

- **Alexander of Alexandria (0622) ↔ Athanasius corpus** — Alexander was Athanasius's predecessor; Athanasius extended Alexander's anti-Arian work
- **Hilary On the Trinity ↔ Augustine On the Trinity ↔ Basil/Gregory of Nyssa/Gregory Nazianzen Trinitarian writings** — these together form the **classical Trinitarian patristic synthesis**
- **Vincent's Commonitory ↔ Apostolic Constitutions ↔ Irenaeus Adversus Haereses III** — three witnesses to the patristic rule of faith
- **Gennadius De Viris Illustribus ↔ Jerome's De Viris Illustribus (2708)** — Jerome's continuation; reading them together gives the patristic bibliographic record from ~300 to ~496

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase2_20260520T223912.json`
- Sample files: `hilary-poitiers/3302.html` (On the Trinity index), `vincent-lerins/3506.html` (Commonitory)
