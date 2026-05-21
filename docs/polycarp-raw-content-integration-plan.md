# Polycarp of Smyrna Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 1** — Roberts/Donaldson/Coxe eds., 1885. Public domain.

> **Polycarp of Smyrna (c. 69–155)** — disciple of John the Apostle, bishop of Smyrna, martyred. With Ignatius of Antioch, the **most direct link between the Apostles and the post-apostolic Church**. Teacher of Irenaeus (see the *Letter to Florinus* in Irenaeus 0134 Fragment 2).

---

## 1. Inventory

**Location:** `content/raw/fathers/polycarp/`

- 2 works, 2 HTML files, ~88 KB

| ID | Title | Significance |
|---|---|---|
| **0102** | The Martyrdom of Polycarp | **The earliest extant detailed Christian martyrdom narrative** — the "model" for the genre. Records his prayer at the stake, his refusal to deny Christ at age 86, his miraculous endurance of the flames |
| **0136** | Epistle to the Philippians | **Polycarp's only surviving letter**; written to the church at Philippi shortly after Ignatius's martyrdom; encloses copies of Ignatius's letters (the reason we have them) |

---

## 2. HTML structure

Standard ANF shell. Both works are single-file with `<h2>Chapter N. Title</h2>` chunking (like Ignatius's epistles).

---

## 3. Person record

```ts
Person {
  id:          "person.polycarp-of-smyrna"
  display:     "Polycarp of Smyrna"
  also_known:  ["St. Polycarp"]
  born:        c. 69
  died:        c. 155   // martyred Feb 23
  feast_day:   "02-23"
  tradition:   "Bishop of Smyrna; disciple of John the Apostle (alongside Ignatius); teacher of Irenaeus; martyred c. 155 — earliest extant detailed Christian martyrdom"
  see:         "Smyrna (Asia Minor)"
  is_saint:    true
  is_martyr:   true
  apostolic:   true   // Apostolic Father — direct disciple of an Apostle
}
```

**Orthodox significance:**
- **Direct disciple of John the Apostle** (along with Ignatius)
- **Apostolic Father** — the second cornerstone (with Ignatius) of the link between the Apostles and the 2nd-century Church
- **Teacher of Irenaeus** — the John → Polycarp → Irenaeus apostolic chain is the most-cited apostolic-succession narrative in the early Church
- **The Martyrdom of Polycarp (0102)** is the **prototype of the Christian martyrdom genre** — explicitly modeled on the Passion of Christ
- Feast day **February 23**

---

## 4. Cross-corpus links

- **Polycarp 0102 (Martyrdom)** ↔ **Irenaeus 0134 Fragment 2** (Letter to Florinus, where Irenaeus describes his discipleship under Polycarp)
- **Polycarp 0136 (Epistle to Philippians)** ↔ **Ignatius 0104–0110** (Polycarp's letter encloses Ignatius's letters)
- **Polycarp 0110 (Epistle of Ignatius to Polycarp)** — Ignatius wrote to Polycarp en route to martyrdom; tight pair with the Martyrdom of Polycarp

---

## 5. Bibliographic source

ANF Vol. 1 (1885).

---

## Appendix

- Sample files: `0102.html` (Martyrdom), `0136.html` (Epistle to Philippians)
