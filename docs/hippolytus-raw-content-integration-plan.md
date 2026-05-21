# Hippolytus of Rome Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 5** — Roberts/Donaldson/Coxe eds., 1886. Public domain. **Translator: J.H. MacMahon.**

> **Hippolytus of Rome (c. 170–235)** — the most important Greek-writing theologian in Rome in the early 3rd century. Anti-pope, then reconciled with the Church before his martyrdom (exile to Sardinian mines under Maximinus Thrax). His work **Refutation of All Heresies** is a major source for early Gnostic systems.

---

## 1. Inventory

**Location:** `content/raw/fathers/hippolytus/`

- 9 works, 17 HTML files, ~1.5 MB

| ID | Title | Sub-pages | Significance |
|---|---|---|---|
| **0501** | The Refutation of All Heresies | **10 books** (~5 sub-pages on New Advent) | **Major catalog of early Gnostic systems**; preserves much of their teachings as quotations |
| **0502** | Exegetical Fragments | 0 | Fragments of his biblical commentaries |
| **0503** | Expository Treatise Against the Jews | 0 | Anti-Jewish polemic (controversial today; for scholarly use) |
| **0504** | The End of the World | 0 | Pseudonymous eschatological work |
| **0516** | The Antichrist | 0 | Hippolytus's classic on the Antichrist — early Christian eschatology |
| **0520** | Against Plato on the Cause of the Universe | 0 | Philosophical theology |
| **0521** | Against the Heresy of Noetus | 0 | Anti-modalist Trinitarian text |
| **0523** | Discourse on the Holy Theophany | 0 | Homily on Theophany (Baptism of Christ) |
| **0524** | The Apostles and the Disciples | 0 | Pseudonymous list-text |

### Notable absence

**The Apostolic Tradition** — Hippolytus's most theologically significant work today (a 3rd-century church order describing the Eucharist, baptism, and ordination). Critical for liturgical history. **NOT on New Advent.** Phase-2 acquisition essential — sources: Cuming, Bradshaw/Johnson/Phillips, Stewart-Sykes.

---

## 2. HTML structure

Standard ANF shell. Refutation of All Heresies (0501) has 10 books historically; New Advent's index has multiple sub-pages.

---

## 3. Person record

```ts
Person {
  id:          "person.hippolytus-of-rome"
  display:     "Hippolytus of Rome"
  also_known:  ["St. Hippolytus", "Hippolytus Romanus"]
  born:        c. 170
  died:        235
  feast_day:   "01-30"   // Orthodox: January 30 (martyrdom); also other dates regionally
  feast_west:  "08-13"
  tradition:   "Greek-writing presbyter of Rome; theological opponent of Popes Zephyrinus and Callistus; anti-pope (the first); reconciled and martyred together with Pope Pontian in the Sardinian mines"
  see:         "Rome (writing in Greek)"
  is_saint:    true
  is_martyr:   true
  ecumenical_role: "Major source for early Gnostic systems via the Refutation; early Trinitarian theologian (subordinationist); the only Roman writer of his era who wrote in Greek"
}
```

---

## 4. Bibliographic source

ANF Vol. 5 (1886). J.H. MacMahon translator.

---

## Appendix

- Sample file: `0501.html` (Refutation of All Heresies index)
