# Evagrius — Praktikos — Raw Content Integration Plan

**Status:** Planning document — Phase 2 Tier-3 supplementary acquisition (NOT from New Advent).

**Date inspected:** 2026-05-20
**Source:** evagriusponticus.net (Joel Kalvesmaki's parallel-text edition)
**Translation:** **Luke Dysinger, O.S.B.** (1990) — explicitly released to the public domain.

> Evagrius's *Praktikos* (100 chapters on ascetic practice) is **the foundational text of Christian ascetic theology** — the source of the "8 logismoi" tradition that became the West's "7 deadly sins" via Cassian and Gregory the Great. Evagrius shaped Christian spirituality across Greek, Syriac, and Latin traditions, and his work — through Cassian — became the bedrock of Western monastic asceticism.

---

## 1. Why this is a Tier-3 supplementary acquisition

Evagrius is a problematic figure:
- **Condemned at Constantinople II (553)** for certain Origenist propositions (pre-existence of souls, apokatastasis)
- **But his ascetic-practical writings (Praktikos, On Prayer) are universally accepted** in Orthodox monastic practice
- **Foundational source for John Cassian** (already in our corpus) — Cassian's "8 vices" come directly from Evagrius
- **Foundational source for the Philokalia** (not yet acquired) — Praktikos and On Prayer are core Philokalic texts

Without Evagrius's primary work, the library cannot serve:
- The theological genealogy of "the 7 deadly sins"
- Orthodox ascetic-monastic theology
- Hesychast preparation reading
- The foundations of John Cassian's *Institutes* and *Conferences*

The Praktikos is **short but enormously influential** — 100 chapters, each often just 1-3 sentences.

---

## 2. Location & Inventory

```
content/raw/fathers/evagrius-ponticus/
├── evagrius_praktikos_dysinger.html        # 574 KB — Multi-language parallel-text edition
└── provenance_evagrius-praktikos.json
```

| Field | Value |
|---|---|
| File | 1 XHTML parallel-text file |
| Size | ~574 KB |
| Format | TEI-based parallel text (Greek + 2 Syriac + English + Serbian) |
| Editor | Joel Kalvesmaki, evagriusponticus.net |

---

## 3. Translation & licensing

| Field | Value |
|---|---|
| **English translator** | Luke Dysinger, O.S.B. — Saint Andrew's Abbey, Valyermo, California |
| **Translation year** | 1990 |
| **Translation context** | "Monastic Spirituality Self-Study" — Dysinger's online ascetic-spiritual course |
| **Status** | **Public domain by translator's declaration** |
| **Source Greek** | Sources Chrétiennes No. 171 (Antoine & Claire Guillaumont, 1971); also PG 40 |
| **License caveat** | The Greek text by Guillaumonts (1971) is under Cerf copyright (a "Sources Chrétiennes" critical edition); but Cerf granted permission for non-apparatus dissemination of the Greek in 2014. The Dysinger English translation is independently PD. |
| **Quality** | Excellent — Dysinger is a respected scholar-monk; the translation is precise and accessible |

### What Kalvesmaki's edition contributes
The HTML file is a **parallel-text scholarly edition** by Joel Kalvesmaki (editor of evagriusponticus.net) using TAN (Text Alignment Network) markup. It presents four versions side-by-side:
- Greek (Guillaumont 1971 critical text)
- Syriac S1 (one ancient Syriac recension)
- Syriac S2 (another ancient Syriac recension)
- English (Dysinger 1990 — what we want)
- Serbian (Nešić 2023 — irrelevant for us)

Parser should extract only the Dysinger English (CSS class `.eng-dysinger`).

---

## 4. The 100 chapters

The Praktikos is divided into:

### 4.1 Prefatory Letter to Anatolius
Evagrius's dedication. Frames the work as ascetic-practical (not theological).

### 4.2 Chapters 1-14: Definitions
- Praktike vs. Gnostike (active life vs. contemplative life)
- The soul's tripartite nature (rational, incensive, appetitive — derived from Plato)
- The relationship of body, soul, and demons

### 4.3 Chapters 15-33: The 8 Generic Thoughts (Logismoi) — THE foundational text

This is **THE most influential section** — Evagrius's catalog of the 8 evil thoughts:

| Order | Logismos | English | Cassian's term |
|---|---|---|---|
| 1 | Γαστριμαργία | Gluttony | gula |
| 2 | Πορνεία | Fornication | luxuria |
| 3 | Φιλαργυρία | Avarice | avaritia |
| 4 | Λύπη | Sadness | tristitia |
| 5 | Ὀργή | Anger | ira |
| 6 | Ἀκηδία | Listlessness/Sloth | acedia |
| 7 | Κενοδοξία | Vainglory | vanagloria |
| 8 | Ὑπερηφανία | Pride | superbia |

Gregory the Great later **collapsed sadness (#4) into sloth/listlessness (#6)** and elevated pride (#8) to the root of all sins, producing the medieval Western list of **7 deadly sins**.

### 4.4 Chapters 34-53: The Remedies
- Fasting, vigils, hesychia (stillness), prayer, charity, scripture meditation
- The role of the cell
- Discernment of thoughts

### 4.5 Chapters 54-99: Spiritual Progress
- Discernment (diakrisis)
- Dispassion (apatheia)
- Spiritual contemplation (theoria)
- Mystical knowledge (gnosis)

### 4.6 Chapter 100: Conclusion + Benediction

---

## 5. Suggested Work record

```ts
Work {
  id: "work.evagrius-praktikos"
  display: "The Praktikos (On the Practical Life)"
  short_title: "Praktikos"
  work_type: "treatise"
  person_id: "person.evagrius-ponticus"
  written_circa: "AD 380-395"
  written_at: "Egyptian Desert (Kellia)"
  source_record_id: "source.dysinger-1990-evagrius-praktikos"
  total_chapters: 100
  prefatory_letter: true
  controversy_flag: "EVAGRIUS_PERSON_CONDEMNED_BUT_THIS_WORK_NOT_CONDEMNED"
  controversial_note: "Evagrius's person and certain other writings (Kephalaia Gnostika) were condemned at Constantinople II (553) for Origenist propositions. The Praktikos itself does NOT contain those condemned doctrines and is universally read in Orthodox monastic tradition as a valuable ascetic-spiritual text."
}
```

### Person record

```ts
Person {
  id:          "person.evagrius-ponticus"
  display:     "Evagrius Ponticus"
  also_known:  ["Evagrius of Pontus", "Evagrius the Solitary"]
  born:        "c. 345"
  died:        "399"
  feast_day:   null   // Not on Orthodox liturgical calendar due to 553 condemnation
  tradition:   "Christian monk and ascetic theologian; deacon under Gregory Nazianzen at Constantinople; later moved to the Egyptian desert (Kellia) where he became a central figure of the Egyptian monastic movement. Disciple of Macarius the Great and pupil of Origen-influenced theology. His ascetic writings (Praktikos, On Prayer) are foundational Orthodox monastic literature. His person and certain other writings (Kephalaia Gnostika, On Different Evil Thoughts in part) were condemned at the Second Council of Constantinople (553) for certain Origenist propositions about the pre-existence of souls and apokatastasis."
  condemnation_status: "person_condemned_553; ascetic_writings_universally_read"
  ecumenical_role: "Foundational ascetic theologian; source of the 'eight vices' tradition that became the West's 'seven deadly sins'; central influence on John Cassian, the Philokalia, the entire hesychast tradition, and (via Cassian) all Western monasticism."
}
```

---

## 6. Bible-linking strategy

The Praktikos cites scripture **sparingly but precisely**:

- **Genesis 3** (the Fall — origin of the 8 logismoi)
- **Matthew 4:1-11** (Christ's temptation — model for combatting logismoi)
- **Psalms** (especially 6, 31/32, 37/38, 50/51, 142/143 — the penitential psalms)
- **Romans 7-8** (the inner conflict; the Spirit's victory)
- **Galatians 5:19-23** (works of the flesh / fruits of the Spirit) — direct Evagrian parallel
- **1 Corinthians 9:25-27** (athletic discipline metaphor)
- **2 Corinthians 10:3-5** (spiritual warfare imagery)
- **Hebrews 12:1-4** (running the race)

Density is **moderate** — Evagrius is more analytical-systematic than exegetical.

### Lectionary linking
- **Lent** — Praktikos is traditional Lenten reading in Orthodox monasteries
- No specific feast day for Evagrius (due to 553 condemnation)
- Read in tandem with John Cassian Conferences during Lent

---

## 7. Cross-corpus links

- **John Cassian Institutes Books 5-12** (Phase 1, john-cassian/3507) — Cassian's "8 vices" section directly depends on Evagrius's Praktikos
- **Macarius the Egyptian Spiritual Homilies (Phase 2 Tier-2)** — Macarius and Evagrius were contemporaries in the Egyptian desert
- **Palladius Lausiac History** (Phase 2 Tier-3, Wallis Budge) — Palladius was Evagrius's disciple and dedicates substantial space to him
- **Apophthegmata Patrum** (Phase 2 Tier-3, Wallis Budge Vol 2) — Evagrius appears in the Sayings
- **Origen** (Phase 3, fathers/origen) — Evagrius is theologically Origenist; the condemnation links the two
- **Gregory the Great Moralia in Job** (not in corpus) — Gregory's transformation of Evagrius's 8 vices into the 7 deadly sins
- **Aquinas Summa Theologica II-II** (not in corpus) — Aquinas codifies the 7-deadly-sins schema; ultimate descendant of Evagrius
- **The Philokalia** (not yet acquired) — contains Praktikos and On Prayer

---

## 8. Parser strategy

### 8.1 Multi-language parallel text
The HTML file presents 4-5 columns of text per row. Parser must:
1. Identify the Dysinger English column (CSS class `.eng-dysinger`)
2. Extract ONLY that column's text
3. Discard Greek, Syriac, Serbian columns

### 8.2 Chapter detection
Each chapter is in a `<td>` element (table cell). Parser should match cells to chapter numbers by row position.

### 8.3 Prefatory letter
The prefatory letter to Anatolius is the first content section. Tag separately from the 100 chapters.

### 8.4 Editorial apparatus
Kalvesmaki's editorial notes (the TAN-based markup) is scholarly metadata. Drop it from the user-facing extraction; preserve in the provenance record.

---

## 9. Risks & caveats

### 9.1 Evagrius's condemnation
The library MUST disclose Evagrius's 553 condemnation alongside any Praktikos display. Standard editorial framing:

> ⚠️ St. Evagrius Ponticus's person and certain of his speculative writings (notably *Kephalaia Gnostika*) were condemned at the Second Council of Constantinople (553) for Origenist propositions about the pre-existence of souls. **The Praktikos itself does NOT contain those condemned doctrines** and is universally read in Orthodox monastic tradition as a valuable ascetic-spiritual text. The Philokalia includes both this work and On Prayer.

### 9.2 Greek text licensing
Joel Kalvesmaki's page includes Greek text under Cerf copyright (Guillaumonts 1971). The library should extract ONLY the Dysinger English column to avoid licensing issues with the Greek apparatus.

### 9.3 Multiple Evagrius works exist
This acquisition is only the **Praktikos** (CPG 2430). Evagrius's other works include:
- **On Prayer** (153 chapters) — equally foundational; PD English by Dysinger exists at evagriusponticus.net
- **Kephalaia Gnostika** — formally condemned at 553; primarily for scholars
- **Ad Monachos** — to monks
- **Ad Virginem** — to a virgin/nun
- **Antirrhetikos** — counter-arguments to the 8 logismoi (8 books, one per vice)
- **Eight Thoughts** — short summary

A future Phase-4 acquisition could add these. The Praktikos is the priority.

### 9.4 Translation quality
Dysinger is excellent. No quality concerns.

---

## 10. Appendix

- Source acquisition: `2026-05-20T19:59:00+00:00` via curl from evagriusponticus.net
- Primary URL: https://evagriusponticus.net/cpg2430/cpg2430-full-for-reading.html
- Corpus index: https://evagriusponticus.net/corpus.htm (catalog of all Evagrius works with their PD/copyright status)
- Greek source: Sources Chrétiennes 171, ed. Antoine & Claire Guillaumont (1971); PG 40
- Modern alternatives: Robert E. Sinkewicz, *Evagrius of Pontus: The Greek Ascetic Corpus* (OUP, 2003) — copyrighted; John Eudes Bamberger, *The Praktikos & Chapters on Prayer* (Cistercian, 1972) — copyrighted
