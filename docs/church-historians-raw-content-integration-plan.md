# Church Historians Raw Content — Integration Plan

**Status:** Planning document — combined doc for the 4th-5th century church historian corpus.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II** (multiple volumes, see per-work below). Public domain.

> The early Christian historians — **Eusebius, Socrates, Sozomen, Theodoret, and Rufinus** — are the **primary surviving narrative sources** for the first 5 centuries of the Church. Together they cover apostolic origins (Eusebius) through the Council of Chalcedon (Theodoret). **Foundational corpus for understanding patristic context.**

---

## 1. Location & Inventory

| Folder | Author | Works | HTML Files | Total Size |
|---|---|---|---|---|
| `fathers/eusebius/` | Eusebius of Caesarea | 4 | 18 | ~1.83 MB |
| `fathers/socrates-scholasticus/` | Socrates Scholasticus | 1 | 8 | ~1.09 MB |
| `fathers/sozomen/` | Sozomen | 1 | 11 | ~1.26 MB |
| `fathers/theodoret/` | Theodoret of Cyrrhus | 5 | 195 | ~3.24 MB |
| `fathers/rufinus/` | Rufinus of Aquileia | 3 | 3 | ~0.26 MB |
| **TOTAL** | **5 authors** | **14 works** | **235 files** | **~7.7 MB** |

---

## 2. Works

### Eusebius of Caesarea (NPNF II Vol. 1, 1890; translators A.C. McGiffert, E.C. Richardson)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **2501** | **Church History** (Ecclesiastical History) | history | **10 books** | **THE foundational patristic history of the early Church** (events from c. 33 to 324) |
| **2502** | Life of Constantine | hagiography | 4 (4 books) | Biographical/historical account of Constantine the Great |
| **2503** | Oration of Constantine to the Assembly | treatise | self-contained | Constantine's address (preserved by Eusebius) |
| **2504** | Oration in Praise of Constantine | treatise | self-contained | Tricennial oration |

### Socrates Scholasticus (NPNF II Vol. 2, 1890; translator A.C. Zenos)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **2601** | Ecclesiastical History | history | **7 books** | Continues Eusebius (305-439); especially important for the Arian and post-Constantinian controversies |

### Sozomen (NPNF II Vol. 2, 1890; translator C.D. Hartranft)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **2602** | Ecclesiastical History | history | **9 books + intro = 10 sub-pages** | Independent history (323-425) covering same period as Socrates with different emphasis |

### Theodoret of Cyrrhus (NPNF II Vol. 3, 1892; translator B. Jackson)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **2701** | Counter-Statements to Cyril's 12 Anathemas | treatise | self-contained | Theodoret's pre-Chalcedon response to Cyril of Alexandria |
| **2702** | Ecclesiastical History | history | **5 books** | Continues Eusebius (320-428); strong on Nestorian-Cyrilline controversy |
| **2703** | Dialogues (*Eranistes*) | treatise | 3 dialogues | Christological dialogues against Eutychianism |
| **2704** | Demonstrations by Syllogism | treatise | self-contained | Logical arguments for Christology |
| **2707** | **Letters** | letter | **182 sub-pages** | Massive collection — pastoral, doctrinal, biographical |

### Rufinus of Aquileia (NPNF II Vol. 3, 1892; translator W.H. Fremantle)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **2709** | Apology (against Jerome) | apologetic | self-contained | Origenist-controversy response to Jerome's attacks |
| **2711** | Commentary on the Apostles' Creed | commentary | self-contained | Foundational Latin creed-exposition |
| **2712** | Prefaces and Other Works | reference | self-contained | Including his Origen translations |

---

## 3. HTML structure

Standard New Advent shell. Key patterns:

### Multi-book histories
- Index page (e.g., 2501.html) — TOC for 10 books
- Each book sub-page contains `<h2>Chapter N.</h2>` headings and numbered paragraphs
- Eusebius's Church History Book 1 uses `<h2>Chapter N. {descriptive title}</h2>` style
- Sub-page IDs are 6-digit: `250101` for Eusebius Book I, `260101` for Socrates Book I, etc.

### Theodoret Letters (2707NNN)
- 7-digit sub-page IDs; 182 sub-pages
- Each letter has `<h1>Letter N</h1>` and short body
- Many letters are quite short (pastoral correspondence)

### Citation footers
Each author's works share NPNF II volume metadata. Volume sharing:
- Eusebius = NPNF II Vol. 1
- Socrates + Sozomen = NPNF II Vol. 2 (different translators)
- Theodoret + Jerome (some works) + Rufinus + Gennadius = NPNF II Vol. 3 (different translators)

---

## 4. Person records

```ts
Person { id: "person.eusebius-of-caesarea", display: "Eusebius of Caesarea",
  born: c. 263, died: c. 339, see: "Caesarea Maritima",
  tradition: "Bishop; Constantine's biographer; first systematic Church historian; theologically Origenist-leaning; signed Nicaea reluctantly",
  feast_day: null }

Person { id: "person.socrates-scholasticus", display: "Socrates Scholasticus",
  born: c. 380, died: c. 439, see: "Constantinople (lay historian)",
  tradition: "Constantinopolitan lawyer; continued Eusebius's history",
  feast_day: null }

Person { id: "person.sozomen", display: "Sozomen (Salaminius Hermias)",
  born: c. 400, died: c. 450, see: "Palestine, then Constantinople",
  tradition: "Lawyer; parallel history to Socrates; richer in monastic and Western detail",
  feast_day: null }

Person { id: "person.theodoret-of-cyrrhus", display: "Theodoret of Cyrrhus",
  born: 393, died: c. 458, see: "Cyrrhus (Syria)",
  tradition: "Bishop; Antiochene theologian; opponent of Cyril of Alexandria; rehabilitated at Chalcedon; later condemned at Constantinople II (553) — Three Chapters controversy",
  feast_day: null }   // not on Orthodox calendar due to Three Chapters condemnation

Person { id: "person.rufinus-of-aquileia", display: "Rufinus of Aquileia",
  born: c. 345, died: 411, see: "Aquileia / Jerusalem / Italy",
  tradition: "Latin translator of Origen, Eusebius, Basil, and the Apostles' Creed; embroiled in Origenist controversy with Jerome",
  feast_day: null }
```

---

## 5. Bible-linking strategy

These are histories — not exegetical works. Bible-linking is moderate:
- Eusebius's Church History quotes scripture for typology (Jewish-Roman war as fulfillment of Christ's prophecies)
- Socrates and Sozomen cite scripture less densely
- Theodoret is heavily exegetical in Eranistes and Demonstrations

**Highest-value cross-corpus links:**
- Eusebius Church History III–IV ↔ Ignatius corpus (Eusebius preserves Ignatius's letters)
- Eusebius Church History V–VI ↔ Irenaeus, Tertullian, Origen (testimonies)
- Theodoret's Counter-Statements (2701) ↔ Cyril of Alexandria (future corpus)
- Rufinus's Commentary on Apostles' Creed ↔ all early creed texts
- Theodoret's Letters → many to and about contemporaries (Leo, Nestorius, Cyril, etc.)

---

## 6. Lectionary

- These historians don't have specific feast days on most calendars
- Read seasonally for Church-history reference
- Eusebius's Church History is a year-round reference reading

---

## 7. Parser strategy

Standard NPNF parser. All multi-book histories follow the same chapter→paragraph pattern. Theodoret's 182 letters require iteration of the provenance subpages array (gaps in numbering reflect non-extant letters in NPNF selection).

### Theological caveat on Theodoret

Theodoret was **partially condemned** at the Second Council of Constantinople (553) — specifically his writings against Cyril's 12 Anathemas (2701) and his earlier anti-Cyrilline letters. His person was rehabilitated at Chalcedon (451) but parts of his corpus remained condemned. The library should note:
- 2701 (Counter-Statements to Cyril) is specifically anathematized — flag with an `is_anathematized: true` or `controversy_note` field
- His other works (Ecclesiastical History, Demonstrations, most Letters) are not under condemnation

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase2_20260520T223912.json`
- Sample files: `eusebius/250101.html` (Church History Book I Ch 1), `theodoret/2707001.html` (Letter 1), `rufinus/2711.html` (Commentary on Apostles Creed)
