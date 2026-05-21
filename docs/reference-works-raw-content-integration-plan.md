# Reference Works Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 7–8** — Roberts/Donaldson/Coxe eds., 1886. Public domain.

> **Combined plan for non-author "reference" works.** Covers the **Didache, Apostolic Constitutions, and 16 Miscellaneous Syriac + late documents** — texts that don't fit the standard Person→Work pattern. These are anonymous, pseudonymous, or composite-authorship texts.

---

## 1. Inventory

### Didache — `content/raw/reference/didache/`

| ID | Title | Notes |
|---|---|---|
| **0714** | The Didache (c. 100) | **The earliest extant Christian church order**. ~16 chapters. Pre-canonical text rediscovered 1873 in Codex Hierosolymitanus. Originally referenced by Eusebius and Athanasius but lost until late 19th century. **Foundational for early Christian liturgy** — earliest description of Eucharistic anaphora, baptism (immersion vs. effusion), the Two Ways moral catechesis. |

### Apostolic Constitutions — `content/raw/reference/apostolic-constitutions/`

| ID | Title | Notes |
|---|---|---|
| **0715** | Apostolic Constitutions (c. 380-400) | **Massive 8-book church order**; pseudonymous attribution to the apostles via Clement of Rome. Contains: Book 1-2 (moral/disciplinary), Book 3-6 (clergy duties, sacraments, persecution), Book 7 (catechumenate, baptismal liturgy with Apostolic Liturgy of Clement = Clementine Liturgy), Book 8 (anaphora — the **Clementine Liturgy**), plus 85 Apostolic Canons (key disciplinary canons for Orthodox tradition) |

### Miscellaneous Syriac & Late Documents — `content/raw/reference/miscellaneous-syriac/`

16 works:

| ID | Title | Notes |
|---|---|---|
| **0850** | Remains of the Second and Third Centuries | Patristic fragments |
| **0852** | Extracts Concerning Abgar the King | Abgar of Edessa legend |
| **0853** | Doctrine of Addai | **Syriac Abgar tradition** — Addai (Thaddeus) brings Christianity to Edessa |
| **0854** | Teaching of the Apostles (Syriac) | Syriac Didascalia |
| **0855** | Teaching of Simon Cephas in Rome | Syriac legend |
| **0856** | Acts of Sharbil | Syriac martyrdom |
| **0857** | Martyrdom of Habib the Deacon | Syriac martyrdom |
| **0858** | Martyrdom of Shamuna, Guria, Habib | Syriac confessors of Edessa (key for Mar Jacob's homily 0860) |
| **0865** | Martyrdom of Barsamya | Syriac martyrdom |
| **0863** | Letter of Mara Son of Serapion | **Non-Christian early reference to Christ** (likely 1st-3rd c. Stoic letter mentioning the "wise king of the Jews") |
| **0864** | Ambrose (Syriac) | Pseudo-Ambrose Syriac text |
| **1004** | Legend of Barlaam and Josaphat | **Christianized Buddha narrative** — preserved by John of Damascus in some traditions |
| **1013** | Passion of the Scillitan Martyrs | **EARLIEST extant Latin Christian martyrdom act** (180 AD) |
| **0514** | Treatise Against the Heretic Novatian | Anti-Novatianist polemic |
| **0515** | Treatise on Re-Baptism | 3rd-c. baptismal controversy text |
| **0835** | The False Decretals (c. 850) | **9th-c. forgeries** ascribed to early popes; enormous medieval Western canonical influence; included in ANF for reference (most are spurious) |

---

## 2. Schema models

### Didache and Apostolic Constitutions

Treat as **ChurchOrder** or **CompositeText** entities (similar to Liturgies but with disciplinary canons):

```ts
ChurchOrderText {
  id: "church-order.didache"
  title: "The Didache"
  alt_titles: ["Teaching of the Twelve Apostles", "Doctrina Apostolorum"]
  composition_date: "c. 100"
  language_original: "Greek"
  attribution: "anonymous (claimed apostolic)"
  is_canonical: false   // never formally canonical
  liturgical_significance: "Earliest description of Christian Eucharist and baptism; key text for liturgical history"
  contains: ["Two Ways", "Baptismal rite", "Eucharistic prayers", "Church discipline canons"]
  source_id: "src.newadvent.0714"
}

ChurchOrderText {
  id: "church-order.apostolic-constitutions"
  title: "Apostolic Constitutions"
  composition_date: "c. 380-400"
  contains: ["Books 1-6 (moral/disciplinary)", "Book 7 (catechumenate)", "Book 8 (Clementine Liturgy + 85 Apostolic Canons)"]
  significance: "The largest extant pre-medieval Christian church order; the Apostolic Canons (Book 8) form a key part of Orthodox canon law"
}
```

### Syriac documents and martyrdoms

Treat each as a standalone Work with `anonymous` or `attribution` field for the legendary/composite authorship.

### Mara Son of Serapion's letter

Special significance — **earliest non-Christian source mentioning Christ (with the Talmud and Josephus)**. Should be tagged for cross-reference to "historical Jesus" features.

### False Decretals

Should be clearly flagged: `is_authentic: false, is_known_forgery: true`. Useful for medieval-Western canonical history but not authoritative Orthodox material.

---

## 3. Orthodox-tradition value

### Top-tier (mandatory for the library):
- **Didache (0714)** — foundational early-Christian text; key for liturgical and catechetical history
- **Apostolic Constitutions (0715)** — the 85 **Apostolic Canons** in Book 8 are foundational for Orthodox canon law (still in force)
- **Doctrine of Addai (0853)** — Syriac Christianity's foundational legend

### Mid-tier (valuable for completeness):
- **Mara Bar Serapion (0863)** — historical-Jesus reference
- **Scillitan Martyrs (1013)** — earliest Latin martyrdom act
- **Acts of Sharbil, Habib, Barsamya, Shamuna-Guria-Habib** — Syriac martyrdom traditions

### Lower-tier (scholarly/historical only):
- **False Decretals (0835)** — known forgeries; for medieval-canonical-history study only
- **Barlaam and Josaphat (1004)** — Christianized Buddha legend; cultural-religious interest

---

## 4. Lectionary linking

- **Sept 1 (Beginning of the Indiction / Ecclesiastical New Year)** — possible Didache surfacing
- **Sept 16 (Apostles of the Seventy, including Thaddeus)** ↔ Doctrine of Addai
- **Aug 21 Confessors Shamuna and Guria; Sept 2 Habib the Deacon** — Edessan martyr commemorations
- **July 17 Scillitan Martyrs** ↔ Passion of the Scillitan Martyrs

---

## 5. Bibliographic source

ANF Vol. 7 (Didache, Apostolic Constitutions, Clementine Liturgy) and Vol. 8 (Miscellaneous Syriac, False Decretals). 1886.

---

## Appendix

- Sample files: `0714.html` (Didache), `0715.html` (Apostolic Constitutions index), `0853.html` (Doctrine of Addai), `1013.html` (Scillitan Martyrs)
