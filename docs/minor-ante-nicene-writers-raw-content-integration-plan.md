# Minor Ante-Nicene Writers Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vols. 5–7** — Roberts/Donaldson/Coxe eds., 1886. Public domain.

> **Combined plan for ~20 lesser Ante-Nicene authors.** Each has only 1–3 works; their individual significance is moderate-to-niche, but together they fill in the picture of 2nd–4th century pre-Nicene Christian writing. Includes the **Latin-pre-Tertullian** writers, **secondary Greek-Eastern** writers, and **Syriac** writers.

---

## 1. Inventory

### Western Latin (4 corpora, ~9 works)

| Corpus | Works | Notable |
|---|---|---|
| **Novatian** (`fathers/novatian/`) | 2 (0511, 0512) | **0511 Treatise Concerning the Trinity** — first major Latin Trinitarian work, predating Tertullian's *Against Praxeas* in some aspects |
| **Victorinus of Pettau** (`fathers/victorinus/`) | 2 (0711, 0712) | First Latin biblical commentator; **Commentary on the Apocalypse** is the earliest extant Latin Revelation commentary |
| **Commodianus** (`fathers/commodianus/`) | 1 (0411 Writings) | Early Latin Christian poet (3rd c.); rough Latin verse |
| **Arnobius** (`fathers/arnobius/`) | 1 (0631 Against the Heathen, 8 books) | Constantinian-era apologetic; Lactantius's teacher; 752 KB across 8 sub-pages |
| **Venantius** (`fathers/venantius/`) | 1 (0709 Poem on Easter) | Brief Latin Easter poem |
| **Caius** (`fathers/caius/`) | 1 (0510 Fragments) | Anti-Montanist fragments preserved by Eusebius |
| **Dionysius of Rome** (`fathers/dionysius-rome/`) | 1 (0713 Against the Sabellians) | Brief anti-Sabellian doctrinal letter |
| **Malchion** (`fathers/malchion/`) | 1 (0617 Epistle) | Anti-Paul-of-Samosata letter (3rd c.) |

### Eastern Greek (5 corpora, ~13 works)

| Corpus | Works | Notable |
|---|---|---|
| **Archelaus** (`fathers/archelaus/`) | 2 (0616 Acts of Disputation with Manes, 0618 Of the Manichaeans) | Anti-Manichaean disputations |
| **Dionysius the Great** (`fathers/dionysius-great/`) | 3 (0612 Fragments, 0613 Exegetical Fragments, 0632 Epistles) | Bishop of Alexandria (mid-3rd c.); Origen's successor; Eusebius's main 3rd-c. source |
| **Peter of Alexandria** (`fathers/peter-alexandria/`) | 3 (0619 Genuine Acts, 0620 Canonical Epistle, 0621 Fragments) | Bishop and martyr (d. 311); Canonical Epistle on lapsed Christians |
| **Julius Africanus** (`fathers/julius-africanus/`) | 1 (0614 Extant Writings) | Early Christian chronographer; his *Chronographiae* set up the Christian-era dating system |
| **Pamphilus** (`fathers/pamphilus/`) | 1 (0615 Exposition on the Acts of the Apostles) | Caesarea librarian; Eusebius's teacher and namesake (Eusebius "of Pamphilus") |
| **Theodotus** (`fathers/theodotus/`) | 1 (0802 Excerpts) | Excerpts ascribed to a Valentinian Gnostic — preserved by Clement of Alexandria for refutation |

### Syriac (2 corpora, ~5 works)

| Corpus | Works | Notable |
|---|---|---|
| **Bardesanes** (`fathers/bardesanes/`) | 1 (0862 Book of the Laws of Various Countries) | **Earliest extant Syriac Christian-philosophical text**; argues against astrological determinism using ethnographic survey |
| **Mar Jacob** (`fathers/mar-jacob/`) | 4 (0851 Canticle on Edessa, 0860 Habib the Martyr, 0861 Guria and Shamuna, 0859 History of Armenia) | Syriac homilist Jacob of Sarug; **0859 History of Armenia** is actually by **Moses of Chorene** (a stand-alone Armenian historian) — folder misattribution |

---

## 2. Person records

Each author gets a Person record. Key examples:

```ts
Person { id: "person.novatian", display: "Novatian", born: ~3rd c., tradition: "Roman presbyter; first Latin Trinitarian theologian; later schismatic (rigorist on lapsed Christians); founder of the Novatianist sect", is_saint: false, contested: true }

Person { id: "person.dionysius-of-alexandria", display: "Dionysius the Great", died: 264, feast_day: "10-05", tradition: "Bishop of Alexandria (248-264); Origen's successor at the Catechetical School", is_saint: true }

Person { id: "person.peter-of-alexandria", display: "Peter of Alexandria", died: 311, feast_day: "11-25", tradition: "Bishop of Alexandria; martyred under Maximinus Daia; his Canonical Epistle on lapsed Christians is foundational for early penitential discipline", is_saint: true, is_martyr: true }

Person { id: "person.bardaisan", display: "Bardesanes (Bardaisan)", died: 222, tradition: "Earliest extant Syriac Christian-philosophical writer; later regarded as heterodox", contested: true }

Person { id: "person.mar-jacob-of-sarug", display: "Mar Jacob of Sarug", died: 521, feast_day: "10-29", tradition: "Major Syriac homilist ('Doctor of the Holy Spirit'); composed over 700 metrical homilies", is_saint: true }
```

---

## 3. Orthodox-tradition value

Most of these authors are **niche but historically important**:

- **Novatian's Trinitarian treatise** is a critical pre-Nicene Latin theological text
- **Victorinus's Apocalypse commentary** is the earliest extant Latin Revelation interpretation
- **Dionysius the Great** is Origen's most important successor and the chief source for 3rd-c. Alexandrian theology (preserved via Eusebius)
- **Peter of Alexandria's Canonical Epistle** shaped early penitential discipline
- **Julius Africanus's chronological work** influenced all subsequent Christian historiography
- **Mar Jacob of Sarug** is one of the most important Syriac liturgical poets after Ephraim
- **Bardesanes** is a window into very early Syriac Christianity (with its own theological cast, later condemned)

---

## 4. Schema notes

- Each minor corpus gets its own Person + Work records (one or two of each)
- Lesser-known figures (Caius, Malchion, etc.) can be `notability: "minor"` or similar
- Contested figures (Novatian, Bardesanes, Tatian) need authenticity / orthodoxy flags
- The Mar Jacob folder has a misattribution: **0859 History of Armenia** is by Moses of Chorene, not Mar Jacob. The integration should create a separate `person.moses-of-chorene` record and re-attribute 0859.

---

## 5. Bibliographic source

ANF Vols. 5, 6, and 7 (1886). Various translators.

---

## Appendix

- All sample files in `content/raw/fathers/{folder}/`
