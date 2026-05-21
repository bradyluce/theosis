# Early Liturgies Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **Ante-Nicene Fathers (ANF), Vol. 7** — Roberts/Donaldson/Coxe eds., 1886. Public domain. **Translator: James Donaldson.**

> **First liturgical-text corpus in the library.** Unlike Fathers (treatises/sermons/letters) and Councils (synodal documents), liturgies are **prayer texts for actual liturgical use** — they require a different schema treatment.

---

## 1. Location & Inventory

Each liturgy lives in its own subfolder under `content/raw/liturgy/`:

| ID | Folder | Liturgy | Tradition |
|---|---|---|---|
| **0717** | `liturgy-of-james` | Divine Liturgy of St. James | Antiochene / Syrian / Jerusalem |
| **0718** | `liturgy-of-mark` | Divine Liturgy of St. Mark | Alexandrian / Coptic |
| **0719** | `liturgy-of-apostles` | Divine Liturgy of the Blessed Apostles (Addai and Mari) | East Syriac (Assyrian Church of the East / Chaldean Catholic) |

**Total:** 3 liturgies, 3 HTML files, 3 provenance JSONs. All single-file self-contained.

---

## 2. HTML structure

Standard New Advent shell. **Liturgy-specific structural pattern:**

```html
<h1>Divine Liturgy of St. James</h1>

<h2>1</h2>                                  <!-- Bare numeric section heading (Irenaeus-Fragments-style) -->

<p><em>The Priest. </em></p>                <!-- Rubric — who speaks -->
<p>I O Sovereign Lord our God, ...</p>      <!-- Prayer text, leading with Roman numeral -->

<p><em>Prayer of the standing beside the altar.</em></p>     <!-- Rubric — what prayer -->
<p>II Glory to the Father, ...</p>          <!-- Roman-numeral-prefixed prayer text -->

<h2>2</h2>
...
```

**Key structural elements:**

- **Bare numeric `<h2>N</h2>` section headings** (same pattern as Irenaeus's Fragments file 0134)
- **`<p><em>Rubric text.</em></p>`** — italicized rubrics specify the speaker (Priest, Deacon, People) and the liturgical action (prayer of incense, prayer of the entrance, etc.)
- **Roman-numeral-prefixed prayers**: `<p>I O Sovereign Lord ...</p>`, `<p>II Glory to the Father ...</p>` — Roman numerals lead each prayer (same convention as Gregory Nazianzen's orations)
- Rubrics and prayer texts alternate

### Citation footer

```
Translated by James Donaldson.
From Ante-Nicene Fathers, Vol. 7.
Edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe. 1886.
```

ANF series — same as Ignatius (Vol. 1) and Irenaeus (Vol. 1) but **Vol. 7** which is the ANF Liturgies/Apocrypha volume.

---

## 3. Schema model — LiturgyText entity (new type)

Liturgies need different schema modeling than Fathers. Proposal:

```ts
LiturgyText {
  id:                   "liturgy.st-james"
  display:              "Divine Liturgy of St. James"
  alt_titles:           ["Liturgy of St. James", "Liturgy of Jerusalem", "Old Syrian Liturgy"]
  attributed_to:        "St. James the brother of the Lord"   // traditional attribution
  actual_origin:        "Antioch/Jerusalem, 4th-5th c. compilation"
  rite_family:          "Antiochene"
  living_tradition:     ["Syriac Orthodox", "Greek Orthodox (Oct 23 only)", "Maronite (modified)"]
  language_original:    "Greek (likely)"
  liturgy_type:         "Divine Liturgy (Eucharistic)"
  contains:             ["Anaphora", "Communion rite", "Litanies", "Pre-anaphora"]
  source_id:            "src.newadvent.0717"
}

LiturgySection {
  id:                   "liturgy.st-james.section.1"
  liturgy_id:           "liturgy.st-james"
  section_number:       1                  // from <h2>N</h2>
  prayers:              LiturgyPrayer[]    // child records
}

LiturgyPrayer {
  id:                   "liturgy.st-james.prayer.1"
  section_id:           "liturgy.st-james.section.1"
  prayer_number:        1                  // Roman numeral I=1, II=2, etc.
  speaker:              "Priest"           // extracted from rubric
  rubric:               "Prayer of standing beside the altar"
  body_text:            "Glory to the Father, ..."
  body_html:            "<cleaned content>"
  source_id:            "src.newadvent.0717"
}
```

This three-tier model (LiturgyText → LiturgySection → LiturgyPrayer) preserves the structure for liturgical search/use.

---

## 4. Liturgy-by-liturgy summary

### 0717 Divine Liturgy of St. James
- **Attributed to**: St. James the Brother of the Lord (first Bishop of Jerusalem)
- **Actual origin**: 4th-5th century compilation reflecting earlier Antiochene/Jerusalem practice
- **Living use**:
  - **Syriac Orthodox Church**: primary liturgy
  - **Greek Orthodox Church**: served only on **October 23 (Feast of St. James the Just)** and rarely otherwise
  - **Maronite**: as basis for the Maronite Anaphora
- **Foundational anaphora** — many later anaphoras (including Basil's and Chrysostom's) descend from this family
- **Theological richness**: anaphora prayers are saturated with biblical typology

### 0718 Divine Liturgy of St. Mark
- **Attributed to**: St. Mark the Evangelist
- **Actual origin**: 4th-5th century Alexandrian tradition
- **Living use**:
  - **Coptic Orthodox Church**: as the "Liturgy of St. Cyril" (the same text, attributed to Cyril of Alexandria in Coptic tradition)
  - **Greek Orthodox Church of Alexandria**: rarely
- **Distinctive feature**: very long intercessions (commemorations of Egypt, the Nile, agricultural seasons)

### 0719 Divine Liturgy of the Blessed Apostles (Addai and Mari)
- **Attributed to**: Saints Addai and Mari (legendary apostles to Edessa/Mesopotamia)
- **Actual origin**: 3rd century East Syriac (possibly the earliest extant Eucharistic anaphora!)
- **Living use**:
  - **Assyrian Church of the East**: primary liturgy
  - **Chaldean Catholic Church**: primary liturgy (in union with Rome)
- **Theologically unique**: the original form has **no explicit Words of Institution** — the consecration is understood to happen through the whole anaphora rather than at a specific moment. This was historically controversial but the Catholic Church officially affirmed its validity in 2001.

---

## 5. Orthodox-tradition significance

- **Liturgy of St. James** is the **ancestor of most Eastern liturgies** — the foundational form from which Basil's and Chrysostom's liturgies developed
- These three liturgies preserve **non-Byzantine Christian liturgical traditions** — Antiochene, Alexandrian, and East Syriac
- For Orthodox readers, these are **windows into the diversity of patristic liturgical practice** — the Liturgy of St. James in particular is still served on October 23

### Lectionary linking

- **October 23 (Feast of St. James the Just)** — surface Liturgy of St. James (0717)
- **Saint Mark's feast day (April 25)** — surface Liturgy of St. Mark (0718)
- **Saint Addai or Saint Mari feast days** (varies by Eastern Church) — surface Liturgy of the Apostles (0719)
- **General liturgical-study features** — surface alongside Basil's *De Spiritu Sancto* and Chrysostom's discussions of the liturgy

---

## 6. Bible-linking strategy

Liturgical prayers are **saturated with biblical paraphrase and quotation**, but they're not exegetical commentaries:

- **Inline `<span class="stiki">` density**: moderate (the anaphora explicitly quotes 1 Cor 11 and Matt 26 for the Words of Institution where present; the intercessions quote various NT passages)
- **Thematic linking** is most valuable:
  - Eucharistic prayers ↔ Matt 26:26-28, Mark 14:22-24, Luke 22:19-20, 1 Cor 11:23-26
  - Trinitarian doxologies ↔ Matt 28:19
  - Anaphora ↔ Heb 8-10 (heavenly liturgy)
  - Sanctus ↔ Isaiah 6:3
  - Communion prayers ↔ John 6, 1 Cor 10

---

## 7. Parser strategy

- Standard `<div id="springfield2">` extraction
- Chunk on `<h2>N</h2>` for sections
- Within each section, parse `<p><em>Rubric</em></p>` for speaker/action and `<p>Roman-numeral text</p>` for prayer text
- Roman-numeral extraction (reuse from Gregory Nazianzen parser)
- All 3 liturgies share the same ANF Vol. 7 SourceRecord template

---

## 8. Risks & caveats

- **Different schema** from Fathers — needs LiturgyText, LiturgySection, LiturgyPrayer entity types
- **Bare numeric `<h2>` headings** (same as Irenaeus Fragments and Liturgy files) — the parser should infer the section type from work context
- **Attribution disclaimers**: all three are attributed to apostolic figures but the texts as we have them are 4th-5th century. The integration should be honest about this without de-emphasizing the apostolic-tradition claim
- **Living liturgical use**: these aren't merely historical documents — they're still served. The library framing should respect their continuing liturgical status, not just academic study

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T220411.json`
- Sample file: `liturgy/liturgy-of-james/0717.html` (Liturgy of St. James — the foundational Antiochene anaphora)
