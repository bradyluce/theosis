# Dionysius the Areopagite — Raw Content Integration Plan

**Status:** Planning document — Phase 2 Tier-2 supplementary acquisition (NOT from New Advent).

**Date inspected:** 2026-05-20
**Source:** archive.org DjVu OCR of Rev. John Parker 1897 (Part I) + 1899 (Part II)
**Translation:** **John Parker, M.A.** — *The Works of Dionysius the Areopagite*. James Parker & Co., London/Oxford. "Now first translated into English from the original Greek." Public domain.

> The Corpus Dionysiacum is the **single most influential mystical-theological corpus in the Christian tradition** — foundational for the entirety of Eastern Orthodox apophatic theology, hesychasm, and angelology, and a primary source for Maximus the Confessor, John of Damascus, Symeon the New Theologian, Gregory Palamas, the entire Philokalia tradition, and (in the West) Bonaventure, Thomas Aquinas, Meister Eckhart, John of the Cross, and modern mystical theology.

---

## 1. Why this is a Tier-2 supplementary acquisition

Dionysius is **not in NPNF or ANF** because the corpus was deemed pseudonymous (and its mystical orientation was outside Schaff's editorial vision). New Advent therefore does not have it.

This is a **major absence** in our patristic library. Without Dionysius, the library cannot serve:
- Orthodox apophatic theology (foundational text)
- Hesychasm/Philokalia tradition (key influence)
- Christian angelology (the 9-orders schema is from Dionysius)
- Orthodox liturgical/ecclesiological theology (Ecclesiastical Hierarchy)
- Christian mystical theology generally

Acquiring Parker's 1897/1899 PD translation closes this gap.

---

## 2. Location & Inventory

```
content/raw/fathers/dionysius-areopagite/
├── dionysius_part1_djvu.txt     # Parker 1897 — Divine Names + Mystic Theology + Letters (685 KB)
├── dionysius_part2_djvu.txt     # Parker 1899 — Heavenly Hierarchy + Ecclesiastical Hierarchy (317 KB)
└── provenance_dionysius-areopagite.json
```

**Note:** Part 1 djvu file (685 KB) appears to contain the bound complete works (both Parts I and II) of the 1897 collected edition. Part 2 djvu file is the standalone 1899 second-volume printing. Use Part 1 as the comprehensive source.

| Field | Value |
|---|---|
| Total files | 2 OCR text files |
| Total size | ~1.0 MB |
| Format | DjVu OCR plain text |
| Quality | Workable; standard archive.org OCR artifacts (page numbers inline, Greek transliteration garbled, occasional letter substitution) |

---

## 3. Authorship — Pseudo-Dionysius

| Tradition | Identification | Date | Status |
|---|---|---|---|
| **Original attribution** | Dionysius the Areopagite, converted by Paul (Acts 17:34) | 1st century | Traditional |
| **Orthodox tradition** | Continues to venerate as "St. Dionysius the Areopagite" | — | Mainstream |
| **Western Medieval scholarship** | Identified as Dionysius of Paris (St. Denys, 3rd-c. martyr) | 9th c.+ | Conflation |
| **Modern critical scholarship** | Anonymous Syrian/Egyptian author writing c. AD 500, pseudonymously | 6th c. | Scholarly consensus |

The corpus must be modeled as **Person.dionysius-the-areopagite** with:
- `attribution_status: "pseudonymous"`
- `traditional_attribution`: "Dionysius the Areopagite (Acts 17:34)"
- `scholarly_attribution`: "Anonymous, c. 500 (possibly a Syrian monk influenced by Proclus's Neoplatonism)"
- `orthodox_veneration: true`
- `feast_day: "10-03"` (October 3 — Orthodox feast of Dionysius the Areopagite)

The integration plan should NOT treat this as deception — pseudonymous attribution was a common ancient literary convention. Both traditional veneration AND scholarly identification can be presented together.

---

## 4. Works in the corpus

The corpus contains **four treatises** + **ten letters**:

### 4.1 The four treatises

| Work | Length | Topic | Key influence |
|---|---|---|---|
| **On the Divine Names** | longest (13 chapters) | The names of God in scripture and what each reveals about the divine nature | Foundational apophatic-cataphatic theology |
| **The Mystic Theology** | shortest (5 short chapters) | Apophatic approach to God; "unknowing knowledge" | The single most influential text of Christian mysticism |
| **The Heavenly Hierarchy (Celestial Hierarchy)** | 15 chapters | The 9 orders of angels | The Western/Eastern Christian angelology comes from this text |
| **The Ecclesiastical Hierarchy** | 7 chapters | The Church's hierarchy as icon of heavenly | Foundational Orthodox ecclesiology |

### 4.2 The ten letters

| Letter | Recipient | Brief topic |
|---|---|---|
| Letter 1 | Caius the Monk | On the unknowable God |
| Letter 2 | Caius the Monk | The transcendence of God |
| Letter 3 | Caius the Monk | On theology |
| Letter 4 | Caius the Monk | The divinity of Christ |
| Letter 5 | Dorotheus the Liturgist | The divine darkness |
| Letter 6 | Sosipater | On charity |
| Letter 7 | Polycarp | Astronomical phenomena at Christ's crucifixion (the legendary "Dionysius observed the solar eclipse at Athens" tradition) |
| Letter 8 | Demophilus | On monastic order |
| Letter 9 | Titus the Bishop | On symbolic theology |
| Letter 10 | John the Theologian (the Apostle, on Patmos) | The pseudonymous "Dionysius writes to John" — frames the corpus as 1st-century |

### 4.3 Lost works mentioned in the corpus
The Dionysian author references works that have not survived (or were never written, depending on interpretation):
- *Theological Outlines* (Theologikai Hypotyposeis)
- *Symbolic Theology* (Symbolike Theologia)
- *On the Soul*
- *On the Properties and Orders of the Angels*

Modern scholarship is divided on whether these are real lost works or fictional self-citations to bolster the pseudonymous authorship claim.

---

## 5. Translation & licensing

| Field | Value |
|---|---|
| **Translator** | Rev. John Parker, M.A. |
| **Years** | Part I: 1897. Part II: 1899. |
| **Publisher** | James Parker & Co. (Southampton-Street, Strand, London; Broad-Street, Oxford) |
| **Revision** | With "careful revision of the translation" by Miss M.C. Dawes, M.A. (acknowledged in Part I preface) |
| **Dedicatee** | "L'Abbé J. Fabre d'Envieu, Hon. Canon of St. Denis" (Part I); Edward Bouverie Pusey, Theologian of the Church of Britain (Part II) |
| **Status** | **U.S. public domain** — pre-1930 publication; copyright expired; not renewed |
| **Quality** | Parker's translation is the FIRST complete English Dionysius. It is somewhat Victorian in style but reasonably faithful. Modern translations (Colm Luibheid 1987, Paul Rorem 1993) are copyrighted. |

### Parker's editorial idiosyncrasies
- Parker firmly believed in the traditional 1st-c. Dionysius identification (his preface defends this), running counter to scholarly consensus already in 1897. Note this when surfacing his prefatory material.
- He uses "Hierarchies" capitalized throughout
- He preserves many Greek terms in transliteration

---

## 6. Person record

```ts
Person {
  id:          "person.dionysius-the-areopagite"
  display:     "Dionysius the Areopagite"
  also_known:  ["Pseudo-Dionysius", "St. Dionysius", "St. Denys", "Dionysius Areopagita", "Dionysios"]
  born:        // unknown; traditionally Athens, 1st century; scholarly c. 5th c.
  died:        // unknown; scholarly c. 530
  feast_day:   "10-03"   // Orthodox commemoration of Dionysius the Areopagite (Acts 17:34)
  feast_west:  "10-09"   // Catholic commemoration (St. Denys, October 9)
  tradition:   "Greek-language Christian mystical theologian whose corpus (the Corpus Dionysiacum) is foundational for Christian apophatic theology. Traditionally identified with the Dionysius converted by Paul at the Areopagus (Acts 17:34); modern scholarship dates the corpus to c. 500 and identifies the author as anonymous."
  attribution_status: "pseudonymous_traditionally_venerated"
  ecumenical_role: "Single most influential mystical-theological author in the Christian tradition; primary source for Maximus the Confessor, John of Damascus, Symeon the New Theologian, Gregory Palamas, the entire Orthodox hesychast and Philokalia tradition, and (in the West) Aquinas, Bonaventure, Meister Eckhart, John of the Cross."
}
```

---

## 7. Bible-linking strategy

Dionysius's Bible-linking density is **moderate** — he is more a synthetic theologian than an exegete. Key passages:

- **Acts 17:34** (the Areopagus conversion) — autobiographical-pseudonymous frame
- **Exodus 19-20** (Sinai theophany) — Mystic Theology heavy use of this
- **Exodus 24:15-18** (Moses in the cloud) — central image for apophatic theology
- **1 Kings 19:11-13** (Elijah at Horeb) — "still small voice"
- **Isaiah 6:2-3** (Seraphim "Holy, Holy, Holy") — central for Celestial Hierarchy
- **Daniel 7:9-10** (the Ancient of Days + multitude of angels) — angelological text
- **Genesis 18** (the Trinity at Mamre) — frequently cited as theophany
- **Ezekiel 1, 10** (the Cherubim) — angelological texts
- **Matthew 5:8** ("Blessed are the pure in heart") — central mystical theology

### Lectionary linking
- **October 3** — Dionysius's feast (Orthodox)
- **October 9** — St. Denys feast (Catholic; conflated identification)
- **Sundays in Lent** — Mystic Theology and Divine Names heavily used in hesychast Lenten preparation

---

## 8. Cross-corpus links

- **Maximus the Confessor** (not yet acquired — Phase 3 target): wrote extensive commentaries (*Scholia*) on Dionysius — direct dependency
- **John of Damascus *Exposition of the Orthodox Faith*** (Phase 1, 3304): heavily influenced by Dionysius
- **Gregory Nazianzen** (Phase 1, 3101-3103): some of Dionysius's apophatic vocabulary echoes Gregory; he cites Gregory as "the great theologian"
- **The Cappadocians generally** (Basil, Gregory of Nyssa, Gregory Nazianzen): Dionysius synthesizes their apophatic-cataphatic framework
- **Symeon the New Theologian, Gregory Palamas** (not yet acquired): the hesychast tradition draws from Dionysius
- **Aquinas *Summa Theologica* I.q.13** (on divine names): Aquinas's most-cited source is Dionysius
- **Meister Eckhart sermons** (not yet acquired): direct dependence

---

## 9. Parser strategy

### 9.1 OCR text preprocessing

- Strip archive.org footer markers
- Remove inline page numbers (e.g., "PREFACE TO THE 'DIVINE NAMES.' xi")
- Reconstruct paragraphs broken across pages
- Detect and tag Greek transliterations (Parker preserves them inline)

### 9.2 Work boundary detection

Each major work is preceded by a "PREFACE TO [TITLE]" header (Parker's editorial introduction) followed by the translated text:
- "PREFACE TO THE 'DIVINE NAMES.'"
- "PREFACE TO MYSTIC THEOLOGY"
- "PREFACE TO THE LETTERS"
- "PREFACE TO LITURGY"

For Part 2:
- "DIONYSIUS THE AREOPAGITE AND THE ALEXANDRINE SCHOOL"
- "ON THE HEAVENLY HIERARCHY"
- "ON THE ECCLESIASTICAL HIERARCHY"

These string anchors define the work boundaries.

### 9.3 Chapter/Section markers

Within each work, Parker uses Roman-numeral chapter divisions. The pattern varies:
- Sometimes "CAP. I." (Latin capitulum)
- Sometimes "CHAPTER I."
- Sometimes "SECTION I."

Parser should accept all three patterns and normalize to chapter numbers.

### 9.4 Letters

The 10 letters are short and self-contained. Each is introduced with the recipient name.

---

## 10. Risks & caveats

### 10.1 Pseudonymity disclosure
The library should display Dionysius works with both:
- **Traditional attribution** ("St. Dionysius the Areopagite") for liturgical/devotional use
- **Scholarly clarification** ("Modern scholarship dates this corpus to c. 500 and identifies the author as anonymous; the traditional 1st-c. attribution is now understood as pseudonymous, a common ancient literary convention.")

### 10.2 Parker's Victorian style
Parker's English is somewhat dated. Some terms feel archaic. The library may want to surface a "Modern English" alternative recommendation (Luibheid 1987, copyrighted) for readers wanting contemporary clarity.

### 10.3 LXX vs MT versification
Dionysius cites the LXX. Standard pattern; use LXX psalm numbering.

### 10.4 Bible citation density
Lower than other Fathers — Dionysius is more synthetic-theological than exegetical. Don't expect head-verse-per-chapter density.

### 10.5 Greek font in OCR
Parker preserves Greek terms in original Greek script. OCR has garbled most of these. The integration plan should either:
- Drop garbled Greek and note "[Greek term]"
- OR cross-reference against a modern Dionysius Greek text to restore

### 10.6 Part 1 file completeness
Need to verify whether `dionysius_part1_djvu.txt` contains the full corpus (both Parts) or just Part I. The CONTENTS at line 7873 lists Part II's contents, suggesting the file may contain both parts. The Part 2 file is a backup.

---

## 11. Appendix

- Source acquisition: `2026-05-20T19:43:00+00:00` via curl from archive.org
- Primary URL Part 1: https://archive.org/download/theworksofdionys00dionuoft/theworksofdionys00dionuoft_djvu.txt
- Primary URL Part 2: https://archive.org/download/worksofdionysius02pseu/worksofdionysius02pseu_djvu.txt
- Alternative HTML: https://sacred-texts.com/chr/dio/ (Sacred Texts Archive, clean HTML)
- Modern alternative: Colm Luibheid, *Pseudo-Dionysius: The Complete Works* (Paulist Press, Classics of Western Spirituality, 1987) — copyrighted
- Greek source: PG 3 (Migne)
