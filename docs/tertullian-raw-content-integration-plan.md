# Tertullian Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent (`https://www.newadvent.org/fathers/`)
**Translations:** **ANF Vols. 3–4** — Roberts/Donaldson/Coxe eds., 1885. Public domain. **Translators:** Sydney Thelwall, Peter Holmes, S. Thelwall, et al. (varies per work).

> **The single largest Phase 3 author** — 33 works, all in `content/raw/fathers/tertullian/`. Tertullian is the **first major Latin Christian theologian** (writing c. 197–225). His vocabulary (*Trinitas*, *persona*, *substantia*, *sacramentum*) shaped all subsequent Latin theology. **NOT venerated as a saint** in either East or West due to his later Montanist phase, but his pre-Montanist works are universally received as orthodox.

---

## 1. Inventory

**Location:** `content/raw/fathers/tertullian/`

- 33 works (IDs 0301–0325, 0401–0409)
- 40 HTML files total (most works single-file; 7 works have sub-pages)
- ~5.0 MB total

### Sub-page breakdown

| Work | Sub-pages | Notes |
|---|---|---|
| **0301 Apology** | 0 (single-file) | 50 chapters in one file |
| **0312 Against Marcion** | **5** (03121–03125) | 5 books — major anti-Gnostic work |
| **0307 Ad Nationes** | 2 (03061, 03062) | Wait — this is 0306 |
| All others (~28 works) | 0 (self-contained, single file) | Chapter structure inside |

### Major works in the corpus

| ID | Title | Type | Significance |
|---|---|---|---|
| **0301** | Apology | apologetic | **Tertullian's most famous work**; classic defense of Christianity to Roman magistrates; coined "the blood of the martyrs is the seed of the Church" (ch. 50) |
| **0312** | Against Marcion (5 books) | treatise | The fullest extant 2nd-c. refutation of Marcionite gnosticism; preserves much of Marcion's edition of Luke + Paul |
| **0311** | Prescription Against Heretics | treatise | Classic argument that Scripture is the property of the Church, not the heretics |
| **0317** | Against Praxeas | treatise | **Foundational Trinitarian text in Latin**; coins "Trinity" terminology in Latin |
| **0315** | On the Flesh of Christ | treatise | Anti-docetic Christology; "*credibile est, quia ineptum est*" — "it is credible because it is absurd" (often misquoted as "I believe because it is absurd") |
| **0316** | On the Resurrection of the Flesh | treatise | Bodily-resurrection defense |
| **0322** | On Prayer | treatise | Earliest extant Latin commentary on the Lord's Prayer |
| **0321** | On Baptism | treatise | Earliest extant Christian treatise on baptism (~200 AD); witness to early baptismal practice |
| **0310** | On the Soul | treatise | Christian anthropology; tradicianism (soul propagated through generation) |
| **0306** | Ad Nationes | apologetic | Predecessor to the Apology; similar themes |
| **0324** | Martyrdom of Perpetua and Felicity | hagiography | **Famous female martyr's diary** (Perpetua's own first-person account of her imprisonment); one of the great early martyr-acts |

### Tertullian's Montanist works (post-c. 207)

Several works in the corpus reflect Tertullian's later Montanist phase (rigorist ascetic movement; partially heretical):
- **0405** On Exhortation to Chastity
- **0406** On Monogamy (against widow remarriage)
- **0407** On Modesty
- **0408** On Fasting
- **0409** De Fuga in Persecutione (against fleeing persecution)

The integration should flag these works with a `phase: "montanist"` or `is_montanist: true` field. The Theosis library should present them with a brief disclaimer (Tertullian's Montanist period is not received as fully orthodox).

---

## 2. HTML structure

Standard New Advent shell. Each work file has:

- `<h1>{Work Title}</h1>` followed by Gumroad banner
- `<h2>Chapter N</h2>` headings — simple, no description in heading text usually
- Body paragraphs (bare `<p>`, **no leading numerals**)
- `<span class="stiki">` Bible references throughout
- Standard ANF citation footer

### Citation footer (varies per work)

```
Translated by Sydney Thelwall.   (or Peter Holmes, Alexander Roberts, et al.)
From Ante-Nicene Fathers, Vol. 3.   (or Vol. 4)
Edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe. 1885.
```

**ANF Vol. 3** = "Latin Christianity: Its Founder, Tertullian" — most Tertullian works.
**ANF Vol. 4** = "Tertullian Part IV; Minucius Felix; Commodian; Origen Parts I and II" — the remaining Tertullian works (Pallium, Apparel of Women, etc.).

### Special HTML notes

- **0324 Martyrdom of Perpetua and Felicity** uses standard `<h2>Chapter N</h2>` chunking but the content is **first-person diary** in chapters 3–10 (Perpetua's voice). The parser should preserve the body as-is; future editorial work could mark Perpetua's voice vs. the editor's voice (chapters 1–2, 11–21).
- **0312 Against Marcion** sub-pages (03121–03125) each contain one of Marcion's "books"; each book has many internal `<h2>Chapter N</h2>` sections.

---

## 3. Person record

```ts
Person {
  id:          "person.tertullian"
  display:     "Tertullian"
  also_known:  ["Quintus Septimius Florens Tertullianus"]
  born:        c. 155
  died:        c. 220-240
  feast_day:   null   // NOT a canonized saint (his later Montanist phase)
  tradition:   "First major Latin Christian theologian; lawyer and rhetorician from Carthage; coined much foundational Latin theological vocabulary; later joined the Montanist movement (rigorist asceticism); not formally venerated as a saint in either East or West"
  see:         "Carthage (North Africa)"
  language_primary: "Latin (first major Christian Latin writer)"
  ecumenical_role: "First Latin theologian; coined 'Trinitas', 'persona', 'substantia', 'sacramentum' in Christian usage; pre-Montanist works universally received as orthodox; Montanist works treated with caution"
  is_saint:    false
  has_caveat:  true   // Montanist phase
}
```

**Significance:**
- **First major Latin theologian** — Christian Latin theological vocabulary begins with Tertullian
- **Pre-Augustinian Latin Christianity** — laid the groundwork that Augustine, Jerome, Ambrose built upon
- His **anti-Gnostic and anti-Marcionite polemic** preserves invaluable historical-textual information about 2nd-century heresies
- **His Montanist phase** (c. 207 onward) makes him a contested figure; some of his rigorist views (e.g., remarriage forbidden) are not received by the broader Church

---

## 4. Work records

33 rows. Schema additions:

```ts
Work {
  id:               "work.tertullian.0301"
  title:            "Apology"
  alt_titles:       ["Apologeticum", "Apologeticus"]
  work_type:        "apologetic"
  composition_date: "c. 197"
  has_subsections:  false
  section_count:    50    // chapters in this work
  phase:            "pre-montanist"   // or "montanist" / "uncertain"
  source_id:        "src.newadvent.0301"
  is_authentic:     true
}
```

For Montanist works:

```ts
Work {
  id:               "work.tertullian.0405"
  title:            "On Exhortation to Chastity"
  phase:            "montanist"
  authorship_note:  "Composed during Tertullian's Montanist period (c. 207+); reflects rigorist views (e.g., prohibition on widow remarriage) not received by the broader Catholic-Orthodox tradition. Patristic value remains but with appropriate framing."
  ...
}
```

---

## 5. Bible-linking strategy

- **No head-verse epigraph pattern** — Tertullian's works are polemical-theological, not commentary
- **High inline `stiki` density** — Tertullian quotes Scripture constantly, especially in *Against Marcion* (where he refutes Marcion verse-by-verse using Marcion's own truncated Bible)
- **Thematic mapping is the key Bible-linking work:**
  - **Against Marcion** ↔ Luke, Paul's letters (Marcion's canon — Tertullian refutes line by line)
  - **Against Praxeas** ↔ John 1, John 10:30, Matt 28:19, Phil 2 (Trinitarian texts)
  - **On the Resurrection of the Flesh** ↔ 1 Cor 15
  - **On Baptism** ↔ John 3:5, Romans 6, Matt 28:19
  - **On Prayer** ↔ Matt 6:9–13 (Lord's Prayer)

### Estimated `stiki` count

~5,000+ Bible references corpus-wide. Against Marcion alone likely has 1,000+ references.

---

## 6. Schema considerations

1. **Phase field** (`pre-montanist` / `montanist` / `uncertain`) on Work
2. **`is_saint: false`** on the Person record
3. **Authorship note** for Montanist works
4. UI should clearly distinguish Tertullian's pre-Montanist canonical works from his later contested writings

---

## 7. Bibliographic source

- ANF Vol. 3 (most works) and Vol. 4 (later works incl. Pallium, Modesty, Monogamy, etc.)
- Multiple translators across the corpus (Thelwall, Holmes, Roberts, et al.)
- Year 1885

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase3_20260520T225233.json`
- Sample files: `0301.html` (Apology), `0317.html` (Against Praxeas), `0322.html` (On Prayer), `0324.html` (Martyrdom of Perpetua and Felicity), `04161.html` (Against Marcion Book I)
