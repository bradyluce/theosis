# Justin Martyr Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 1** — Roberts/Donaldson/Coxe eds., 1885. Public domain. **Translators:** Marcus Dods, George Reith.

> **Justin Martyr (c. 100–165)** — the most important 2nd-century Christian apologist. Born in Samaria of Greek-pagan parents, converted after a long philosophical search, taught publicly in Rome, martyred under Marcus Aurelius. **First Christian thinker to engage seriously with Greek philosophy.**

---

## 1. Inventory

**Location:** `content/raw/fathers/justin-martyr/`

- 9 works, 18 HTML files, ~1.1 MB

| ID | Title | Sub-pages | Significance |
|---|---|---|---|
| **0126** | First Apology | small | Addressed to Antoninus Pius; defends Christianity, describes baptism and Eucharist (chs. 61–67); **earliest detailed description of the Christian liturgy** |
| **0127** | Second Apology | 0 | Shorter follow-up |
| **0128** | Dialogue with Trypho | **several** sub-pages | **Foundational Christian-Jewish dialogue**; argues Christ from OT prophecy; preserves Jewish-Christian discourse of mid-2nd century |
| **0129** | Hortatory Address to the Greeks | 0 | Apologetic |
| **0130** | On the Sole Government of God | 0 | Apologetic |
| **0131** | Fragments on the Resurrection | 0 | |
| **0132** | Miscellaneous Fragments | 0 | |
| **0133** | Martyrdom of Justin and Others | 0 | Hagiography — Justin's own martyrdom |
| **0135** | Discourse to the Greeks | 0 | Brief apologetic |

---

## 2. HTML structure

Standard New Advent shell, ANF Vol. 1 citation footer. `<h2>Chapter N. Title</h2>` chunking.

**Dialogue with Trypho (0128)** uses sub-pages — chunks the long dialogue into manageable books.

---

## 3. Person record

```ts
Person {
  id:          "person.justin-martyr"
  display:     "Justin Martyr"
  also_known:  ["St. Justin", "Justin Philosopher", "Justin the Martyr"]
  born:        c. 100   // in Samaria (Flavia Neapolis = modern Nablus)
  died:        c. 165   // martyred in Rome under Marcus Aurelius
  feast_day:   "06-01"  // Orthodox calendar: June 1
  feast_west:  "06-01"  // Catholic same date
  tradition:   "First major Christian apologist; converted from Greek philosophy after long search; taught publicly in Rome; martyred c. 165"
  see:         "Born Samaria; taught in Rome"
  ecumenical_role: "First Christian thinker to engage seriously with Greek philosophy; doctrine of the Logos spermatikos (seminal Word) — God's reason scattered as seeds among all peoples"
  is_saint:    true
}
```

**Orthodox significance:**
- **Saint and Martyr** — venerated June 1
- **First Christian apologist of stature** — paved the way for Athenagoras, Theophilus, and the wider apologetic tradition
- **First Apology chapters 61–67** are the **earliest detailed external description of Christian baptism and Eucharist** — invaluable for liturgical history
- His **Logos spermatikos** doctrine (Christ as the universal Logos whose "seeds" appear even in pagan philosophy) — provides theological grounding for Christian engagement with non-Christian wisdom

---

## 4. Bible-linking strategy

- **Dialogue with Trypho** is constructed around OT prophetic texts read Christologically (Isaiah, Psalms, Genesis)
- Heavy `stiki` density in Dialogue (Justin walks Trypho through dozens of OT prophecies)
- The two Apologies cite OT and NT but lighter density (philosophical-rhetorical, not exegetical)

---

## 5. Bibliographic source

ANF Vol. 1 (1885). Marcus Dods and George Reith translators.

---

## Appendix

- Sample files: `0126.html` (First Apology), `0128.html` (Dialogue with Trypho index)
