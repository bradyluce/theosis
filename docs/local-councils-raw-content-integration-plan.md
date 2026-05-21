# Local Councils Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 14** — Schaff & Wace eds., 1900. Public domain. **Translator: Henry Percival** (same translator as Ecumenical Councils).

> Companion: [`ecumenical-councils-raw-content-integration-plan.md`](ecumenical-councils-raw-content-integration-plan.md). The schema (Council, CouncilDocument, CanonRecord) is identical; the `council_type` field distinguishes "ecumenical" from "local".

---

## 1. Location & Inventory

All 11 local councils live in a **single shared folder** (not subfoldered per-council, unlike ecumenicals):

```
content/raw/councils/local/
```

| ID | Council | Year | Region | Notes |
|---|---|---|---|---|
| **3818** | Carthage under Cyprian | 257 | North Africa | Pre-Nicene baptismal controversy |
| **3802** | Ancyra | 314 | Asia Minor | Apostasy under Diocletian; readmission of lapsed |
| **3803** | Neocaesarea | 315 | Pontus | Discipline of clergy and laity |
| **3805** | Antioch in Encaeniis | 341 | Antioch | The "Dedication" Council; Arian-leaning canons |
| **3804** | Gangra | 343 | Paphlagonia | Against excessive asceticism (Eustathians) |
| **3815** | Sardica | 344 | Eastern Europe | Defended Athanasius |
| **3809** | Constantinople | 382 | Constantinople | Follow-up to Constantinople I |
| **3806** | Laodicea | 390 | Asia Minor | Liturgical discipline; biblical canon |
| **3817** | Constantinople under Nectarius | 394 | Constantinople | Episcopal discipline |
| **3816** | Carthage | 419 | North Africa | 138 canons; consolidated African discipline |
| **3814** | Constantinople / Trullo / Quinisext | 692 | Constantinople | 102 canons — Orthodox tradition considers these binding for Orthodox practice |

**Total:** 11 councils, 11 HTML files, 11 provenance JSONs. All single-file self-contained.

---

## 2. HTML structure

Identical to the Ecumenical Councils structure (`ecumenical-councils-raw-content-integration-plan.md` §2). Two-tier `<h2>` / `<h3>` hierarchy. Canon-numbered.

Notable: **Trullo (3814)** is massive — 102 canons. Canon 1 is a doctrinal canon affirming the previous six councils; the rest are disciplinary. **Trullo is the most theologically and ritually important local council for Orthodoxy** — many distinctively Orthodox practices (priest beards, fasting rules, the Paschal date calculation, etc.) are codified here.

---

## 3. Schema model

Use the **Council entity** from the Ecumenical Councils plan (§3), with:

```ts
council_type: "local"
ecumenical_number: null  // local councils have no ecumenical number
```

---

## 4. Council significance summary

### Pre-Nicene (1)
- **3818 Carthage under Cyprian (257)** — On the baptism of heretics (Cyprian held re-baptism necessary; Rome disagreed)

### Post-Nicene 4th century (5)
- **3802 Ancyra (314)** — Post-Diocletian penitential discipline
- **3803 Neocaesarea (315)** — Clerical discipline
- **3805 Antioch (341)** — Arian-leaning canons during the controversies
- **3804 Gangra (343)** — Against extreme ascetic groups; affirms marriage, meat-eating, ownership of property
- **3815 Sardica (344)** — Western defense of Athanasius

### Late 4th century (3)
- **3809 Constantinople (382)** — Reaffirms Constantinople I
- **3806 Laodicea (390)** — Major canonical council; **defines an early biblical canon** (canons 59-60 list OT and NT books)
- **3817 Constantinople under Nectarius (394)** — Episcopal discipline

### 5th century (1)
- **3816 Carthage (419)** — 138 canons consolidating African discipline; informed the later Western canonical tradition

### Quinisext / Trullo (1)
- **3814 Constantinople / Trullo / Quinisext (692)** — **THE MOST IMPORTANT** local council for Orthodoxy. 102 canons. Sometimes treated as the disciplinary continuation of Constantinople III. Rome did not receive it; this is one of the root causes of East-West canonical divergence.

---

## 5. Orthodox-tradition significance

- The **Trullo Council (3814)** is foundational for Orthodox canon law — its 102 canons regulate:
  - Clerical celibacy / marriage (Canon 13 allows married clergy; West rejected this)
  - Beards for priests (Canon 96 on hair customs)
  - Fasting rules
  - Liturgical practice
  - Iconography (Canon 82 — Christ's image not as a lamb but as a man)
- **Laodicea (3806)** Canon 59-60 — **earliest extant ecclesial enumeration of the biblical canon**
- **Gangra (3804)** — important corrective against gnostic-leaning ascetic extremism; affirms marriage and meat-eating
- **Sardica (3815)** — affirmed Athanasius's appeal to Rome (relevant to later papal-primacy debates)

---

## 6. Bible-linking & lectionary

Most local councils have **limited Bible-linking value** — they're disciplinary, not exegetical. Exceptions:
- **Laodicea Canon 59-60** — directly relevant to biblical canon history; should be cross-linked to the Bible reader's "About this Bible" or "Canon History" page
- **Trullo Canon 82** — relevant to iconographic theology; cross-link to icon-related content
- **Carthage 419** — many canons cite scriptural justifications

### Lectionary

Most local councils don't have specific feast days. The **Sunday of the Fathers of the First Six Ecumenical Councils** (mid-July) can surface relevant local councils too.

---

## 7. Parser strategy

Identical to Ecumenical Councils. Single shared `BibliographicEdition` for NPNF II Vol. 14 (also shared with Ecumenicals).

---

## 8. Risks & caveats

- **Variable recognition**: which local councils are "binding" varies by tradition. Orthodox tradition treats Trullo + many others as authoritative; Catholic tradition does not receive Trullo.
- **Single-folder organization**: unlike ecumenicals (per-council folder), local councils share a folder. This is a content-tree convention — schema modeling is still per-council.
- **Trullo (3814) is unusually long** — 102 canons. Parser must handle 100+ `<h3>Canon N</h3>` sections.

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T220411.json`
- Sample file: `councils/local/3814.html` (Trullo, the most important local council for Orthodoxy)
