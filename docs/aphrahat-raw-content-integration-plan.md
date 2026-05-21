# Aphrahat Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 13** — Schaff & Wace eds., 1890. Public domain. **Translator: John Gwynn** (Aphrahat section; same volume as Ephraim but earlier prep year — 1890 vs 1898).

> **Aphrahat is the second Syriac Father in the library** (with Ephraim). The earliest extant Christian writer in Syriac, predating even Ephraim. Foundational for **Syriac Christian theology and exegesis** — the Persian / East Syriac tradition.

---

## 1. Location & Inventory

```
content/raw/fathers/aphrahat/
```

| Item | Count |
|---|---|
| `*.html` files | **9** (1 index + 8 Demonstrations) |
| `provenance_*.json` | **1** |

**Single work: 3701 Demonstrations** — 8 of Aphrahat's 22 surviving Demonstrations are included in NPNF.

### Sub-page IDs (gapped sequence)

Sub-pages have **gaps** — NPNF only includes Demonstrations 1, 5, 6, 8, 10, 17, 21, 22:

| Sub-page ID | Demonstration | Title (likely) |
|---|---|---|
| 370101 | Demonstration 1 | Of Faith |
| 370105 | Demonstration 5 | Of Wars |
| 370106 | Demonstration 6 | Of Monks (Sons of the Covenant) |
| 370108 | Demonstration 8 | Of the Resurrection of the Dead |
| 370110 | Demonstration 10 | Of Pastors |
| 370117 | Demonstration 17 | Of Christ the Son of God |
| 370121 | Demonstration 21 | Of Persecution |
| 370122 | Demonstration 22 | Of Death and the Latter Times |

**Iterate `provenance_3701.json` subpages array literally** — don't try to predict sequential IDs.

### Notable absences

The Syriac Aphrahat corpus has **22 Demonstrations** total. NPNF only includes 8 (perhaps the most theologically central or accessible). The 14 missing demonstrations include:
- Demonstration 2 (Of Charity)
- Demonstration 3 (Of Fasting)
- Demonstration 4 (Of Prayer)
- Demonstrations 11-16 (various anti-Jewish polemic, considered too controversial)
- Demonstrations 18-20

Modern editions (Patrologia Syriaca, Adam Lehto, Kuriakose Valavanolickal) cover all 22. Phase-2 acquisition recommended.

---

## 2. HTML structure

Standard New Advent shell. **Aphrahat-specific features:**

- Each Demonstration sub-page has a `<h1>Demonstration N (Of Topic)</h1>` heading
- Internal `<h2>` markers chunk each Demonstration into sub-sections (e.g., "Letter of an Inquirer" + "The Demonstrations begin")
- Paragraphs numbered `<p>N. ...</p>` (Arabic numerals, NPNF-style)
- Standard `<span class="stiki">` Bible refs
- Citation footer: NPNF II Vol. 13, John Gwynn translator, 1890

### Citation footer

```
Translated by John Gwynn.
From Nicene and Post-Nicene Fathers, Second Series, Vol. 13.
Edited by Philip Schaff and Henry Wace. 1890.
```

**Note**: Vol. 13 also contains Ephraim (J.B. Morris translator). The BibliographicEdition for Vol. 13 should be shared.

---

## 3. Person record

```ts
Person {
  id:          "person.aphrahat"
  display:     "Aphrahat"
  also_known:  ["Aphraates", "Aphrahat the Persian Sage", "Farhad", "Mar Afrahat"]
  born:        c. 270
  died:        c. 345
  feast_day:   "01-29"        // Some traditions; varies by Church
  tradition:   "The earliest extant Christian writer in Syriac; 'the Persian Sage'; head of the monastery of St. Matthew near Mosul; wrote during the Sassanid Persian persecutions"
  see:         "Persia (Sassanid Empire) — likely the Monastery of Mar Mattai near Mosul"
  language_primary: "Syriac"
  ecumenical_role: "Earliest known Syriac theologian; pre-dates the major Greek Christological controversies; preserves a strain of Christianity uninfluenced by the Greek tradition"
}
```

**Orthodox significance:**
- **The earliest extant Christian writer in Syriac** — pre-dates Ephraim by about 30 years
- His Demonstrations were written **outside the Roman Empire** (in Sassanid Persia) during persecutions — a unique window into non-Greek, non-Latin early Christianity
- Wrote in **biblical-typological style** with deep OT typology
- His Demonstration on Christ (Dem. 17) is an early Syriac Christology pre-dating Nicaea's reception in the East
- Theologically conservative and biblical; some interpret his Trinitarian language as proto-Nicene rather than fully developed

---

## 4. Bible-linking strategy

- **No head-verse epigraph pattern** — these are systematic theological treatises
- **Heavy biblical citation**: Aphrahat is one of the most Bible-saturated patristic writers; his thought is constructed almost entirely from Scripture
- **Inline `stiki` density**: very high — estimated 50–100+ refs per Demonstration; corpus total perhaps 500–800

**Thematic Bible-linking:**

| Demonstration | Anchor passages |
|---|---|
| Dem. 1 (Faith) | Heb 11, John 14, James 2 |
| Dem. 5 (Wars) | Daniel 2 + 7 (the four kingdoms) |
| Dem. 6 (Monks) | Matt 19:12 (eunuchs for the kingdom), 1 Cor 7 |
| Dem. 8 (Resurrection) | 1 Cor 15, Ezekiel 37 (dry bones), John 11 |
| Dem. 10 (Pastors) | John 10 (good shepherd), Ezekiel 34, 1 Tim 3 |
| Dem. 17 (Christ Son of God) | John 1, Phil 2, Heb 1, John 10:30 |
| Dem. 21 (Persecution) | Matt 5:10–12 (Beatitudes on persecution), 2 Tim 3:12 |
| Dem. 22 (Death/Latter Times) | 1 Thess 4–5, Rev 20–22, Daniel 12 |

### Lectionary

- **Syriac-tradition feast days** — varies by jurisdiction
- **Lent** — Demonstrations on Faith (1), Pastors (10), Persecution (21) all suit Lenten reading
- **Pascha season** — Dem. 8 (Resurrection)
- **Eschatology / End-of-year reading** — Dem. 22

---

## 5. Parser strategy

- Standard NPNF parser; gapped sub-page IDs handled by iterating `provenance.json` literally
- `<h2>` chunking inside each Demonstration produces sub-section records
- Citation footer: shared NPNF II Vol. 13 BibliographicEdition with Ephraim (different translators)

---

## 6. Risks & caveats

- Only 8 of 22 Demonstrations present; the gap reflects NPNF's selection
- Syriac source; English translation is from Syriac via Gwynn
- Aphrahat's pre-Nicene Trinitarian language can sound un-Nicene to later ears; integrate with explanatory notes
- His anti-Jewish polemic (Demonstrations 11-16, NOT in this corpus) is controversial — Phase-2 would need careful framing

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T220411.json`
- Sample file: `370101.html` (Demonstration 1, Of Faith)
