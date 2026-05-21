# Ecumenical Councils Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 14** — Schaff & Wace eds., 1900. Public domain. **Translator: Henry Percival** (all councils).

> **This is the first conciliar corpus in the library** (not a Father). Unlike author corpora, councils require a **different schema model** — they are not "Works by Person X" but **synodal documents authored by an assembly of bishops**.

---

## 1. Location & Inventory

Each Ecumenical Council lives in its own subfolder:

```
content/raw/councils/ecumenical/{nicaea-i, constantinople-i, ephesus, chalcedon, constantinople-ii, constantinople-iii, nicaea-ii}/
```

| ID | Folder | Council | Year | Files |
|---|---|---|---|---|
| **3801** | `nicaea-i` | First Council of Nicaea | 325 | 1 |
| **3808** | `constantinople-i` | First Council of Constantinople | 381 | 1 |
| **3810** | `ephesus` | Council of Ephesus | 431 | 1 |
| **3811** | `chalcedon` | Council of Chalcedon | 451 | 1 |
| **3812** | `constantinople-ii` | Second Council of Constantinople | 553 | 1 |
| **3813** | `constantinople-iii` | Third Council of Constantinople | 680 | 1 |
| **3819** | `nicaea-ii` | Second Council of Nicaea | 787 | 1 |

**Total:** 7 councils, 7 HTML files, 7 provenance JSONs. All single-file self-contained. **All 7 Ecumenical Councils recognized by Orthodoxy** are present.

---

## 2. HTML structure

Standard New Advent shell. **Council-specific structural pattern:**

```html
<h1>First Council of Nicæa (A.D. 325)</h1>

<h2>The Nicene Creed</h2>
<p>{Creed text — explicit doctrinal definition}</p>

<h2>The Canons</h2>
<h3>Canon 1</h3>
<p>{Canon 1 text}</p>
<h3>Canon 2</h3>
<p>{Canon 2 text}</p>
...
```

**Two-tier `<h2>` (section) / `<h3>` (canon) hierarchy:**

- `<h2>The Creed/Definition</h2>` — the doctrinal pronouncement (creed, definition of faith, etc.)
- `<h2>The Canons</h2>` — the disciplinary canons section
- `<h3>Canon N</h3>` — individual canons within the section

Some councils have additional sections:
- **Ephesus (431)**: Cyril of Alexandria's 12 Anathemas against Nestorius
- **Chalcedon (451)**: The Tome of Leo, the Definition of Faith, plus 30 canons
- **Constantinople II (553)**: 14 Anathemas against the Three Chapters
- **Nicaea II (787)**: The Definition of Faith on icons, plus 22 canons
- **Constantinople III (680)**: Definition on the Two Wills of Christ

### Inline Greek text

Many councils preserve **key theological terms in Greek script** inline:

```html
<span class="greek">ὁμοούσιον</span>  <!-- homoousios -->
<span class="greek">γεννηθέντα</span>  <!-- gennēthenta (begotten) -->
```

The parser must preserve `<span class="greek">` markup for theological accuracy.

### Citation footer

```
Translated by Henry Percival.
From Nicene and Post-Nicene Fathers, Second Series, Vol. 14.
Edited by Philip Schaff and Henry Wace. 1900.
```

All 7 Ecumenical Councils share the same SourceRecord template. Single `BibliographicEdition` for NPNF II Vol. 14.

---

## 3. Schema model — Council entity (new type)

Unlike Fathers, Councils don't have a single Person author. Recommend a new entity type:

```ts
Council {
  id:                   "council.nicaea-i"
  ecumenical_number:    1               // 1-7 for the seven Ecumenical Councils
  display:              "First Council of Nicaea"
  alt_titles:           ["Nicaea I", "Council of Nicaea"]
  year:                 325
  city:                 "Nicaea (modern Iznik, Turkey)"
  emperor:              "Constantine I"
  bishops_attending:    "~318 (traditional count)"
  council_type:         "ecumenical"   // or "local"
  recognized_by:        ["Orthodox", "Catholic", "Anglican", "Lutheran", "most Protestant"]
  primary_targets:      ["Arianism"]   // heresies condemned
  major_outputs:        ["Nicene Creed (original form)", "20 canons", "Settlement of the Paschal date controversy"]
  source_id:            "src.newadvent.3801"
}
```

### CanonRecord (for individual canons)

```ts
CanonRecord {
  id:                   "canon.nicaea-i.1"
  council_id:           "council.nicaea-i"
  canon_number:         1
  short_label:          "Nic. 1"           // standard scholarly form
  topic:                "Self-castration"  // hand-curated topic
  body_html:            "<cleaned content>"
  body_text:            "..."
  source_id:            "src.newadvent.3801"
  bible_refs:           BibleRef[]
}
```

### CouncilDocument (for Creed/Definition/Anathemas)

```ts
CouncilDocument {
  id:                   "council.nicaea-i.creed"
  council_id:           "council.nicaea-i"
  document_type:        "creed"           // or "definition", "anathemas", "tome", "horos"
  short_label:          "Nicene Creed (325)"
  is_doctrinal:         true              // creed/definition/anathemas vs. canons (disciplinary)
  body_html:            "<cleaned content>"
  body_text:            "..."
  source_id:            "src.newadvent.3801"
  bible_refs:           BibleRef[]
}
```

---

## 4. Council-by-council summary

### 3801 First Council of Nicaea (325)
- **Doctrinal**: Nicene Creed (original form — without the Holy Spirit clause); rejection of Arius
- **Disciplinary**: 20 canons (clerical discipline, Paschal date, hierarchical structure)
- **Key term**: ὁμοούσιον (*homoousios* — "of one substance" / "consubstantial")
- **Orthodox significance**: foundational; sets Trinitarian terminology

### 3808 First Council of Constantinople (381)
- **Doctrinal**: Niceno-Constantinopolitan Creed (the form recited in liturgy today)
- **Key additions**: Pneumatology clauses ("And in the Holy Spirit, the Lord, the giver of life..."); rejection of Macedonian/Pneumatomachi heresy
- **Disciplinary**: 7 canons (5 of which are the original Constantinopolitan canons)

### 3810 Council of Ephesus (431)
- **Doctrinal**: Definition that the Virgin Mary is **Theotokos** ("God-bearer"); condemnation of Nestorius
- **Includes Cyril of Alexandria's 12 Anathemas against Nestorius**
- **Disciplinary**: 8 canons

### 3811 Council of Chalcedon (451)
- **Doctrinal**: Definition of Christ's two natures (*hypostatic union*); **the Chalcedonian Definition** — "one person in two natures, without confusion, without change, without division, without separation"
- **Includes Pope Leo I's Tome** (a doctrinal letter incorporated into the council's acts)
- **Disciplinary**: 30 canons (Canon 28 controversial — elevating Constantinople's see)
- **Major rupture**: the Oriental Orthodox (Copts, Armenians, Ethiopians, Syriacs) rejected Chalcedon

### 3812 Second Council of Constantinople (553)
- **Doctrinal**: The Three Chapters controversy; condemnation of Theodore of Mopsuestia, Theodoret's anti-Cyrilline writings, and Ibas's Letter to Maris
- **Includes 14 Anathemas** against the Three Chapters
- **Origenist condemnation** (separately appended in some MSS)

### 3813 Third Council of Constantinople (680)
- **Doctrinal**: Definition of Christ's **two wills** (dyothelitism); condemnation of monothelitism
- **Condemned figures**: Sergius, Pyrrhus, Honorius (a pope!), Macarius of Antioch
- **No new canons** — purely doctrinal council
- **Quinisext (Trullo) Council (3814)** added canons in 692 (in our local-councils corpus)

### 3819 Second Council of Nicaea (787)
- **Doctrinal**: Definition on the veneration of icons; condemnation of iconoclasm
- **Includes the Horos (Definition of Faith) on icons**: defines that icons are venerated (proskynesis) not worshipped (latria)
- **Disciplinary**: 22 canons
- **Most-recently received** as Ecumenical by the Eastern tradition; some Reformed traditions don't accept

---

## 5. Bible-linking strategy

- Inline `<span class="stiki">` Bible refs throughout — moderate density (most heavily in the doctrinal definitions)
- **Thematic mapping**: each council connects to specific NT/OT passages that the council interpreted (e.g., Nicaea I connects to John 1:1, Matt 28:19; Chalcedon connects to John 1:14, Phil 2; Ephesus to Luke 1:43; Nicaea II to Col 1:15, Heb 1)

### Lectionary linking — Orthodox calendar

Each Ecumenical Council has an Orthodox feast commemorating it:
- **Sunday before October 11** — Seventh Ecumenical Council (Nicaea II, icons)
- **Sunday after July 13** — Fathers of the First Six Councils
- **Sunday of the Fathers of the Fourth Ecumenical Council** (mid-July)
- **Sunday of Orthodoxy (1st Sunday of Great Lent)** — celebrates the triumph of icons / Nicaea II
- **May 21** — Constantine and Helena (associated with Nicaea I)

---

## 6. Parser strategy

- Standard `<div id="springfield2">` extraction
- Chunk on `<h2>` for top-level sections (Creed, Canons, Anathemas, Tome)
- Chunk on `<h3>` for individual canons
- Preserve `<span class="greek">` markup
- Generate Council, CouncilDocument, CanonRecord rows per the schema above
- All 7 councils share the same NPNF II Vol. 14 SourceRecord template

---

## 7. Risks & caveats

- **Different schema** from Fathers — needs Council, CouncilDocument, CanonRecord entity types
- **Council 1 (Trullo/Quinisext, 692)** is technically a continuation of Council 6 (Constantinople III, 680) — but it's classified as "local" by some traditions because Rome rejected its canons. We have Trullo in the `local` folder; the Orthodox tradition considers its canons binding.
- **Recognition varies by tradition**: Orthodox = 7 Ecumenicals; Catholic = 7 + more; Oriental Orthodox = 3 (rejects Chalcedon onward); Assyrian Church of the East = 2.
- **Greek text preservation** is critical for theological accuracy.

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T220411.json`
- Sample files: `councils/ecumenical/nicaea-i/3801.html`, `councils/local/3814.html` (Trullo)
