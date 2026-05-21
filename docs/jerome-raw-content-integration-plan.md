# Jerome Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 6** — Schaff & Wace eds., 1893. Public domain. Multiple translators (W.H. Fremantle, G. Lewis, W.G. Martley primarily).

> Jerome (c. 347 – 420) is the **most prolific letter-writer** of the patristic age and the translator of the **Vulgate**. His corpus is large and varied: 13 works ranging from 132 letters to small hagiographical treatises.

---

## 1. Location & Inventory

```
content/raw/fathers/jerome/
```

| Item | Count |
|---|---|
| `*.html` files | **152** |
| `provenance_*.json` | **13** |
| Total raw HTML size | ~4.88 MB |

### Works

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **3001** | Letters | letter | **132** (numbered up to 150 with gaps) | The crown jewel — most-quoted Jerome corpus |
| **3002** | Prefaces | reference | varies | Vulgate prefaces; canonicity discussions |
| **3003** | The Life of St. Hilarion | hagiography | self-contained | One of the foundational Latin monastic biographies |
| **3004** | To Pammachius Against John of Jerusalem | treatise | self-contained | Origenist-controversy polemic |
| **3005** | The Dialogue Against the Luciferians | treatise | self-contained | On readmission of Arian-baptized clergy |
| **3006** | The Life of Malchus the Captive Monk | hagiography | self-contained | Short hagiography |
| **3007** | The Perpetual Virginity of Blessed Mary (Against Helvidius) | treatise | self-contained | Foundational Mariological text |
| **3008** | The Life of Paulus the First Hermit | hagiography | self-contained | Foundational monastic biography |
| **3009** | Against Jovinianus | treatise | multi-book | On virginity and ascetic life |
| **3010** | Against Vigilantius | treatise | self-contained | On relics and monasticism |
| **3011** | Against the Pelagians | treatise | multi-book (3 books) | Pelagian-controversy work |
| **2708** | De Viris Illustribus (Illustrious Men) | reference | multi-section | 135 short biographies of Christian writers |
| **2710** | Apology against the Books of Rufinus | treatise | multi-book (3 books) | Origenist-controversy polemic against Rufinus |

### Letter ID encoding

Sub-page IDs use 7-digit format: `3001NNN` where NNN is the letter number zero-padded to 3 digits. **132 of 150 letters present** — NPNF gaps reflect Jerome's letters that survive in fragmentary form or are excluded from selection.

---

## 2. HTML structure

Standard New Advent shell. Per-work observations:

### Letters (3001NNN)
- `<h1>Letter N</h1>` (sub-page title)
- `<p><strong>To {recipient}</strong></p>` (recipient line)
- `<p><span class="stiki">{editorial date/context note}</span></p>` — note: Jerome corpus uses `<span class="stiki">` for date/context notes WITHOUT a Bible link, same as Gregory Nazianzen. Parser must filter these as in §13 of Gregory Nazianzen plan.
- Numbered paragraphs `<p>N. ...</p>`

### Hagiographies (3003, 3006, 3008)
- `<h1>The Life of N</h1>`
- Numbered paragraph narrative

### Treatises (3007, 3009, 3010, 3011, 2710, 3004, 3005)
- `<h1>Title</h1>`
- `<h2>Chapter N.</h2>` for multi-chapter works
- For multi-book works (3009, 3011, 2710), sub-pages by book

### De Viris Illustribus (2708)
- Index of 135 short biographies
- Each biography is a short paragraph

### Citation footer

```
Translated by W.H. Fremantle (primary), with G. Lewis and W.G. Martley.
From NPNF II, Vol. 6 (1893).
```

Some works have different translators within Vol. 6 (e.g., the Lives of Hilarion, Paulus, Malchus have W.H. Fremantle).

---

## 3. Person record

```ts
Person {
  id:          "person.jerome"
  display:     "Jerome"
  also_known:  ["St. Jerome", "Hieronymus", "Sophronius Eusebius Hieronymus", "Jerome of Stridon"]
  born:        c. 347
  died:        420
  feast_day:   "06-15"        // Orthodox calendar (also Sept 30 in Western tradition)
  feast_west:  "09-30"        // Catholic Western feast day
  tradition:   "Doctor of the Church; translator of the Vulgate (Latin Bible); foremost Christian biblical scholar of the ancient world; ascetic; controversialist"
  see:         "Bethlehem (after years in Rome, the East, and Constantinople)"
  ecumenical_role: "Translator of the Vulgate — the Latin Bible that shaped Western Christianity for over a millennium"
}
```

**Orthodox significance:**
- Doctor of the Church
- Some Orthodox calendars celebrate June 15 (with Augustine)
- **Vulgate translator** — though Orthodox uses LXX/Greek NT, Jerome's biblical scholarship is universally respected
- His **Letters** to Eustochium, Marcella, Paula, and others document early Roman monastic spirituality
- His **Lives of the Desert Fathers** (Hilarion, Paul, Malchus) are foundational monastic literature

---

## 4. Bible-linking strategy

- **3002 Prefaces** is canonicity-relevant — Jerome's prefaces to the Vulgate discuss which books are canonical vs. apocryphal (especially the OT deuterocanonicals/apocrypha). Cross-link to Bible reader's canon-history feature.
- **3007 On Perpetual Virginity** ↔ Matthew 1, Luke 1, the Protoevangelium (cross-link to Apocrypha)
- **Letters** are scripture-saturated — extract `stiki` refs; estimate ~3,000+ total
- **2708 De Viris Illustribus** is a meta-reference — each chapter is a short bio of a Christian writer, valuable for cross-corpus linking

### Lectionary linking

- **June 15 / September 30** — Jerome's feast day
- **Marian feasts (Aug 15, Sep 8, Mar 25)** — On the Perpetual Virginity (3007)
- **Lenten Saint-of-the-Desert readings** — Lives of Paulus, Hilarion, Malchus

---

## 5. Parser strategy

- 132 letter sub-pages handled by 7-digit ID pattern
- `<span class="stiki">` with no Bible-link child → filter as date/context note (Gregory Nazianzen logic)
- Multi-book works (3009, 3011, 2710): standard 5-digit sub-page IDs handled by current regex

---

## 6. Risks & caveats

- **Gaps in Letter numbering**: 18 letters between 1 and 150 missing in NPNF selection
- **Multiple translators within NPNF Vol. 6** — different prefaces and works by different scholars
- **2708 De Viris Illustribus is meta-bibliographic** — useful for cross-referencing the entire patristic library, not for thematic reading

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase2_20260520T223912.json`
- Sample files: `3001001.html` (Letter 1 to Innocent), `3007.html` (Perpetual Virginity)
