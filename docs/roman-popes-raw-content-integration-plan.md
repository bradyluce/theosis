# Leo the Great & Gregory the Great — Raw Content Integration Plan

**Status:** Planning document — combined doc for the two **"Great" Roman popes** in the patristic canon.

**Date inspected:** 2026-05-20
**Source:** `https://www.newadvent.org/fathers/`
**Translations:** **NPNF Series II, Vol. 12** (Leo, 1895) and **Vol. 12-13** (Gregory the Great, 1895/1898). Public domain.

> Leo the Great (440–461) and Gregory the Great (590–604) are the **two patristic-era popes** with major surviving doctrinal/pastoral corpora. Both bear the epithet "Great" (Magnus) — a designation reserved in the West for only these two popes plus Nicholas I. Both are Doctors of the Church and venerated in Orthodoxy.

---

## 1. Location & Inventory

| Folder | Pope | Works | HTML | Notes |
|---|---|---|---|---|
| `fathers/leo-great/` | Leo I | 2 | 123 | Massive sermon and letter collection |
| `fathers/gregory-great/` | Gregory I | 2 | 426 | Includes 420-sub-page Register of Letters |
| **TOTAL** | **2 popes** | **4 works** | **549 files** | **~7.3 MB** |

---

## 2. Works

### Leo the Great (NPNF II Vol. 12, 1895; translators C.L. Feltoe, primary)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **3603** | Sermons | homily | **48 sermons** | Liturgical sermons across the church year (Christmas, Epiphany, Lent, Pascha, Pentecost) |
| **3604** | Letters | letter | **75 letters** | Includes the famous **Tome of Leo** (Letter 28 to Flavian, 449) read at Chalcedon |

### Gregory the Great (NPNF II Vol. 12-13, 1895/1898; translators J. Barmby, primary)

| ID | Title | Type | Sub-pages | Notes |
|---|---|---|---|---|
| **3601** | **Pastoral Rule** (Regula Pastoralis) | treatise | 4 books | **THE foundational Western pastoral theology text** — required reading for medieval bishops |
| **3602** | **Register of Letters** (Registrum Epistolarum) | letter | **420 sub-pages** across 14 books (sub-page IDs `360201NNN`–`360214NNN`, with gaps) | The largest letter collection in patristic literature; **5-digit suffix pattern requires regex extension** (now fixed) |

---

## 3. HTML structure

Standard New Advent shell with key variations:

### Leo's Sermons (3603NN)
- 6-digit sub-page IDs (2-digit suffixes)
- Each sermon has `<h1>Sermon N</h1>` and short heading then numbered paragraphs
- Sermons are short (often 1-3 pages) and liturgically anchored

### Leo's Letters (3604NN)
- 6-digit sub-page IDs
- Some letters extremely important (Letter 28 = the Tome of Leo, foundational for Chalcedonian Christology)

### Gregory's Register of Letters (3602NN NNN)
- **9-digit sub-page IDs** — the longest in the library
- Format: `3602` + book number (01-14) + letter number (001-NNN, zero-padded)
- 420 letters across 14 books, with NPNF gaps
- **Regex extension required**: the downloader regex was widened from `[a-z\d]{1,3}` to `[a-z\d]{1,5}` to capture these

### Gregory's Pastoral Rule (3601N)
- Standard 5-digit sub-page IDs (1-digit suffix) for the 4 books

### Citation footers
- Leo: NPNF II Vol. 12 (1895)
- Gregory's Pastoral Rule: NPNF II Vol. 12 (1895)
- Gregory's Register: NPNF II Vol. 13 (1898) — same volume as Ephraim Syrian (different translator)

---

## 4. Person records

```ts
Person {
  id:          "person.leo-the-great"
  display:     "Leo the Great"
  also_known:  ["Pope Leo I", "Leo Magnus", "St. Leo"]
  born:        c. 400
  died:        461
  feast_day:   "02-18"           // Orthodox calendar
  feast_west:  "11-10"           // Catholic
  tradition:   "Pope (440-461); Doctor of the Church; defender of orthodox Christology at Chalcedon (his Tome was the doctrinal centerpiece); turned Attila the Hun away from Rome"
  see:         "Rome"
  ecumenical_role: "Author of the Tome of Leo (449) — fundamental text for Chalcedon's Definition; key figure in the 5th-century Christological settlement"
}

Person {
  id:          "person.gregory-the-great"
  display:     "Gregory the Great"
  also_known:  ["Pope Gregory I", "Gregorius Magnus", "St. Gregory the Dialogist (in Orthodox tradition)"]
  born:        c. 540
  died:        604
  feast_day:   "03-12"           // Orthodox calendar
  feast_west:  "09-03"           // Catholic
  tradition:   "Pope (590-604); Doctor of the Church; reformer of the Roman liturgy; sender of the Augustine of Canterbury mission to England; bridge to medieval Christianity"
  see:         "Rome"
  ecumenical_role: "Foundational figure for medieval Western Christianity; the Liturgy of the Presanctified Gifts (used in Orthodox Great Lent) is traditionally attributed to him (hence 'Dialogist' epithet)"
}
```

**Orthodox significance:**
- **Both popes are venerated as saints in Orthodoxy**
- **Leo's Tome** (Letter 28, in 3604) is foundational to Chalcedonian Christology — accepted by Orthodoxy as a doctrinal touchstone (with caveats about reception)
- **Gregory the Great** is called **"St. Gregory the Dialogist"** in Orthodox tradition (after his *Dialogues* on Italian saints, which became major Eastern reading via Greek translation)
- The **Liturgy of the Presanctified Gifts** (used on Lenten weekdays in Orthodox practice) is **traditionally attributed to Gregory** — though modern scholarship attributes its composition to Eastern compilers using Roman elements

---

## 5. Bible-linking strategy

- Leo's Sermons are tightly liturgically anchored — most have a clear Gospel/Epistle reading; could potentially extract head-verses though the pattern is less explicit than Chrysostom's
- Gregory's Pastoral Rule cites scripture constantly for pastoral application
- Gregory's Register of Letters has lower density (administrative letters)

### Lectionary linking — major opportunity

**Leo's Sermons map directly to the Western liturgical calendar:**
- Christmas (Sermons 21-30)
- Epiphany (Sermons 31-38)
- Lent (Sermons 39-50)
- Holy Week / Pascha (Sermons 51-70)
- Pentecost (Sermons 71-81)
- Saints' feasts (Sermons 82+)

Since the Orthodox liturgical year shares many of these feasts, **Leo's Sermons can be surfaced sequentially through the church year** — similar to Cyril of Jerusalem's catechetical sequence.

**Feast days:**
- Leo: **Feb 18 (Orthodox), Nov 10 (Catholic)**
- Gregory: **Mar 12 (Orthodox), Sep 3 (Catholic)**

---

## 6. Parser strategy

- **Critical:** the regex extension `[a-z\d]{1,5}` is needed for Gregory's Register (already in place).
- 420 Register letters with gaps require iterating provenance subpages literally
- Leo's Sermons: each sub-page is a self-contained sermon; standard chunking

---

## 7. Risks & caveats

- **Pope Honorius condemned in Constantinople III (680)** — included by name; the integration should note that not all Roman popes are venerated (Honorius was anathematized for monothelitism)
- **Gregory's reception in the East**: the Orthodox tradition reveres him but distinguishes between his liturgical/spiritual contributions and his administrative views on papal jurisdiction
- **Pope Vigilius's role at Constantinople II (553)** — relevant historical context for the Three Chapters controversy

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase2_20260520T223912.json` (initial) + `acquisition_log_phase2_20260520T225410.json` (post-regex-fix Gregory Register re-download)
- Sample files: `leo-great/360328.html` (likely Leo's Tome — Letter 28 in 3604NN scheme), `gregory-great/3601.html` (Pastoral Rule index), `gregory-great/360201001.html` (Gregory Register Book 1 Letter 1)
