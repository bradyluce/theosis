# Origen Raw Content — Integration Plan

**Status:** Planning document.

**Date inspected:** 2026-05-20
**Source:** New Advent
**Translations:** **ANF Vol. 4 and Vol. 9-10** — Roberts/Donaldson/Coxe eds., 1885. Public domain. **Translator: Frederick Crombie** (most works).

> **Origen of Alexandria (c. 184–c. 253)** is the most influential and most controversial Greek Christian thinker of the 3rd century. His works profoundly shaped both Greek (Cappadocians, Athanasius) and Latin (Jerome, Rufinus, Ambrose) theology. **The Second Council of Constantinople (553) condemned certain Origenist propositions** (pre-existence of souls, apocatastasis); his person and writings remain contested.

---

## 1. Inventory

**Location:** `content/raw/fathers/origen/`

- 8 works, 34 HTML files, ~4.3 MB

### Works

| ID | Title | Sub-pages | Significance |
|---|---|---|---|
| **0412** | De Principiis (On First Principles) | **4 books** (04121–04124) | **Foundational systematic theology**; treats God, Christ, creation, free will, Scripture |
| **0416** | Against Celsus (Contra Celsum) | **8 books** (04161–04168) | **Major apologetic work**; refutes the pagan philosopher Celsus; preserves much of Celsus's lost True Discourse |
| **1015** | Commentary on the Gospel of John | **~10 books** | Verse-by-verse commentary on John (the most theologically dense Gospel) |
| **1016** | Commentary on the Gospel of Matthew | **~10 books** | Verse-by-verse commentary on Matthew |
| **0413** | Africanus to Origen | 0 | Letter from Julius Africanus questioning the canonicity of Susanna |
| **0414** | Origen to Africanus | 0 | Origen's reply defending Susanna |
| **0415** | Origen to Gregory | 0 | Letter to Gregory Thaumaturgus on Christian use of Greek learning |
| **1014** | Letter of Origen to Gregory | 0 | (Possibly duplicate of 0415; check provenance) |

### Notable absences

The Origen corpus on New Advent is **highly incomplete**:
- **Homilies on Genesis** (16), **Exodus** (13), **Leviticus** (16), **Numbers** (28), **Joshua** (26), **Judges** (9), **Samuel** (5), **Psalms** (~150), **Song of Songs** (2)
- **Commentary on Romans**
- **Commentary on the Song of Songs**
- **Exhortation to Martyrdom**
- **On Prayer** (one of his most important spiritual works)
- **Hexapla** (his 6-column Bible — fragmentary in any case)
- **Philocalia** (anthology of Origen by Basil and Gregory Nazianzen — partially preserved)

Phase-2 acquisition recommendations:
- *Origen: An Exhortation to Martyrdom, Prayer, First Principles: Book IV, Prologue to the Commentary on the Song of Songs, Homily XXVII on Numbers* (Rowan Greer, Paulist Press, 1979)
- *Origen: Commentary on the Gospel According to John* (Ronald Heine, FOC series)
- *Origen: Homilies on Genesis and Exodus* (Heine)

---

## 2. HTML structure

Standard New Advent shell. Multi-book works use:
- Index page with line-broken `<a href="04161.htm">BOOK I</a><br>...` anchors
- Each book sub-page has `<h2>Chapter N</h2>` chunking with bare paragraphs

Source: ANF Vol. 4 (De Principiis, Letters) and Vol. 9 (Commentary on John, Matthew) and Vol. 10 (some commentaries). Crombie is the primary translator.

---

## 3. Person record

```ts
Person {
  id:          "person.origen"
  display:     "Origen of Alexandria"
  also_known:  ["Origenes Adamantius", "Origen the Adamantine"]
  born:        c. 184
  died:        c. 253
  feast_day:   null   // NOT canonized; condemned at Constantinople II (553)
  tradition:   "The most influential and most controversial Greek Christian thinker of the 3rd century; head of the Catechetical School of Alexandria, later Caesarea (Palestine); shaped both Greek and Latin theology; some of his speculative views condemned posthumously"
  see:         "Alexandria, then Caesarea (Palestine)"
  ecumenical_role: "Foundational figure in patristic biblical exegesis (allegorical method) and systematic theology; suffered under the Decian persecution (250); died of injuries c. 253"
  contested:   true
  condemned_by: ["Constantinople II (553)"]   // certain propositions, not the man wholesale
  authorship_note: "Origen's speculative views (pre-existence of souls, apocatastasis = universal restoration) were condemned at Constantinople II. His exegetical and apologetic works remain widely studied; the broader patristic tradition (Cappadocians, Jerome) drew deeply from him while distancing themselves from contested positions."
}
```

---

## 4. Bible-linking strategy

- **Commentary on John and Matthew** — these ARE verse-by-verse Bible commentary works. The head-verse pattern may be extractable (commentary opens with a quoted verse). Worth a parser pass to detect.
- **Against Celsus** is densely scriptural in arguing against Celsus's anti-Christian polemic
- **De Principiis** has a famous Book IV on the inspiration of Scripture and biblical interpretation
- Inline `stiki` density: very high (Origen practically writes by stitching Scripture together)

---

## 5. Orthodox-tradition significance

- **Not venerated as a saint** in the Orthodox or Catholic Church due to the Constantinople II condemnations
- **Profoundly influential** despite contested status — the Cappadocians (Basil, Gregory of Nyssa, Gregory Nazianzen) compiled the *Philocalia* anthology of Origen and consciously built on his theology
- **Allegorical method** of biblical interpretation — became the Alexandrian school standard
- His **martyrdom theology** and **biblical commitment** are universally honored even by those who reject his speculative positions

---

## 6. Bibliographic source

ANF Vol. 4 (De Principiis, Letters, Against Celsus partial) and Vols. 9–10 (commentaries). Crombie primary translator. 1885.

---

## Appendix

- Acquisition log: `content/raw/_index/acquisition_log_phase3_20260520T225233.json`
- Sample files: `0416.html` (Contra Celsum index), `04161.html` (Contra Celsum Book I), `0412.html` (De Principiis index)
