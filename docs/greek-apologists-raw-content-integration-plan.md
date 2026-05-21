# Greek Apologists Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 1–2** — Roberts/Donaldson/Coxe eds., 1885. Public domain.

> **Combined plan for the 2nd-century Greek Apologists** (excluding Justin Martyr and Clement of Alexandria, which have their own docs). Covers **Aristides, Athenagoras, Tatian, Theophilus of Antioch, and Minucius Felix** — 9 works total, all working in the 2nd century apologetic genre directed at pagan readers.

---

## 1. Inventory

### Aristides — `content/raw/fathers/aristides/`

| ID | Title | Notes |
|---|---|---|
| **1012** | The Apology | One of the earliest extant Christian apologies (c. 125); addressed to Emperor Hadrian; rediscovered in 1878 (Syriac), 1889 (Greek in Barlaam and Josaphat) |

### Athenagoras — `content/raw/fathers/athenagoras/`

| ID | Title | Notes |
|---|---|---|
| **0205** | A Plea for the Christians | Addressed to Marcus Aurelius (c. 177); defends against pagan accusations |
| **0206** | The Resurrection of the Dead | Classic patristic argument for bodily resurrection |

### Tatian — `content/raw/fathers/tatian/` (3 works, 58 HTML files — Diatessaron is large)

| ID | Title | Notes |
|---|---|---|
| **0202** | Address to the Greeks | Strident anti-Greek apologetic |
| **0203** | Fragments | |
| **1002** | The Diatessaron | **A harmony of the four Gospels into one continuous narrative** (~170 AD); used liturgically in the Syriac church for centuries; ~55 chapters |

**Note on Tatian:** Justin Martyr's pupil; later founded the *Encratite* sect (rigorist asceticism). His Diatessaron is a major textual-historical artifact.

### Theophilus of Antioch — `content/raw/fathers/theophilus/` (1 work, 4 HTML files)

| ID | Title | Notes |
|---|---|---|
| **0204** | Theophilus to Autolycus | **First extant use of the Greek term "Triad" (Τριάς) for the Godhead** (Book II); 3-book apologetic |

### Minucius Felix — `content/raw/fathers/minucius-felix/` (1 work, 1 HTML file)

| ID | Title | Notes |
|---|---|---|
| **0410** | Octavius | **Elegant Latin Christian apology** in the form of a dialogue between Caecilius (pagan) and Octavius (Christian); one of the most polished apologetic works of the era |

---

## 2. Person records

```ts
Person { id: "person.aristides-of-athens", display: "Aristides of Athens", born: ~early 2nd c., tradition: "Athenian philosopher-turned-Christian; addressed his Apology to Emperor Hadrian (c. 125)" }
Person { id: "person.athenagoras-of-athens", display: "Athenagoras of Athens", born: c. 133, died: c. 190, tradition: "Athenian philosopher and Christian apologist; converted while researching Christianity to refute it" }
Person { id: "person.tatian-the-syrian", display: "Tatian the Syrian", born: c. 120, died: c. 180, tradition: "Syrian-born; Justin Martyr's pupil in Rome; later returned East and founded the Encratite sect (rigorist asceticism); his Diatessaron Gospel harmony was used liturgically in Syriac Christianity", contested: true }
Person { id: "person.theophilus-of-antioch", display: "Theophilus of Antioch", born: ~mid-2nd c., died: c. 184, feast_day: "10-13", tradition: "Sixth bishop of Antioch; first to use Τριάς (Triad) for the Godhead", is_saint: true }
Person { id: "person.minucius-felix", display: "Minucius Felix", born: ~mid-2nd c., died: c. 250, tradition: "Roman lawyer; Christian apologist; wrote the elegant Octavius dialogue", is_saint: false }
```

---

## 3. Orthodox-tradition significance

- **The Greek Apologists collectively define the genre** of Christian engagement with Greek philosophical culture
- **Theophilus's Triad terminology** is the **first extant occurrence of "Trinity" in Greek**
- **Tatian's Diatessaron** is foundational for Syriac liturgical history (used for ~250 years before being replaced by the separate Gospels)
- **Aristides** is a touching window into very early Christian apology (only Justin is earlier)
- **Athenagoras** is the most philosophically sophisticated of the early apologists; his *Resurrection of the Dead* is a classic philosophical defense of bodily resurrection
- **Minucius Felix** demonstrates that high-quality Latin Christian apologetic existed alongside Tertullian's Carthaginian school

---

## 4. Bibliographic source

ANF Vol. 1 (Aristides, Athenagoras, Tatian) and Vol. 2 (Theophilus) and Vol. 4 (Minucius Felix). 1885.

---

## Appendix

- Sample files: `1012.html` (Aristides), `0205.html` (Athenagoras Plea), `1002.html` (Tatian Diatessaron index), `0204.html` (Theophilus to Autolycus), `0410.html` (Minucius Felix Octavius)
