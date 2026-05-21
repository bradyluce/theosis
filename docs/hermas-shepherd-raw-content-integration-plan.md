# The Shepherd of Hermas Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 2** — Roberts/Donaldson/Coxe eds., 1885. Public domain.

> **The Shepherd of Hermas (c. 95–150)** — a major early Christian apocalyptic / visionary text. **Some early canon lists (Muratorian Fragment, Codex Sinaiticus) included it among the New Testament writings**, though it was eventually excluded. Treated as Scripture by Irenaeus, Origen, and Clement of Alexandria. Modern scholars regard it as the most-read non-canonical Christian text of the early Church.

---

## 1. Inventory

**Location:** `content/raw/fathers/hermas/`

- 1 work, 4 HTML files (1 index + 3 books), ~304 KB

| ID | Title | Sub-pages | Notes |
|---|---|---|---|
| **0201** | The Pastor (The Shepherd) | **3 books** | Three sections: Visions (5), Mandates/Commandments (12), Similitudes/Parables (10) |

### The three books

1. **Visions (Book 1)** — Five visions of an aged woman (the Church) and the angelic Shepherd
2. **Mandates/Commandments (Book 2)** — 12 moral commandments delivered by the Shepherd
3. **Similitudes/Parables (Book 3)** — 10 extended allegorical parables (the willow, the elm and the vine, the building of the tower, etc.)

---

## 2. HTML structure

Standard ANF shell. The Shepherd index links to 3 sub-pages (one per book). Each book has internal sub-chapters/sections.

---

## 3. Person record

```ts
Person {
  id:          "person.hermas"
  display:     "Hermas"
  also_known:  ["Hermes"]
  born:        ~1st c.
  died:        ~mid-2nd c.
  feast_day:   null   // Not commonly venerated though he is St. Hermas in some traditions (May 9)
  tradition:   "Author of the Shepherd; possibly a freed slave at Rome; possibly the brother of Pope Pius I (per Muratorian Fragment); the text's prophetic-apocalyptic style is unique in early Christian literature"
  see:         "Rome"
  ecumenical_role: "Author of the most-read non-canonical Christian text in the early Church; included in some early canon lists (Muratorian, Sinaiticus)"
}
```

**Orthodox-tradition status:** The Shepherd is **not canonical** but is the **most-quoted non-canonical text in the early Church**. Irenaeus quotes it as "Scripture"; Origen treats it as inspired. The Muratorian Canon (c. 180) excludes it from public reading but allows private use. **Useful for understanding the texture of 2nd-century Christian piety.**

---

## 4. Bibliographic source

ANF Vol. 2 (1885).

---

## Appendix

- Sample file: `0201.html` (index)
