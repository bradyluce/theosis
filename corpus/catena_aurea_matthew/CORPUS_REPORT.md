# Catena Aurea on Matthew — Corpus Acquisition Report

**Date:** 2026-05-19  
**Status:** Phase 1–3 Complete — Raw Archive Ready  
**Next phase:** Normalization + verse-linking pipeline

---

## 1. Source Summary

The Catena Aurea on Matthew is a verse-by-verse chain commentary compiled by Thomas Aquinas (c. 1264), drawing on commentary from roughly 80 Greek and Latin Church Fathers. It is the ideal first corpus for Theosis because it is already organized around Scripture — every passage is anchored to a specific verse or verse group — and brings together many Fathers at once.

The translation used is the 1842 Oxford/London edition (Parker/Rivington), translated by John Henry Parker, which is fully in the public domain.

**Primary source selected: CCEL (Christian Classics Ethereal Library)**  
URL: https://www.ccel.org/ccel/aquinas/catena1/

CCEL was chosen over two alternative sources (eCatholic2000, isidore.co) because it offers the cleanest verse-level structure with consistent machine-parseable separators.

---

## 2. Source URLs — All 28 Chapters

| Chapter | URL |
|---------|-----|
| 1  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.i.html |
| 2  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.ii.html |
| 3  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.iii.html |
| 4  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.iv.html |
| 5  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.v.html |
| 6  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.vi.html |
| 7  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.vii.html |
| 8  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.viii.html |
| 9  | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.ix.html |
| 10 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.x.html |
| 11 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xi.html |
| 12 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xii.html |
| 13 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xiii.html |
| 14 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xiv.html |
| 15 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xv.html |
| 16 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xvi.html |
| 17 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xvii.html |
| 18 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xviii.html |
| 19 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xix.html |
| 20 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xx.html |
| 21 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxi.html |
| 22 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxii.html |
| 23 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxiii.html |
| 24 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxiv.html |
| 25 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxv.html |
| 26 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxvi.html |
| 27 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxvii.html |
| 28 | https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.xxviii.html |

URL pattern: `catena1.ii.{roman_numeral}.html` (i through xxviii)

---

## 3. HTML Structure Patterns

Each chapter page follows this structure after the navigation header:

```
## Chapter N          ← chapter heading (some chapters use nav-table format instead)

{print_page_number}   ← standalone integer line from 1842 print edition — MUST STRIP

N. "Verse text..."    ← verse number + verse text (sometimes multiple verses grouped)
N. "Next verse..."    ← before the --- separator

---                   ← section divider: marks end of verse text, start of commentary

Author_Name[, Work_ref[, Book.Chapter.Verse]]: Commentary text paragraph.

Author_Name[, Work_ref]: Another commentary paragraph.

[ed. note: Editorial footnote from 1842 Oxford editors — optional to strip]

---                   ← next section begins (next verse or verse group)

N. "Next verse text..."

---

...commentary...
```

### Author Attribution Format (actual examples)

```
Jerome: text
Chrys., Hom. 4: text
Aug., de Serm. Dom. in Mont. i. 1: text
Pseudo-Chrys.: text
Remig.: text
Gloss. interlin.: text
Ambrose, in Luc. c. v. 20: text
Bede, Beda in loc.: text
Greg., Moral., iv, 1: text
Chrysol., Serm. 75: text
Leo, Epist. 59, ad Const.: text
Hilary: text
Rabanus: text
```

Pattern: `Name[, abbreviated_work[, citation]]: text`

The name field ends at the first colon. Everything before the colon is the author+source citation. Everything after is commentary text.

### Verse Section Structure

- Each `---` line separates a verse section from the commentary below it, OR separates consecutive verse sections.
- Verse text lines begin with `N. ` where N is the verse number.
- Multiple consecutive verse lines before a `---` means they share a single commentary block (the Catena sometimes groups 2–3 closely related verses).
- After the `---`, each paragraph is a separate author entry.

---

## 4. Recommended Parsing Approach

### Step 1 — Strip noise
Remove:
- Provenance header lines starting with `#`
- Navigation table lines (`| [« Prev]...`)
- Standalone integer-only lines (print page numbers)
- CCEL UI boilerplate at top (`## Contents`, `loading…`, theme/font controls)

### Step 2 — Split into verse sections
Split on `\n---\n`. Each block contains either:
- Verse text lines (`N. text`) — mark as `verse_block`
- Commentary paragraphs — mark as `commentary_block`

A `verse_block` is always immediately followed by a `commentary_block`.

### Step 3 — Parse verse references
From the verse_block, extract verse numbers:
- Pattern: `^(\d+)\.\s+(.+)$` (one verse per line)
- Multiple verses in one block → commentary applies to all of them
- Map to `Matt N:V` reference

### Step 4 — Parse author attributions
For each commentary paragraph:
- Split on first `:` to get `[attribution, text]`
- From attribution, extract author name (everything before first `,` or `:`)
- Remaining after first `,` = source citation (work, book, chapter)
- Normalize author names to canonical form (see author map below)

### Step 5 — Handle edge cases
- Lines with no author attribution (no `Name:` pattern) are continuation text of the previous author
- `[ed. note: ...]` blocks can be stripped or kept as metadata
- Bible cross-references `[[Book N:N](url)]` → keep ref text, strip URL

---

## 5. Recommended Normalized JSON Schema

One JSON file per chapter: `normalized/matthew_ch{NN}.json`

```json
{
  "source": "catena_aurea",
  "book": "Matthew",
  "chapter": 5,
  "compiler": "Thomas Aquinas",
  "translation": "Parker/Rivington 1842",
  "source_url": "https://www.ccel.org/ccel/aquinas/catena1/catena1.ii.v.html",
  "sections": [
    {
      "verses": [3],
      "verse_text": "Blessed are the poor in spirit: for theirs is the kingdom of heaven.",
      "verse_ref": "Matt 5:3",
      "commentaries": [
        {
          "author_key": "pseudo_chrysostom",
          "author_display": "Pseudo-Chrysostom",
          "source_citation": "Hom. in Matt., Hom. i",
          "text": "Every man in his own trade or profession..."
        },
        {
          "author_key": "augustine",
          "author_display": "Augustine",
          "source_citation": "de Serm. Dom. in Mont. i. 1",
          "text": "Augmentation of spirit generally implies..."
        }
      ]
    }
  ]
}
```

For the app's verse-lookup query, an additional flat index file should be produced:

```json
{
  "Matt 5:3": [
    { "corpus": "catena_aurea", "section_ref": "matthew_ch05#section_3" }
  ]
}
```

---

## 6. Risks and Edge Cases

| Risk | Severity | Notes |
|------|----------|-------|
| Print page numbers in text | Medium | Standalone integer lines — easy to strip by pattern `^\d+$` |
| Multiple verses per section | Low | Intentional in source. Commentary genuinely covers the group. Map to all verses in range. |
| Continuation paragraphs (no author) | Medium | ~5–10% of paragraphs lack a `Name:` prefix. Treat as continuation of previous author or flag for review. |
| Author abbreviation inconsistency | Medium | "Aug." vs "Augustine" vs "Aug". Need a normalization map (~20 entries). |
| Editorial footnotes `[ed. note: ...]` | Low | Can be stripped cleanly with regex `\[ed\. note[^\]]*\]` |
| Chapter 1 different verse format | Low | Ch1 uses `[Ver. N.](url)` with hyperlinks rather than bare `N.` format. Handled in extraction. |
| Chapter 15 malformed heading | Low | Source HTML has `## Chapter 15<.h2>` — entity artifact. Handled by parser. |
| Chapter 28 smaller than others | Low | Matthew 28 is a short chapter (20 verses); smaller file is expected. |
| Bible cross-reference links | Low | `[[Book N:N](ccel_url)]` — strip URL, keep ref text with regex. |
| CCEL website availability | Medium | Raw archive is now preserved locally. Parser should run on local files only. |

---

## 7. Files Downloaded

**Location:** `corpus/catena_aurea_matthew/raw/`

| File | Size |
|------|------|
| chapter_01.txt | 108,465 bytes |
| chapter_02.txt | 70,819 bytes |
| chapter_03.txt | 61,501 bytes |
| chapter_04.txt | 63,779 bytes |
| chapter_05.txt | 115,935 bytes |
| chapter_06.txt | 115,661 bytes |
| chapter_07.txt | 76,106 bytes |
| chapter_08.txt | 78,386 bytes |
| chapter_09.txt | 70,557 bytes |
| chapter_10.txt | 94,513 bytes |
| chapter_11.txt | 64,436 bytes |
| chapter_12.txt | 110,151 bytes |
| chapter_13.txt | 98,981 bytes |
| chapter_14.txt | 58,016 bytes |
| chapter_15.txt | 57,914 bytes |
| chapter_16.txt | 59,552 bytes |
| chapter_17.txt | 52,425 bytes |
| chapter_18.txt | 63,601 bytes |
| chapter_19.txt | 67,669 bytes |
| chapter_20.txt | 56,914 bytes |
| chapter_21.txt | 81,533 bytes |
| chapter_22.txt | 68,045 bytes |
| chapter_23.txt | 72,078 bytes |
| chapter_24.txt | 104,574 bytes |
| chapter_25.txt | 72,264 bytes |
| chapter_26.txt | 113,930 bytes |
| chapter_27.txt | 98,440 bytes |
| chapter_28.txt | 8,632 bytes |

**Total: 2,164,877 bytes (2.1 MB) — all 28 chapters — 498 verse sections**

---

## 8. Folder Structure Created

```
corpus/
  catena_aurea_matthew/
    manifest.json           ← full metadata, URL map, structure notes
    CORPUS_REPORT.md        ← this document
    raw/
      chapter_01.txt        ← provenance header + raw CCEL text
      chapter_02.txt
      ...
      chapter_28.txt
    normalized/             ← empty, ready for next phase
```

Each raw file begins with provenance lines:
```
# SOURCE: CCEL — Catena Aurea on Matthew, Chapter N
# URL: https://...
# Retrieved: 2026-05-19
# Translation: Parker/Rivington, London, 1842
# Raw archive — not yet normalized
```

---

## 9. Recommended Next Step

**Build the normalization parser** — one focused Python script that:

1. Reads each `raw/chapter_NN.txt`
2. Strips noise (page numbers, nav boilerplate, ed. notes)
3. Splits on `---` into verse sections
4. Extracts verse numbers and verse text
5. Parses each commentary paragraph into `{author, citation, text}`
6. Normalizes author names against a canonical map
7. Writes `normalized/matthew_ch{NN}.json`
8. Produces a flat `verse_index.json` mapping `Matt N:V → [section refs]`

Start by running it on Chapter 5 (Matthew 5, the Sermon on the Mount) — it has the richest verse-by-verse structure (36 sections), is the most familiar passage, and will immediately prove whether the pipeline works end-to-end.

Once Chapter 5 normalization looks correct, run all 28 chapters in batch.

After normalization is verified, the verse_index can be consumed directly by the app's Bible reader to display commentary when a verse is opened.

---

*Report generated: 2026-05-19*  
*Source: CCEL — https://www.ccel.org/ccel/aquinas/catena1/*
