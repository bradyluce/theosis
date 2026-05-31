# Theosis Content-QA Report — iOS Submission Readiness

**Scope:** 38,856 files / 766,984 rendered fields scanned deterministically, then re-read by per-domain agents and spot-verified against the normalized files on disk. The reader renders every field RAW (no HTML/entity/markdown interpretation), so any leaked tag, entity, footer, page number, or footnote marker is a *visible* on-screen defect.

---

## 1. Bottom line

**Conditionally shippable.** The actual prose is sound — no domain agent found pervasive mistranslation, OCR-shredded bodies, or missing books in the core surfaces. The defects are almost entirely **mechanical pipeline residue** (markup/footers/entities that leaked through ingest) and are concentrated in a handful of identifiable source pipelines. None corrupt meaning at scale, but several are *highly visible* and one is a **licensing exposure**, so they should be fixed before App Review.

**Must-fix blockers before submission (all verified on disk):**

1. **WEB New Testament broken contractions** — `Don’ t`, `don’ t` (apostrophe + stray space) in **235 files across the entire WEB NT**. Verified in `web/matthew/5.json`, `web/acts/1.json`, etc. This is the single highest-blast-radius cosmetic defect and disfigures the most-read English NT in the app.
2. **Wildfire/saintjoe.com copyright footer** leaked verbatim — including a literal Markdown link `Wildfire Fellowship, Inc](https://saintjoe.com/...` — into **110 Catena Aurea Luke/John excerpts** (verified: 57 John + 53 Luke; never Matthew). This is a **provenance/licensing problem**, not just cosmetics, and should not ship.
3. **Undecoded HTML entities** in rendered library prose — `&oelig;`, `&iuml;`, `&sect;`, etc. — leaking as literal strings (`C&oelig;lestius`, `Ph&oelig;nicia`, `&sect; 8`) across **~246 library by-work files** (synthesis counted 1,251 occurrences in 325 files; `&oelig;` alone = 891).

Everything else is medium/low and can ship-then-patch if time-boxed, but items 1–3 are cheap, central, and embarrassing on screen.

---

## 2. Coverage

- **Scanned:** 38,856 files, 766,984 rendered fields. 12,517 raw flags (4,301 error / 3,938 warn / 4,278 review) across 308 flagged corpora; **431 corpora came back clean**.
- **By type:** bible 12,993 flags · commentary by-verse 22,161 · commentary by-chapter 216 · library 3,486.
- **Certified clean (verified):**
  - **Bible text is in excellent shape.** Fully clean translations: `brenton`, `wlc` (Hebrew), `lxx-greek`, `ant1904`, `byz`, `peshitta`, `gnt`. No real issues in `dra`, `vulgate`, `lxxe`. The *only* systemic Bible-text defect is the WEB contraction bug; the rest are two isolated punctuation artifacts (`cu-elizabeth`, `kjva` Apocrypha) and one Synodal OSIS-note leak.
  - **Many library corpora verified clean**, including `chrysostom-homilies-on-john`, `augustine-confessions` (prose verified excellent), `chrysostom-homilies-on-second-corinthians`, and ~30 fully-clean bundles (Augustine sermons/Trinity/reply-to-Faustus, Leo letters, Gregory of Nyssa letters, most of the Apocrypha and Chrysostom occasional-works bundles).
- **Verified-against-disk in this pass:** WEB 235 files (U+2019, not ASCII apostrophe); saintjoe footer 110 files; library `&oelig;` 246 files + `}}-->` 72 files; Daniel 9 `<i>` tags + `CHAPTER NINE` + secondary-quote misattribution (vv. 24–27); Synodal Job 2:9 `<note>`; Chrysostom Acts 3:12 header; augustine-psalms four-dot 115 files; Catena Matthew CCEL-URL 161 files; kjva sirach `servant..`; cu-elizabeth ezekiel double-comma.

---

## 3. Confirmed systemic issues (ranked)

| # | Issue | Sev | Blast radius (verified) | Example (verbatim) | Root cause | Fix | Stage |
|---|-------|-----|--------------------------|--------------------|------------|-----|-------|
| 1 | **WEB broken contractions** — apostrophe followed by stray space | **High** | **235 files**, entire WEB NT (Matthew→Revelation) | `Don’ t depart from Jerusalem` (`web/acts/1.json`) | `parse-web` lost/space-padded the U+2019 right-single-quote (note: **not** ASCII `'` — that's why a naive `n' t` grep returns 0) | Regex-collapse `(\w)[’']?\s+(t\|s\|ll\|ve\|re\|d\|m)\b` → proper contraction, guarding genuine possessive-then-word. Re-run `ingest:bibles` + `normalize:bibles:demo` for web, push to R2 | ingest-parser (`parse-web`) |
| 2 | **Wildfire/saintjoe.com copyright footer + Markdown link** appended to excerpts | **High** (licensing) | **110 files** — Catena Aurea **Luke (53) + John (57)**, never Matthew | `…Copyright ©1999-2023 [Wildfire Fellowship, Inc](https://saintjoe.com/wildfire/) all rights reserved \|` (`luke/24/53.json`, `john/19/42.json`) | Catena Luke/John scraper captured the page footer with the last excerpt on each scraped page (note: synthesis estimated 119; **disk count is 110**) | In the Catena Luke/John parser strip `/\s*Copyright ©.*?saintjoe\.com.*?all rights reserved[\s|]*$/is` from excerpts. Re-run `ingest:commentary`→`normalize:commentary`→`push:commentary:s3` | ingest-parser (Catena Luke/John) |
| 3 | **Undecoded HTML entities** in library `text`/`heading` | **High** | **~246 by-work files** (1,251 occurrences / 325 files reported; `&oelig;`=891, `&iuml;`=148, `&sect;`=63, `&OElig;`=40 …) ~60 corpora | `C&oelig;lestius`, `Ph&oelig;nicia`, `Mono&iuml;mus`, `&sect; 8` | `decodeEntities()` in `scripts/ingest/commentary/new-advent-html.ts:9-34` is a hand-rolled allowlist missing ~12 common entities. (Allowlisted entities reach rendered fields **0×** — those per-corpus "&mdash; is html-only" false-positive notes are correct.) | Replace the allowlist with a complete decoder (`he.decode()` or full named+numeric map). Centralize in `scripts/normalize/cleanup-text.ts` so per-book parsers that bypass new-advent-html are also covered. Re-run ingest→normalize→push (R2 read first) | ingest-parser → centralize in cleanup-text |
| 4 | **Catena Matthew CCEL leaks** — anchor URLs + chapter-nav pipe-tables | **High** | **161 by-verse Matthew files** contain `ccel.org` (synthesis: 140–146) | bare URLs + `Prev`/pipe-dash nav table tails in excerpts (`hilary-poitiers`, `rabanus-maurus`, `remigius-auxerre`) | `parse-catena-aurea.ts preprocessText` doesn't strip markdown links / parenthesized URLs / nav tail | Strip markdown links to label text, drop bare parenthesized URLs, cut from the `Prev` nav marker + pipe-dash tail. Re-run for Matthew | ingest-parser (`parse-catena-aurea`) |
| 5 | **HCF parser passes source markup verbatim** — `<i>`/`<h2>` tags, HTML entities, ALL-CAPS `CHAPTER NINE` titles, JSON `\r\n`, mid-sentence truncation | **High** | Clustered in Daniel 9:24–27 (`<i>` + `CHAPTER NINE` verified in all 4 files); CRLF verified in `first-corinthians/9/24.json` (Theophylact); spans ~14 commentary corpora | `the <i>arkhiereis</i> and pontiffs`; title `…CHAPTER NINE on daniel 9:24` | `parse-hcf.ts buildEntry` doesn't sanitize excerpt **or** title; titles built from scraped page heading | `sanitizeRendered` on both fields (decode entities, strip `<i>/<em>/<b>`, normalize `\r\n`→LF), sentence-boundary-aware slicing, build titles from canonical Work title + verse locator | ingest-parser (`parse-hcf`) + normalize |
| 6 | **Leaked New Advent template comment `}}-->`** mid-sentence | **Medium** | **72 by-work files** (verified) | `Athenagoras cannot so have understood Euripides.}}-->` (`athenagoras-plea-christians/1.json`); `.}}--> when you do any` (chrysostom-2-timothy) | `normalizeParagraphHtml` leaves Handlebars-close + HTML-comment-close residue | Strip `/\}\}--+>/`, `/<!--[\s\S]*?-->/`, stray unclosed `<X` tags; add unit assertion no rendered field contains `}}`, `-->`, or `<`+letter | ingest-parser / cleanup-text |
| 7 | **Glued footnote/page digits + superscript letters** in excerpts (both pipelines) | **Medium** | ~18 corpora; Cyril-on-John ~84 Pusey-marker files | `was433`, `table39`, glued `.1`/`.2` footnote digits | sup/footnote markers not stripped before slicing | Source-aware: strip `<sup>` first; guarded-strip letter+1–3 digits+punct only when not preceded by a digit and not a `chap:verse` ref; Cyril pipe-NN. Validate vs known-OK list | ingest-parser / cleanup-text |
| 8 | **OCR/scanned-PDF structural collapse** in non-New-Advent corpora | **High** (localized) | ~9 corpora: `desert-fathers-paradise`, `macarius-fifty-spiritual-homilies`, the 4 `dionysius-*`, `cyril-alexandria-commentary-john`, `ephrem-cave-of-treasures` | running headers as paragraphs (`68 Dionysius the Areopagite`); `Digitized by Google` watermarks; blackletter garble `ZTbe paraMse of tbe 1bol2 jfatbera`; **Cyril-on-John Books 1–6/9–11 are TOC-only with U+FFFD and zero prose — a content GAP** | per-source PDF parsers ingest page furniture and OCR noise | Per-source pre-processing: strip header/`Digitized`/`Plate` lines, truncate at back-matter sentinels, merge paragraphs across stripped headers. **Re-ingest Cyril-on-John Books 1–6/9–11 from a full source** — TOC-only files must not surface as commentary. Prefer re-ingesting Paradise from a clean CCEL/Gutenberg transcription | ingest-parser (per-source) |
| 9 | **Daniel 9 mis-attribution** — Jerome's paraphrases attributed to the quoted Fathers | **Medium** (provenance) | Daniel 9:24–27 — verified `personId` = `clement-of-alexandria` / `origen` / `julius-africanus` / `hippolytus` while `workId` = `hcf:work:<father>:st-jerome-commentary-on-daniel-chapter-nine` (4 verses × multiple Fathers) | Tapping "Clement of Alexandria" shows Jerome *summarizing* Clement (`The learned scholar Clement…`) | HCF fanned secondary-quote entries under the quoted Father's `personId` | Set `personId`=jerome (the quoting author), record quoted Father in a `quotedPerson`/`mentions` field, OR add visible "as quoted by Jerome" byline. Standing project provenance rule | normalize / per-source |
| 10 | **Synodal OSIS `<note>` leaked into verse text** | **Medium** | `rus-synodal/job/2.json` verse `rus-synodal:job.2.9` (verified) — ~180-word LXX alternate-verse footnote inlined | `похули Бога и умри.<note>Этот стих по переводу 70-ти…</note>` | Synodal parser doesn't strip OSIS inline tags | Strip `<note>…</note>` and other OSIS inline tags from `verse.text` (optionally move to a `verse.note` field). Audit rest of rus-synodal | normalize-cleanup (Synodal parser) |
| 11 | **Chrysostom Homilies on Acts: NPNF running header** in excerpt start | **Medium** | `acts/3/12.json` entry `chrysostom-210109-v12` (verified); audit other NPNF homily sources | `Acts III. 12 And when Peter saw it, he answered unto the people, You men of Israel…` | NPNF typeset book-abbrev + Roman-numeral + verse header survived into text | Strip leading `/^[1-3]?\s?[A-Z][a-z]+\.?\s+[IVXLC]+\.\s+\d+\s+/`; audit sibling NPNF homily parsers | ingest-parser (homilies-on-acts) |
| 12 | **Four-dot ellipsis `....`** in library prose | **Medium** | ~18 corpora; **`augustine-psalms` worst — 115 files verified** (978 occurrences reported); a 7-dot run in `john-damascus` Book 2 | every ellipsis-terminated paragraph shows `....` | paragraph terminator appends a period onto a source 3-dot ellipsis | In cleanup-text replace `/\.{4,}/g`→`...`. Mid-quotation NPNF elisions are 3-dot and unaffected | normalize-cleanup |
| 13 | **Inline footnote markers `[n]`/`(n)`** + full "Footnotes & Editorial Notes" wall sections | **Medium** | 4 dense corpora: `mogila-orthodox-confession` (160+ `[6]`/`[175]` across all 3 Q&A files + a multi-KB footnote wall paragraph), `evagrius-praktikos`, `chrysostom-homilies-on-first-corinthians`, `augustine-merits-remission` | `stabilized by[1] reading,[2] vigils`; leading `[7]`/`[8]` on paragraphs | normalize doesn't strip editorial markers; footnote sections rendered as body | Strip `/\[\d+\]/` and trailing `/\(\d+\)/`; exclude sections whose heading matches `/footnotes?\|endnotes?\|editorial notes/i` from rendered sections | normalize-cleanup |

---

## 4. Isolated / lower-priority issues

- **Verse-split truncations / lowercase continuations** (~20 corpora). The New Advent parser splits a sentence at an inline verse/poetry block, so paragraph N ends mid-clause (`As Horace says`, `:—`) and N+1 starts lowercase. This is the **true root cause** behind most `leadingLowercase`/`truncatedEnd` scanner hits — counting them separately double-counts. Fix with a two-pass merge in normalize (join when N lacks terminal punctuation and N+1 starts lowercase, inlining the verse as a blockquote). **A few are genuinely missing text and need re-ingest from NPNF, not formatting:** `cassian-conferences` Conf.19 (`…seem in some degree to emulate`), `chrysostom-homilies-on-first-timothy` Homily 17 (lost Moral section), `athanasius-letters` Letter 20 (`Satan, that is. ..`).
- **Inline NPNF/ANF apparatus** (~15 corpora, low): mid-sentence `p. NNN` markers (`augustine-letters` Letter 185 — and a page-break inside a word: `punp. 639 ishment`, 185+ files), ANF `[Arabic, p. N]` in all 55 `tatian-diatessaron` sections (303+), footnote-citation clusters in `kronstadt`. Extend cleanup-text strip heuristics conservatively per-pattern.
- **Church-Slavonic / KJV-Apocrypha punctuation** (low): `cu-elizabeth` double-comma `,, глаголет Господь` (`ezekiel/47.json`, ~7 files) + trailing `..`; `kjva` `work, for a servant..` (`sirach/33.json` v.24). Collapse `,,`→`,` and terminal `..`→`.` (protect true `...`).
- **Cosmetic single-word glues** (verified minor): `broughtforth`, `demonsthere`, `theResurrection` — a handful each in otherwise-clean corpora.

---

## 5. False positives — do NOT chase these

The cosmetic scanners encode prose-sentence assumptions that commentary excerpts and patristic citations routinely break. Tune/suppress before any re-run:

- **`leadingLowercase` (1,922)** — commentary excerpts legitimately start mid-sentence/lowercase (e.g. Eusebius `you shall be witnesses for me:…` quoting Acts 1:8). Suppress for commentary excerpt fields. Largely a symptom of the verse-split issue, not independent defects.
- **`runningHeaderCaps` (661)** — most are legit work-title citations generated from source work-title fields (`COMMENTARY ON DANIEL 9:24 on daniel 9:24`, `HOMILIES ON THE GOSPEL OF JOHN 86 on acts 1:8`). Only the `CHAPTER NINE` substring in the Jerome block is real (~1 of 4 hits). Distinguish title-shaped all-caps from bare chapter-heading words.
- **`leadingPageDigits` (1,643)** — almost entirely canonical numbered-book prefixes (`1 Samuel`, `2 Corinthians`, `2 Clement 7`, `1 Thessalonians`, `1 Enoch`) and `tatian-diatessaron` Hill-edition segment numbers — not page numbers. `jerome-against-the-pelagians` was 28/28 false. Whitelist book-name + Diatessaron-segment prefixes.
- **`footnoteBracket` (467)** — bracketed scripture cross-refs (`[Acts 1:9]`, `[Daniel 9:27]`) are known-OK; LXX/Masoretic numbers too. Reported 61/61 false on Evagrius.
- **`htmlEntity` (901)** — the scanner counted both `.html` (intentional rich markup, never rendered on mobile) and `.text`. Allowlisted entities (`&mdash;`/`&nbsp;`/`&aelig;`/`&AElig;`/`&euml;`/`&eacute;`) reach rendered fields **0×** (verified). Scope the rule to `text`/`heading` only — only the ~12 unlisted entities (Issue 3) are real.
- **`doubledPunct` / `tocDotLeader` (1,632 / 53)** — mostly intentional NPNF editorial elisions inside scripture quotations (`council-ephesus`, `theodoret`, `eusebius`), Homeric spaced-dot ellipses, manuscript-lacuna markers (`. . .` in cave-of-treasures/apocrypha), or TOC dot-leaders in the genuinely-broken Cyril-on-John TOC files. Only the augustine-psalms four-dot class (Issue 12) is a true mechanical defect.
- **`brokenHyphen` (1,075)** — many are scholarly transliteration syllable breaks (Budge cuneiform `Ia- u- kha- zi`) or legitimate range modifiers (`fourth- to fifteenth-century`).
- **`inlinePageDigits` (1,397)** — `A.D.`/`B.C.` years and `circa` (`c. 269`) dominate; exempt per the known-OK date rule.
- **`splitCapName` (50)** — near-entirely false.

Net: the deterministic scanner is a strong *recall* net but low *precision* on commentary; trust the per-domain agent re-reads and the disk-verified counts in §3 over raw rule tallies.

---

## 6. Recommended fix sequence

Ordered by (visibility × blast radius ÷ effort). Most fixes converge on three scripts.

**Tier A — before submission (cheap, central, high-visibility):**

1. **`scripts/ingest/parse-web.ts`** — collapse the lost-apostrophe contraction pattern (Issue 1, 235 files). Re-run `ingest:bibles` + `normalize:bibles:demo` for web → push to R2.
2. **Catena Luke/John parser** — strip the saintjoe.com copyright footer (Issue 2, 110 files; **licensing**). Re-run `ingest:commentary` → `normalize:commentary` → `push:commentary:s3`.
3. **`scripts/normalize/cleanup-text.ts`** (centralized, idempotent, runs over all bundles) — do these together in one pass: complete HTML-entity decode via `he.decode()` (Issue 3); strip `}}-->` / `<!-- -->` / stray tags (Issue 6); collapse `/\.{4,}/`→`...` (Issue 12); strip `[n]`/`(n)` markers + skip footnote-heading sections (Issue 13); collapse `,,`→`,` and terminal `..`→`.` (Slavonic/kjva). Add a unit assertion that no rendered field contains `<`+letter, `}}`, `-->`, or a known leaked entity.

**Tier B — same release if time allows:**

4. **`scripts/ingest/commentary/parse-catena-aurea.ts`** — strip CCEL anchor URLs + nav pipe-tables, re-run Matthew (Issue 4).
5. **`scripts/ingest/commentary/parse-hcf.ts`** — `sanitizeRendered` on excerpt + title, LF normalization, canonical titles, sentence-boundary slicing (Issue 5); and fix Daniel 9 attribution: `personId`=jerome + `quotedPerson` (Issue 9).
6. **Synodal parser** (Issue 10) and **Chrysostom homilies-on-acts parser** (Issue 11) — single-pattern strips; audit sibling NPNF homily parsers for the same header form.

**Tier C — content gaps, not formatting (needs source re-ingest, can follow submission):**

7. **Re-ingest Cyril-on-John Books 1–6/9–11** from a full Pearse/LFC source — current files are TOC-only with U+FFFD placeholders and **must not surface as commentary** (Issue 8). Re-ingest **Paradise of the Fathers** from a clean CCEL/Gutenberg transcription rather than de-noising Google-Books OCR.
8. Hand-verify and re-ingest the handful of genuinely truncated NPNF passages: Cassian Conf.19, Chrysostom 1 Timothy Homily 17, Athanasius Letter 20.

**Critical operational note (from project memory):** mobile reads catalog/content from **Cloudflare R2 first** — committing + deploying alone is insufficient. Every content fix above must end with the appropriate `push:*:s3` step against R2, or testers will keep seeing the old (defective) text.

Verify with the existing assertion harness pattern (`scripts/test/*.ts` plain `tsx` + `assert()`), and add a post-normalize guard test asserting zero leaked tags/entities/footers in rendered fields so regressions can't re-enter the pipeline.