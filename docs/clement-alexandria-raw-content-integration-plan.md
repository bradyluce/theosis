# Clement of Alexandria Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 2** — Roberts/Donaldson/Coxe eds., 1885. Public domain.

> **Clement of Alexandria (c. 150–215)** — first head of the Catechetical School of Alexandria; teacher of Origen. Major contributor to the **Alexandrian theological tradition** of integrating Greek philosophy with Christian theology. **Venerated in the Orthodox East** but **removed from the Roman Martyrology in 1748** due to doubts about his theology (he was less rigorous on certain points and influenced by Stoicism).

---

## 1. Inventory

**Location:** `content/raw/fathers/clement-alexandria/`

- 5 works, 28 HTML files, ~3.0 MB

| ID | Title | Sub-pages | Significance |
|---|---|---|---|
| **0207** | Who Is the Rich Man That Shall Be Saved? | 0 | Famous exegetical homily on Mark 10:17–31 (the rich young ruler); allegorical reading of wealth |
| **0208** | Exhortation to the Heathen (Protrepticus) | 0 (large single-file) | First part of Clement's trilogy; calls pagans to Christ |
| **0209** | The Instructor (Paedagogus) | **3 books** | Second part of the trilogy; Christ as teacher of the Christian moral life; covers diet, dress, conduct, marriage |
| **0210** | The Stromata or Miscellanies | **~7 books** (many sub-pages) | **Clement's masterwork**; ~3000 pages of theological miscellany; engages Greek philosophy; doctrine of the *gnostikos* (true Christian gnostic) |
| **0211** | Fragments | 0 | |

---

## 2. HTML structure

Standard ANF shell. Multi-book works (Paedagogus, Stromata) have line-broken anchor lists in their index pages.

---

## 3. Person record

```ts
Person {
  id:          "person.clement-of-alexandria"
  display:     "Clement of Alexandria"
  also_known:  ["Titus Flavius Clemens", "Clemens Alexandrinus"]
  born:        c. 150
  died:        c. 215
  feast_day:   "11-23"   // Orthodox calendar: November 23 (some lists); also Dec 4 in some Eastern traditions
  tradition:   "First major teacher at the Catechetical School of Alexandria; teacher of Origen; integrated Greek philosophy with Christian theology"
  see:         "Alexandria"
  ecumenical_role: "Founded the Alexandrian theological tradition of philosophical Christian theology; teacher of Origen; integrated Stoicism, Platonism, and Christian revelation"
  contested:   "Removed from the Roman Martyrology in 1748 by Pope Benedict XIV; remains venerated in the Eastern Orthodox tradition. His theology is influential but not always rigorously orthodox."
  is_saint:    true   // in Orthodox tradition
}
```

---

## 4. Bibliographic source

ANF Vol. 2 (1885). Various translators.

---

## Appendix

- Sample files: `0207.html` (Rich Man), `02101.html` (Stromata Book I)
