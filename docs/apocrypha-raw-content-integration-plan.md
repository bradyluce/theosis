# Apocrypha Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 8** — Roberts/Donaldson/Coxe eds., 1886. Public domain.

> **39 non-canonical Christian texts** — apocryphal Gospels, Acts of Apostles, Apocalypses, and Marian texts. **Distinct integration treatment required**: these are NOT part of the Christian canon and must be clearly labeled as such in the library, while remaining available for scholarly and historical study. Many of these texts have shaped Orthodox iconographic tradition (e.g., Mary's parents Joachim and Anna are named only in the Protoevangelium of James) and certain pious traditions.

---

## 1. Location

```
content/raw/apocrypha/   (all 39 works in a single folder, no subfoldering)
```

45 HTML files, 39 provenance JSONs, ~2.4 MB.

---

## 2. Inventory by category

### Apocryphal Gospels (8 works)

| ID | Title | Date | Theological orientation |
|---|---|---|---|
| **1001** | Gospel of Peter | c. 190 | **DOCETIC** (denies Christ truly suffered) |
| **0846** | Gospel of Thomas | c. 200 | **GNOSTIC** — sayings collection |
| **0807** | Gospel of Nicodemus (Acta Pilati) | (later) | Pious narrative of Christ's descent into Hades |
| **0848** | Gospel of Pseudo-Matthew | c. 400 | Marian — childhood of Jesus |
| **0806** | Arabic Gospel of the Infancy of the Saviour | (late) | Childhood-of-Jesus tales |
| **0849** | Gospel of the Nativity of Mary | (late) | Marian birth narrative |
| **0847** | Protoevangelium of James | c. 150 | **Major Marian source** — names Joachim and Anna, describes Mary's childhood in the Temple |
| **0805** | History of Joseph the Carpenter | c. 400 | Death of Joseph |

### Apocryphal Acts of Apostles (14 works)

| ID | Title | Date | Theological orientation |
|---|---|---|---|
| **0816** | Acts of Paul and Thecla | c. 180 | Female disciple Thecla |
| **0815** | Acts of Peter and Paul | c. 200 | Both apostles' Roman ministry |
| **0823** | Acts of Thomas | c. 240 | **GNOSTIC** — Thomas in India |
| **0826** | Acts of Thaddaeus | c. 250 | Edessa mission |
| **0819** | Acts of Andrew | c. 260 | **GNOSTIC** |
| **0827** | Acts of John | (various) | **DOCETIC** sections |
| **0818** | Acts of Philip | c. 350 | Hierapolis martyrdom |
| **0817** | Acts of Barnabas | c. 500 | Cyprus mission |
| **0825** | Acts of Bartholomew | c. 500 | **NESTORIAN** origins |
| **0822** | Acts and Martyrdom of St. Matthew | (late) | |
| **0820** | Acts of Andrew and Matthias | (late) | Cannibalistic city legend |
| **0821** | Acts of Peter and Andrew | (late) | |
| **0824** | Consummation of Thomas the Apostle | (late) | |
| **1008** | Acts of Xanthippe and Polyxena | c. 270 | Female disciples |

### Apocalypses (7 works)

| ID | Title | Tradition |
|---|---|---|
| **1003** | Apocalypse of Peter | c. 130 | Early Christian; included in some early canon lists; vision of heaven and hell |
| **1017** | Apocalypse of Paul (Visio Pauli) | c. 380 | Hugely influential medieval text (basis for Dante) |
| **0831** | Apocalypse of John | (apocryphal — not Revelation) | Later legendary apocalypse |
| **0828** | Apocalypse of Moses | **JUDAISTIC** | Adam-Eve cycle |
| **0829** | Apocalypse of Esdras | **JUDAISTIC** | |
| **1005** | Apocalypse of the Virgin | (medieval) | Mary's tour of hell |
| **1006** | Apocalypse of Sedrach | (medieval) | |

### Marian + Joseph (Beyond gospels above)
- **0832** Assumption of Mary (c. 400) — basis for the Orthodox Dormition feast tradition

### Pilate-cycle (4 works)
- **0809** Report of Pontius Pilate
- **0810** Letter of Pontius Pilate
- **0811** Giving Up of Pontius Pilate
- **0812** Death of Pilate
- **0813** Narrative of Joseph of Arimathea
- **0814** Avenging of the Saviour (c. 700)

### OT Pseudepigrapha included in this corpus
- **0801** Testaments of the Twelve Patriarchs — major Jewish-Christian text
- **1007** Testament of Abraham — **JUDAISTIC**
- **1009** Narrative of Zosimus

---

## 3. Integration strategy — special handling required

### Schema flags

Every apocryphal work needs:

```ts
Work {
  is_canonical: false,
  canonical_status: "apocryphal",
  authorship_attribution: "pseudonymous",
  theological_orientation: "orthodox" | "gnostic" | "docetic" | "nestorian" | "judaistic" | "neutral",
  liturgical_use: ["dormition", "nativity-of-mary", "joachim-anna-feast"] | [],
  warning_required: true | false,   // Gnostic/Docetic texts need a "for scholarly use" warning
  ...
}
```

### Apocryphal Person records (pseudonymous authors)

Treat each apocryphal text as having a `pseudonymous_attribution` field rather than a real Person record:

```ts
Work {
  id: "work.apocrypha.0847"
  title: "Protoevangelium of James"
  pseudonymous_attribution: "James (brother of the Lord)"
  actual_author: "unknown 2nd-c. Christian writer"
  is_canonical: false
}
```

### Orthodox-tradition relevance (high)

Several apocrypha shape Orthodox tradition even though non-canonical:

- **0847 Protoevangelium of James** — names Mary's parents **Joachim and Anna** (now in Orthodox liturgy); describes Mary's presentation in the Temple at age 3 → **Feast of the Entrance of the Theotokos into the Temple (Nov 21)** is based on this text
- **0832 Assumption of Mary** — basis for the **Dormition of the Theotokos (Aug 15)**
- **0807 Gospel of Nicodemus (Acta Pilati)** — Christ's descent into Hades → fundamental for Holy Saturday liturgy and the **Anastasis icon**
- **0848 Gospel of Pseudo-Matthew** — childhood-of-Jesus narratives that show up in Western iconography
- **1017 Apocalypse of Paul** — shaped medieval visions of heaven/hell (Dante's Divine Comedy)

---

## 4. Lectionary linking

- **Nov 21 Entrance of the Theotokos** ↔ Protoevangelium of James 7-8
- **Aug 15 Dormition** ↔ Assumption of Mary (0832)
- **Holy Saturday / Anastasis** ↔ Gospel of Nicodemus (Christ's descent into Hades — Part II)
- **Sept 9 Joachim and Anna** ↔ Protoevangelium of James 1-5

---

## 5. Cross-corpus links

- **Apocrypha** ↔ **Eusebius Church History** (Eusebius discusses many apocryphal works)
- **Apocrypha** ↔ **Irenaeus Adversus Haereses** (Irenaeus refutes Gnostic Gospels)
- **Protoevangelium ↔ Orthodox Liturgy** (Mary's parents, Entrance feast)
- **Acts of Paul and Thecla** ↔ **Tertullian On Baptism** (Tertullian criticizes use of Thecla's example for women baptizing)

---

## 6. Bibliographic source

ANF Vol. 8 (1886). "The Twelve Patriarchs, Excerpts and Epistles, The Clementia, Apocrypha, Decretals, Memoirs of Edessa and Syriac Documents, Remains of the First Ages." Various translators.

---

## 7. Risks & caveats

- **All works must be clearly labeled non-canonical** in the UI
- **Gnostic/Docetic texts** (Gospel of Peter, Gospel of Thomas, some Acts) should carry stronger warnings
- **Judaistic OT pseudepigrapha** included in this corpus (Testaments of 12 Patriarchs, Testament of Abraham, etc.) — note these are Jewish texts with Christian interpolations
- **Avoid presenting any apocryphal text as Scripture** — but acknowledge those that informed Orthodox piety (Protoevangelium especially)

---

## Appendix

- All 39 files in `content/raw/apocrypha/`
- Sample files: `0847.html` (Protoevangelium of James — most influential), `1017.html` (Apocalypse of Paul), `0832.html` (Assumption of Mary)
