# Gregory Thaumaturgus Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 6** — Roberts/Donaldson/Coxe eds., 1886. Public domain.

> **Gregory Thaumaturgus ("the Wonder-Worker", c. 213–270)** — bishop of Neocaesarea; disciple of Origen at Caesarea Palestine; renowned for miracles. His **Oration of Panegyric to Origen** is one of the most charming pieces of late-antique autobiographical writing.

---

## 1. Inventory

**Location:** `content/raw/fathers/gregory-thaumaturgus/`

- 11 works, 15 HTML files, ~520 KB

| ID | Title | Significance |
|---|---|---|
| **0601** | A Declaration of Faith | Early Trinitarian creed |
| **0602** | A Metaphrase of the Book of Ecclesiastes | Paraphrase of Ecclesiastes |
| **0603** | Canonical Epistle | Penitential canons for survivors of barbarian raids |
| **0604** | Oration and Panegyric Addressed to Origen | **Major work** — autobiographical farewell to his teacher Origen; testifies to early-Christian education |
| **0605** | A Sectional Confession of Faith | Trinitarian |
| **0606** | On the Trinity | |
| **0607** | Twelve Topics on the Faith | Creedal |
| **0608** | On the Subject of the Soul | |
| **0609** | Four Homilies | |
| **0610** | On All the Saints | |
| **0611** | On Matthew 6:22-23 | Brief exegesis ("the lamp of the body is the eye") |

---

## 2. Person record

```ts
Person {
  id:          "person.gregory-thaumaturgus"
  display:     "Gregory Thaumaturgus"
  also_known:  ["Gregory the Wonder-Worker", "Gregory of Neocaesarea"]
  born:        c. 213
  died:        c. 270
  feast_day:   "11-17"   // Orthodox calendar: November 17
  tradition:   "Bishop of Neocaesarea (Pontus); disciple of Origen at Caesarea Palestine; renowned for miracles ('wonder-worker'); evangelized a largely pagan region"
  is_saint:    true
  ecumenical_role: "Connects Origen's school with Cappadocian theology (taught by Gregory's grandmother Macrina the Elder); early Trinitarian formulator"
}
```

**Orthodox significance:**
- **November 17** feast day
- **Direct discipleship under Origen** — the *Panegyric to Origen* (0604) gives an inside view of Origen's pedagogy at Caesarea
- **Connection to the Cappadocians** — Macrina the Elder (grandmother of Basil and Gregory of Nyssa) had received Gregory's faith
- His **Declaration of Faith** is an early Trinitarian creed predating Nicaea by decades

---

## 3. Bibliographic source

ANF Vol. 6 (1886).
