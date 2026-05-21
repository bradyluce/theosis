# Monastic Tradition Raw Content — Integration Plan

**Status:** Planning document — combined doc for **John Cassian** and **Sulpitius Severus**, the two foundational Latin monastic-historical authors of the late 4th / early 5th century.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 11** — Schaff & Wace eds., 1894. Public domain.

> **John Cassian** brought Egyptian desert monasticism to the Latin West. **Sulpitius Severus** wrote the first major Western hagiography (Life of St. Martin). Together they founded the **Latin monastic literary tradition** and influenced Benedict, the entire Western monastic movement, and Orthodox spirituality through translation.

---

## 1. Location & Inventory

| Folder | Author | Works | HTML | Total Size |
|---|---|---|---|---|
| `fathers/john-cassian/` | John Cassian | 3 | 43 | ~2.72 MB |
| `fathers/sulpitius-severus/` | Sulpitius Severus | 5 | 10 | ~0.79 MB |
| **TOTAL** | **2 authors** | **8 works** | **53 files** | **~3.5 MB** |

---

## 2. Works

### John Cassian (c. 360 – 435; NPNF II Vol. 11; translator: Edgar C.S. Gibson)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **3507** | **Institutes** (Institutes of the Cœnobia and the Remedies for the Eight Principal Faults) | treatise | **12 books** | The foundational rule-book for Western cenobitic monasticism. Books 1-4: practical (clothing, prayer, daily routine); Books 5-12: spiritual (the 8 vices) |
| **3508** | **Conferences** (Collationes) | treatise | **22 conferences** | Reported dialogues with Egyptian desert fathers. The most influential monastic text after the Rule of St. Benedict. |
| **3509** | On the Incarnation of the Lord | treatise | self-contained | Anti-Nestorian Christology |

### Sulpitius Severus (c. 363 – c. 425; NPNF II Vol. 11; translator: Alexander Roberts)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **3501** | On the Life of St. Martin | hagiography | self-contained | **THE foundational Western hagiography** — popularized monastic biography genre |
| **3502** | Letters (Genuine) | letter | 3 sub-pages | Personal correspondence |
| **3503** | Dialogues | treatise | 3 dialogues | Sequel-style dialogues continuing Martin's life and Egyptian desert lore |
| **3504** | Letters (Dubious) | letter | self-contained | Letters of disputed authenticity |
| **3505** | Sacred History | history | 2 books | World history from creation to Sulpitius's day |

---

## 3. HTML structure

Standard New Advent shell.

### Cassian's Conferences (3508)
- 22 sub-pages, IDs `3508NN` (5 or 6-digit format, depending on conference number)
- Each Conference is dedicated to a different Desert Father (Abbot Moses, Abbot Paphnutius, etc.)
- Each Conference has internal `<h2>Chapter N.</h2>` markers + `<p><strong>Description.</strong></p>` topic intros + numbered paragraphs

### Cassian's Institutes (3507)
- 12 sub-pages, one per book
- Books 1-4 cover practical monastic life; Books 5-12 are the foundation of the **eight principal vices** schema (later transmitted to the West as the "seven deadly sins" via Gregory the Great)

### Sulpitius's Life of Martin (3501)
- Single self-contained file
- Chapter-numbered

### Citation footer
All works share NPNF II Vol. 11 (1894) BibliographicEdition.

---

## 4. Person records

```ts
Person {
  id:          "person.john-cassian"
  display:     "John Cassian"
  also_known:  ["Cassian", "St. John Cassian", "Cassianus"]
  born:        c. 360
  died:        435
  feast_day:   "02-29"           // Orthodox calendar (Feb 28 in non-leap years per typical practice)
  feast_west:  "07-23"            // Catholic
  tradition:   "Founded the Abbey of Saint Victor in Marseilles; brought Egyptian desert monasticism to Gaul; lived in Bethlehem and Egypt before going West"
  see:         "Marseilles"
  ecumenical_role: "Foundational figure for both Western and Eastern monasticism; the Conferences are read in Orthodox monastic refectories to this day; Benedict's Rule explicitly recommends Cassian"
}

Person {
  id:          "person.sulpitius-severus"
  display:     "Sulpitius Severus"
  also_known:  ["Sulpicius", "Severus"]
  born:        c. 363
  died:        c. 425
  feast_day:   "01-29"           // varies
  tradition:   "Wealthy Gaulish nobleman; disciple of St. Martin of Tours; biographer; converted to asceticism"
  see:         "Aquitaine (Gaul)"
}
```

**Orthodox significance:**
- **Cassian** is **explicitly Orthodox-honored** — his Conferences are foundational reading in Orthodox monasteries. The Orthodox-tradition view sometimes treats him cautiously due to his "Semi-Pelagian" reception in the West (the Augustine vs. Cassian debate over grace), but the Eastern tradition does not view his soteriology as problematic.
- **Sulpitius's Life of Martin** influenced both Eastern and Western hagiographic genres; **St. Martin of Tours** is venerated in Orthodoxy (feast day Nov 11)

---

## 5. Bible-linking strategy

- Cassian's Conferences cite scripture extensively for ascetic-spiritual exegesis
- Each Conference is anchored to a topic, not a single Bible verse — but many open with a scriptural prompt:
  - Conference 1 (Abbot Moses): On the goal of the monk
  - Conference 9-10 (Abbot Isaac): On prayer (the **"Pure Prayer" teaching** — foundational for hesychasm; cross-link to later Philokalic tradition)
  - Conference 13 (Abbot Chaeremon): On Divine Protection / the Cassian-Augustine grace dispute
  - Conference 14 (Abbot Nesteros): On spiritual reading

**High-value cross-corpus links:**
- Cassian Conferences 9-10 (on prayer) ↔ Evagrius Ponticus (when acquired) ↔ Philokalia (future)
- Cassian Institutes (8 vices) ↔ Gregory the Great's seven deadly sins (in Phase 2 already)
- Cassian Conference 13 (grace) ↔ Augustine On Grace and Free Will (1510)

### Lectionary

- **Feb 29 (Cassian feast, Orthodox)** — every 4 years (leap year tradition)
- **Nov 11 (Martin of Tours)** — Sulpitius's Life of Martin
- **Lenten reading** — Cassian's Institutes on the 8 vices

---

## 6. Parser strategy

Standard parser. Cassian's Conferences chunked by sub-page (one per conference) with internal `<h2>` chapter markers.

---

## 7. Risks & caveats

- **Cassian's reception**: Western tradition labeled him "Semi-Pelagian" after the Synod of Orange (529); Orthodox tradition does not. The library should NOT flag him as heretical — Orthodox honors him.
- **Sulpitius's "Sacred History"**: chronology and historicity questionable in places (genre is closer to popular history than critical history)

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase2_20260520T223912.json`
- Sample files: `john-cassian/350801.html` (Conference 1 — Abbot Moses), `sulpitius-severus/3501.html` (Life of St. Martin)
