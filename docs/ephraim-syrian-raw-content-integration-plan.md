# Ephraim the Syrian Raw Content — Integration Plan

**Status:** Planning document. Inventory and structural analysis of the raw Ephraim the Syrian HTML corpus downloaded from New Advent.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 13** — Schaff & Wace eds., 1898. Public domain. **Translator: J.B. Morris** (Ephraim section).

> **Companion docs:** [Augustine](augustine-raw-content-integration-plan.md) · [Gregory of Nyssa](gregory-of-nyssa-raw-content-integration-plan.md) · [Athanasius](athanasius-raw-content-integration-plan.md) · [Basil](basil-raw-content-integration-plan.md) · [Chrysostom](chrysostom-raw-content-integration-plan.md) · [Gregory Nazianzen](gregory-nazianzen-raw-content-integration-plan.md) · [Ignatius](ignatius-raw-content-integration-plan.md) · [Irenaeus](irenaeus-raw-content-integration-plan.md) · [Cyril of Jerusalem](cyril-jerusalem-raw-content-integration-plan.md) · [John of Damascus](john-damascus-raw-content-integration-plan.md)
>
> Ephraim is the **first Syriac Father** in the library. He composed almost exclusively in **Syriac poetry** (hymns), making this a unique corpus structurally and theologically. Key features:
> 1. **All 7 works are hymns** (Syriac *madrasha* and *memra* genres)
> 2. **Alphabetic sub-page suffixes** used by Nisibene Hymns (3702a–3702f) — same regex pattern as Gregory Nazianzen's Letters Divisions
> 3. **Liturgically rich** — Ephraim's hymns are sung in the Eastern liturgical tradition; his memorial is preserved in the Lenten "Prayer of St. Ephraim" used daily in Orthodox practice

---

## 1. Location

```
content/raw/fathers/ephraim-syrian/
```

## 2. Inventory

| Item | Count |
|---|---|
| `*.html` raw files | **13** (7 indexes + 6 sub-pages of Nisibene Hymns) |
| `provenance_*.json` files | **7** |
| **Total raw HTML size** | **~0.35 MB** (estimate) |

| Work ID | Title | Sub-pages | Notes |
|---|---|---|---|
| **3702** | Nisibene Hymns | **6** (3702a–3702f, alphabetic suffixes) | Hymns commemorating the Persian sieges of Nisibis (c. 350) |
| **3703** | On the Nativity of Christ in the Flesh | 0 | Christmas/Nativity hymns |
| **3704** | For the Feast of the Epiphany | 0 | Theophany hymns |
| **3705** | On the Faith — The Pearl (Seven Hymns) | 0 | 7 hymns on the symbol of the Pearl; major theological poetry |
| **3706** | On Our Lord | 0 | Christological prose-poetry |
| **3707** | On Admonition and Repentance | 0 | Penitential hymns |
| **3708** | On the Sinful Woman | 0 | Hymn on Luke 7:36–50 (the sinful woman who anointed Jesus' feet) |

### Notable absences

The Syriac Ephraim corpus is **vast** (~3 million words). NPNF Vol. 13 is a small selection. Major absences:
- **Hymns on Paradise** — Ephraim's most studied mystical-poetic cycle
- **Hymns on the Nativity** — full cycle (only 1 selection here)
- **Hymns Against Heresies** — anti-Arian / anti-Marcionite polemics
- **Hymns on Faith** — beyond "The Pearl"
- **Commentary on the Diatessaron** — his Gospel commentary
- **Commentary on Genesis and Exodus**
- **Carmina Nisibena (full collection of 77 hymns)** — only 6 sub-pages here
- **The Prayer of St. Ephraim** ("O Lord and Master of my life...") — used liturgically in Orthodox Great Lent; not a treatise but a famous text

**Phase-2 acquisition** strongly recommended from:
- Kathleen McVey, *Ephrem the Syrian: Hymns* (Paulist Press)
- Sebastian Brock, *The Luminous Eye: The Spiritual World Vision of Saint Ephrem*
- *St. Ephrem the Syrian: Hymns on Paradise* (SVS Press, Brock)
- Edward G. Mathews & Joseph P. Amar translations

---

## 3. HTML structure

Standard New Advent shell. **Hymn-specific structural features:**

- **Hymn-level chunking**: each NPNF "hymn" sub-page contains multiple individual hymns separated by `<h2>Hymn N.</h2>` markers
- **Stanza-numbered paragraphs**: `<p>1. {stanza text}</p>`, `<p>2. ...</p>` — each numbered paragraph is a stanza
- **Response/Refrain markers**: `<p><em>R</em>. {refrain text}</p>` — the Syriac responsory marked with R
- **`<p><em>...</em></p>` for stage directions/rubrics** in some hymns
- The Nisibene Hymns file `3702a` contains "Nos. 1-3" — multiple hymns grouped per file, with `<h2>Hymn N.</h2>` as the hymn divider

### Citation footer

```
Translated by J.B. Morris.
From Nicene and Post-Nicene Fathers, Second Series, Vol. 13.
Edited by Philip Schaff and Henry Wace. 1898.
```

**Note:** Vol. 13 is **shared with Aphrahat** (different translator, different prep date — Aphrahat = Gwynn, 1890; Ephraim = Morris, 1898). The volume itself is "Syriac Documentary" — both Syriac authors bound together.

---

## 4. Person record

```ts
Person {
  id:          "person.ephraim-the-syrian"
  display:     "Ephraim the Syrian"
  also_known:  ["Ephrem the Syrian", "St. Ephrem", "Ephraem", "Mar Aphrem", "Harp of the Holy Spirit"]
  born:        c. 306
  died:        373
  feast_day:   "01-28"        // Orthodox calendar: January 28
  feast_west:  "06-09"        // Catholic Western feast day
  tradition:   "Syriac deacon and poet; the foremost hymnographer of Syriac Christianity; Doctor of the Church (1920); wrote almost entirely in Syriac verse"
  see:         "Nisibis, then Edessa (Syria/Mesopotamia)"
  ecumenical_role: "Bridge between Greek-Latin patristic tradition and Syriac Christianity; foundational hymnographer; defender of Nicene orthodoxy against Arians and Manichaeans"
  epithet:     "Harp of the Holy Spirit (Kinnara d'Ruha)"
  language_primary: "Syriac (not Greek or Latin)"
  doctor_status: true   // declared Doctor of the Church by Pope Benedict XV in 1920
}
```

**Orthodox significance:**
- One of the **most important Syriac Christian writers** — composed in Syriac poetry, not Greek prose
- **Feast day January 28** (Orthodox) — major commemoration
- The **Prayer of St. Ephraim** ("O Lord and Master of my life, give me not the spirit of sloth, despair, lust of power, and idle talk; but rather the spirit of chastity, humility, patience, and love...") is **prayed by every Orthodox Christian daily during Great Lent** — though not in this corpus, it's the most-known Ephraim text in Orthodox practice
- "Harp of the Holy Spirit" epithet — for his hymnographic gifts
- Doctor of the Church (Western recognition by Benedict XV, 1920)
- Lived as a deacon in Nisibis and then Edessa; never ordained priest

---

## 5. Bible-linking strategy

- **No head-verse epigraph pattern** — these are hymns, not commentaries
- **Inline `stiki` density**: moderate (Ephraim's hymns are saturated with biblical typology — OT types of Christ)
- **Thematic linking is THE valuable layer:**
  - **3708 On the Sinful Woman** ↔ Luke 7:36–50 (direct narrative parallel)
  - **3703 On the Nativity** ↔ Luke 1–2, Matt 1–2
  - **3704 On the Epiphany** ↔ Matt 3:13–17 (Baptism of Christ), Matt 2 (Magi visit)
  - **3705 The Pearl** ↔ Matt 13:45–46 (parable of the pearl of great price); also broadly Christological
  - **3702 Nisibene Hymns** ↔ Genesis 6–9 (Noah/Flood typology — Hymn 1 explicitly), various OT
  - **3706 On Our Lord** ↔ Gospel Christological passages
  - **3707 On Admonition and Repentance** ↔ Lucan parables, Psalm 51, Luke 15

### Lectionary linking

- **January 28 (Feast of St. Ephraim)** — surface entire corpus
- **Great Lent** — Ephraim's Prayer is recited daily; surface his admonitory hymns (3707)
- **Christmas (Dec 25)** — 3703 On the Nativity
- **Theophany (Jan 6)** — 3704 For the Feast of the Epiphany
- **The "Sunday of the Sinful Woman"** (Holy Wednesday in Orthodox tradition, when Mary of Bethany's anointing is commemorated) — 3708 On the Sinful Woman

---

## 6. Parser strategy

Standard parser handles 95% of Ephraim. Specific notes:

- **Alphabetic sub-page suffix**: 3702a-3702f. The post-Gregory-Nazianzen regex (`[a-z\d]{1,3}`) correctly handled these.
- **Hymn chunking inside Nisibene Hymns sub-pages**: each file contains multiple hymns marked by `<h2>Hymn N.</h2>`. Chunk on these to produce per-hymn WorkSection rows. Estimated 20-30 individual hymns across the 6 Nisibene sub-pages.
- **Refrain extraction**: `<p><em>R</em>. {refrain text}</p>` should be flagged with a `is_refrain: true` field (or stored as a separate property of the stanza).
- **Stanza numbering**: each `<p>N. ...</p>` is a stanza, not a paragraph.

---

## 7. Risks & caveats

- **Vast missing corpus**: the Syriac Ephraim is huge; NPNF Vol. 13 is a small sample. Document the absences clearly.
- **No Prayer of St. Ephraim** in this corpus — but it's so important liturgically that the integration should add it as a manually-entered text from a public-domain liturgical source.
- **Syriac language**: Ephraim wrote in Syriac, not Greek. The English NPNF translation is a translation-of-translation. Modern scholarly translations (Brock, McVey) are preferable for serious study.

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase1_20260520T220411.json`
- Sample files: `3702a.html` (Nisibene Hymn 1-3), `3705.html` (The Pearl), `3708.html` (On the Sinful Woman)
