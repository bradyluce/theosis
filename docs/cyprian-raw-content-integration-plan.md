# Cyprian of Carthage Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 5** — Roberts/Donaldson/Coxe eds., 1886. Public domain. **Translator: Robert Ernest Wallis.**

> **Cyprian of Carthage (c. 200–258)** — bishop of Carthage, martyr under Valerian (258). Foundational figure in **Latin ecclesiology**. Famous for the principle *extra ecclesiam nulla salus* ("outside the Church there is no salvation"). Major Letters collection (81 letters survive).

---

## 1. Inventory

**Location:** `content/raw/fathers/cyprian/`

- 4 works, 100 HTML files, ~2.9 MB

| ID | Title | Sub-pages | Significance |
|---|---|---|---|
| **0505** | The Life and Passion of Cyprian | 0 | Hagiography by Pontius the Deacon |
| **0506** | The Epistles of Cyprian | **~81 letters** | **Major early Latin letter collection**; covers persecution, lapsed Christians, episcopal authority, baptism controversies |
| **0507** | The Treatises of Cyprian | **~12 treatises** | **De Unitate Ecclesiae** (On the Unity of the Church), On the Lord's Prayer, On the Lapsed, On Mortality, To Demetrian, On Works and Alms, On the Advantage of Patience, On Jealousy and Envy, etc. |
| **0508** | The Seventh Council of Carthage | 0 | The 256 council under Cyprian on rebaptism of heretics — historical document |

---

## 2. HTML structure

Standard ANF shell. The Letters and Treatises are extensively sub-paged.

---

## 3. Person record

```ts
Person {
  id:          "person.cyprian-of-carthage"
  display:     "Cyprian of Carthage"
  also_known:  ["St. Cyprian", "Cyprianus Carthaginiensis", "Caecilius Cyprianus"]
  born:        c. 200
  died:        258   // martyred Sept 14, 258
  feast_day:   "08-31"   // Orthodox: August 31 (some traditions Oct 12)
  feast_west:  "09-16"
  tradition:   "Bishop of Carthage (248-258); martyred under Valerian; foundational figure in Latin Christian ecclesiology; close correspondent of Pope Cornelius and Pope Stephen"
  see:         "Carthage (North Africa)"
  ecumenical_role: "Articulated the principle 'extra ecclesiam nulla salus'; defended the unity of the Church against schism; engaged in the rebaptism controversy with Rome"
  is_saint:    true
  is_martyr:   true
}
```

**Orthodox significance:**
- Major Western Father of the Ante-Nicene era
- His **De Unitate Ecclesiae** is foundational for both Catholic and Orthodox ecclesiology
- The **rebaptism controversy** (whether heretics' baptisms are valid) — Cyprian held no; Rome held yes; Augustine later sided with Rome but praised Cyprian
- **The Letters preserve invaluable historical detail** about the mid-3rd-century Church during the Decian persecution

---

## 4. Bibliographic source

ANF Vol. 5 (1886). Robert Ernest Wallis translator.

---

## Appendix

- Sample files: `0506.html` (Epistles index), `0507.html` (Treatises index)
