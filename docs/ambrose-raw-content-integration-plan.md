# Ambrose Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 10** — Schaff & Wace eds., 1896. Public domain. Translators: H. de Romestin (primary), with E. de Romestin and H.T.F. Duckworth.

> Ambrose of Milan (c. 339–397) was the **bishop who baptized Augustine** and one of the foundational Western Fathers. Doctor of the Church; preserver and developer of Latin Christian hymnody and homiletics.

---

## 1. Location & Inventory

```
content/raw/fathers/ambrose/
```

| Item | Count |
|---|---|
| `*.html` files | **41** |
| `provenance_*.json` | **11** |
| Total HTML size | ~3.14 MB |

### Works

| ID | Title | Type | Sub-pages | Size | Notes |
|---|---|---|---|---|---|
| **3401** | On the Duties of the Clergy | treatise | 4 (3 books + intro?) | substantial | Christian counterpart to Cicero's *De Officiis* |
| **3402** | On the Holy Spirit | treatise | 4 (3 books) | substantial | Influenced by Basil's *De Spiritu Sancto*; foundational Latin pneumatology |
| **3403** | On the Death of Satyrus | homily | 3 | substantial | Funeral oration for Ambrose's brother |
| **3404** | On the Christian Faith (De Fide) | treatise | 6 (5 books) | substantial | Anti-Arian Trinitarian; written for Gratian |
| **3405** | On the Mysteries | treatise | self-contained | 1 file | Foundational Latin sacramental theology — pairs with Cyril of Jerusalem's Mystagogical Lectures |
| **3406** | On Repentance | treatise | 3 (2 books) | substantial | Foundation of Latin penitential theology |
| **3407** | Concerning Virgins | treatise | 4 (3 books) | | On virginity |
| **3408** | Concerning Widows | treatise | self-contained | 1 file | Pastoral letter on widowhood |
| **3409** | Letters | letter | **13** (numbered 17, 18 onwards with gaps) | ~5 KB to 100 KB each | Letter sub-page IDs `340917`, `340918`, ... — gaps in numbering |
| **3410** | Memorial of Symmachus | letter | self-contained | The famous letter on the Altar of Victory controversy |
| **3411** | Sermon against Auxentius | homily | self-contained | Anti-Arian sermon during the basilica controversy |

### Letter ID encoding

3409 Letters uses 6-digit format `3409NN` with gaps. NPNF selection covers only some of Ambrose's ~91 surviving letters.

---

## 2. HTML structure

Standard New Advent shell. Standard NPNF II conventions:
- `<h2>Chapter N.</h2>` chapter markers
- Numbered paragraphs (some have leading Arabic numerals, some don't)
- `<span class="stiki">` Bible refs

### Multi-book works

For 3401, 3402, 3404, 3406, 3407 — each book is its own sub-page. Standard 5-digit IDs.

### Citation footer

```
Translated by H. de Romestin (primary).
From NPNF II, Vol. 10 (1896).
```

---

## 3. Person record

```ts
Person {
  id:          "person.ambrose"
  display:     "Ambrose of Milan"
  also_known:  ["St. Ambrose", "Ambrosius Mediolanensis"]
  born:        c. 339
  died:        397
  feast_day:   "12-07"        // Western feast (consecration); Orthodox commemoration also Dec 7
  feast_orthodox: "12-07"     // Or other date depending on jurisdiction
  tradition:   "Bishop of Milan (374-397); Doctor of the Church; baptized Augustine; major Latin hymnographer; defended Nicene orthodoxy against Arian Empress Justina"
  see:         "Milan"
  ecumenical_role: "Bridge between Greek and Latin patristic tradition; baptized Augustine, influencing his conversion; developed Latin sacramental theology"
}
```

**Orthodox significance:**
- Commemorated in Orthodox tradition on December 7
- His **On the Mysteries** (3405) is a key witness to 4th-century Western sacramental practice — pairs with Cyril of Jerusalem's Mystagogical Lectures (Eastern parallel)
- **On the Holy Spirit** (3402) is the Latin counterpart to Basil's *De Spiritu Sancto*
- He stood up to Emperor Theodosius (the Massacre of Thessalonica incident) — foundational church-state precedent

---

## 4. Bible-linking strategy

- Standard inline `<span class="stiki">` extraction
- **3405 On the Mysteries** ↔ Romans 6:3-4 (baptismal death/resurrection), John 3:5, 1 Cor 11:23-26
- **3406 On Repentance** ↔ Luke 15 (prodigal son), 2 Cor 2:5-11, Matt 18:18
- **3404 De Fide** ↔ John 1, Heb 1, Phil 2 (Christological texts)
- **3407 Concerning Virgins** ↔ Matt 19:12, 1 Cor 7, Rev 14:4

### Lectionary

- **December 7** (Ambrose feast)
- **Easter / Bright Week** — On the Mysteries (3405) as mystagogical reading
- **Lent / Great Lent** — On Repentance (3406)
- **Holy Saturday baptism preparation** — On the Mysteries (sacramental theology)

---

## 5. Parser strategy

Standard parser handles all works. Multi-book index pages plus single-file works.

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase2_20260520T223912.json`
- Sample: `3405.html` (On the Mysteries), `3402.html` (On the Holy Spirit)
