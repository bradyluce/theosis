# Apostolic Fathers Completion Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 1** — Roberts/Donaldson/Coxe eds., 1885. Public domain.

> **Combined integration plan for the remaining Apostolic Fathers** beyond Ignatius (already documented), Polycarp, and Hermas (each with their own docs). This file covers **Clement of Rome (5 works), Barnabas (1), Mathetes (1), and Papias (1)** — 8 works total, all in ANF Vol. 1.

---

## 1. Inventory

### Clement of Rome — `content/raw/fathers/clement-rome/`

5 works, 37 HTML files, ~2.1 MB

| ID | Title | Sub-pages | Authenticity |
|---|---|---|---|
| **1010** | First Epistle to the Corinthians | (substantial) | **Authentic** — written c. 96 by Clement of Rome (4th bishop of Rome) to the Corinthian church on factionalism; **earliest extant non-canonical Christian text outside the NT** alongside the Didache and Ignatius |
| **1011** | Second Epistle to the Corinthians | small | **SPURIOUS** — actually an anonymous 2nd-c. homily, not by Clement |
| **0803** | Two Epistles Concerning Virginity | | **SPURIOUS** |
| **0804** | Recognitions (Pseudo-Clementine) | many sub-pages | **SPURIOUS** — 4th-c. Jewish-Christian novel; major textual artifact |
| **0808** | Clementine Homilies | many sub-pages | **SPURIOUS** — 4th-c. Jewish-Christian novel, parallel to Recognitions |

**Schema flag:** `is_authentic: true` for 1010; `is_authentic: false` for 1011, 0803, 0804, 0808.

### Barnabas — `content/raw/fathers/barnabas/`

1 work, 1 HTML file, ~88 KB

| ID | Title | Notes |
|---|---|---|
| **0124** | Epistle of Barnabas | Anonymous early-2nd-c. work; ascribed to the Apostle Barnabas in antiquity but pseudonymous; included in Codex Sinaiticus alongside the Shepherd of Hermas |

### Mathetes — `content/raw/fathers/mathetes/`

1 work, 1 HTML file, ~44 KB

| ID | Title | Notes |
|---|---|---|
| **0101** | Epistle to Diognetus | **"Mathetes"** = "a disciple"; pseudonymous. **One of the most elegant early Christian apologies**; famous chapters 5–6 on Christians as "the soul of the world" |

### Papias — `content/raw/fathers/papias/`

1 work, 1 HTML file, ~28 KB

| ID | Title | Notes |
|---|---|---|
| **0125** | Fragments of Papias | All that survives of Papias's 5-book *Exposition of the Sayings of the Lord* (lost); preserves crucial early traditions about Mark and Matthew Gospel composition |

---

## 2. Combined Person records

```ts
Person {
  id:          "person.clement-of-rome"
  display:     "Clement of Rome"
  born:        ~1st c. AD
  died:        c. 100   // tradition holds martyrdom under Trajan
  feast_day:   "11-23"   // Orthodox: November 23 (some Nov 24); Catholic Nov 23
  tradition:   "Fourth bishop of Rome (after Peter, Linus, Anacletus per tradition); author of the First Epistle to the Corinthians (~96 AD); apostolic father"
  apostolic:   true
  is_saint:    true
}

Person {
  id:          "person.pseudo-barnabas"
  display:     "Pseudo-Barnabas"
  display_alt: "Author of the Epistle of Barnabas"
  born:        ~early 2nd c.
  tradition:   "Anonymous early-2nd-c. Christian author whose Epistle was ascribed to the Apostle Barnabas in antiquity but is now considered pseudonymous. Highly typological, anti-Jewish polemical."
  is_authentic_barnabas: false
}

Person {
  id:          "person.mathetes"
  display:     "Mathetes ('the Disciple')"
  tradition:   "Anonymous 2nd-c. Christian author of the Epistle to Diognetus; one of the most elegant early Christian apologies"
}

Person {
  id:          "person.papias-of-hierapolis"
  display:     "Papias of Hierapolis"
  born:        ~late 1st c.
  died:        c. 130
  feast_day:   "02-22"
  tradition:   "Bishop of Hierapolis (Phrygia); said by Irenaeus to have been a hearer of John (the Apostle?); author of the lost five-book Exposition of the Sayings of the Lord"
  is_saint:    true   // venerated as a saint
}
```

---

## 3. Orthodox-tradition significance

- **Clement of Rome's First Epistle (1010)** is one of the **earliest extant Christian writings outside the NT** (~96 AD). It was read publicly in some early churches. The 2nd-c. Bishop Dionysius of Corinth says it was still being read in his time.
- **Epistle of Barnabas** — included in Codex Sinaiticus alongside the Shepherd of Hermas (suggesting some early churches valued it as Scripture)
- **Epistle to Diognetus (Mathetes)** — Chapter 5 "Christians in the world": *"They dwell in their own countries, but simply as sojourners... every foreign land is to them a fatherland, and every fatherland a foreign land"* — one of the most cited early Christian texts on Christian identity
- **Papias's Fragments** preserve the famous tradition that Mark was Peter's interpreter and wrote down Peter's preaching — foundational for synoptic-gospel scholarship

---

## 4. Bibliographic source

ANF Vol. 1 (1885) for all works. Various translators.

---

## 5. Cross-corpus links

- **Clement of Rome 1010 (1 Cor)** ↔ **NT 1 Corinthians** — both addressed to the same factionalized Corinthian church
- **Mathetes 0101** ↔ **Justin Martyr 0126-0128** — early apologetic genre cluster
- **Papias 0125** ↔ **Gospel of Mark, Gospel of Matthew** — Papias's fragments are key witnesses to Gospel-composition tradition
- **Barnabas 0124** ↔ **Hebrews** — both heavily typological readings of the OT
- All of these → **Ignatius (0104-0123) + Polycarp (0102, 0136) + Hermas (0201)** — together form the complete Apostolic Fathers corpus in the library

---

## Appendix

- Sample files: `1010.html` (Clement 1 Cor), `0124.html` (Barnabas), `0101.html` (Diognetus), `0125.html` (Papias Fragments)
