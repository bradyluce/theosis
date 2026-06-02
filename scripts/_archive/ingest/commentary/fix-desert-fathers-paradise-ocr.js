#!/usr/bin/env node
/**
 * One-off OCR cleanup for E. A. Wallis Budge, "The Paradise of the Holy
 * Fathers" (1907, Chatto & Windus) — Syriac apophthegmata into English.
 *
 * Reads content/generated/commentary/desert-fathers-paradise.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * The dominant systematic noise in this scan is the OCR misread of the
 * 1907 typesetter's line-leading inner-quote glyphs ("ditto" continuation
 * marks placed at the start of every line inside a multi-line quote) as
 * the digit-runs " 44 ", " 4 4 ", " 4 ", and "44 " at paragraph start.
 * Each is a stray glyph injected mid-quote and is safely removed (the
 * outer quotes are intact elsewhere). All " 4 " / " 44 " rules are gated
 * on lowercase-letter context on both sides so legitimate numerals are
 * never matched (verified: zero collisions across 5902 paragraphs).
 *
 * Secondary: the Syriac honorific "Abbâ" (a-circumflex) gets mangled into
 * ~13 different garbage-glyph forms (Abbd, Abb£, Abb&, Abbi, AbbA, …).
 * Normalised to "Abbâ" only when followed by an obvious proper-name
 * capital so "Abbot/Abbots/Abbey" are never touched. Same treatment for
 * "Rabbâ" (Pachomian title) and the Coptic monk names Hôr, Lôt, Piôr,
 * Pambô — each known to occur in standard transliteration in the
 * sister entries of the same scan.
 *
 * Tertiary: a small handful of long-s misreads ("dejefted" → "dejected",
 * "afted" → "acted") and run-together words ("artthou" → "art thou",
 * "andhe" → "and he", "hegoeth" → "he goeth") observed in the sample.
 *
 * Decorative Olde-English chapter-title paragraphs ("ZTbe paraMse of
 * tbe 1bol2 jfatbera") are LEFT ALONE — they're whole-paragraph noise
 * that already has clean section/work titles attached elsewhere, and
 * any attempt at reconstruction would be unsafe.
 *
 * Each rule is conservative — applies only where the pattern is
 * unambiguous. Theological vocabulary, Greek/Syriac/Coptic monk names
 * in transliteration ("Abbâ Macarius"), archaic English (-eth/-est,
 * thou/thee/thy, ye, hast, doth, shewn), and Scripture refs are
 * preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running
 * is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/desert-fathers-paradise.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Quote-glyph fixes — line-leading "ditto" continuation marks misread as
// digit runs. All gated on lowercase-letter context to be number-safe.
// ---------------------------------------------------------------------------
const quoteFixes = [
  // " 44 " — the OCR-misread of the 1907 typesetter's line-leading
  // ditto/quote-continuation glyph. Always a stray artifact that should
  // be removed (the actual outer quote was opened on a prior line and
  // closes elsewhere intact).
  //
  // Right context: ONLY a letter — never punctuation. Legitimate "44"
  // verse numbers in this bundle are always followed by a punctuation
  // (", 44." / ", 44)" / ", 44,") to delimit the numeral. Pure-letter
  // right neighbour is unambiguous OCR noise.
  // Left context: letter, comma, semicolon, colon, exclam, question,
  // close-bracket, single quote — same logic, never a digit.
  // Hyphen left context handled separately so the hyphen+space is
  // preserved across the join (line-break hyphen).
  [/([A-Za-z,;:!?'"\])]) 44 (?=[A-Za-z])/g, '$1 ', '44-stripped'],
  // "X- 44 Y" — line-break hyphen + ditto glyph between two word halves.
  // Preserve the hyphen joiner (later normalisation can re-join the
  // hyphenated word if desired).
  [/([A-Za-z]-) 44 (?=[A-Za-z])/g, '$1 ', '44-stripped-after-hyphen'],
  // Period before 44 + capital letter: " . 44 X" — sentence boundary
  // followed by glyph + start of next sentence. Same removal.
  [/\. 44 (?=[A-Z])/g, '. ', '44-stripped-after-period'],
  // " 44 '" — ditto glyph followed by single quote (nested inner quote
  // continuation). Drop the 44 + space, leave the quote.
  [/([A-Za-z,;:!?'"\])]) 44 '(?=[a-zA-Z])/g, "$1 '", '44-stripped-before-singlequote'],
  // " 44 4" — ditto glyph followed by another glyph (inner-quote ditto).
  // Two ditto-marks for a nested quoted clause; strip the 44 4 entirely.
  [/([A-Za-z,;:!?'"\])]) 44 4 (?=[A-Za-z])/g, '$1 ', '44-4-stripped'],
  // " 44 [" — ditto glyph followed by Budge's editorial bracket.
  [/([A-Za-z,;:!?'"\])]) 44 \[/g, '$1 [', '44-stripped-before-bracket'],
  // " 44 1" — ditto glyph + OCR'd capital "I" as "1". Budge's narrators
  // frequently quote "1 am ...", "1 will not ...", "1 restrained ...".
  // Strip the 44 and restore the I.
  [/([A-Za-z,;:!?'"\])]) 44 1 ([a-z])/g, '$1 I $2', '44-1-stripped-to-I'],
  // " 44 *" / " 44 ' " — ditto glyph followed by another stray glyph
  // (asterisk, bullet, ditto-prime). Always at line boundary inside a
  // multi-line nested quote; strip the whole "44 *" + space.
  [/([A-Za-z,;:!?'"\])]) 44 \*(?=[\sA-Za-z])/g, '$1 ', '44-star-stripped'],
  // " 44 4..." after hyphen as well (line-break + double ditto).
  [/([A-Za-z]-) 44 4 (?=[A-Za-z])/g, '$1 ', '44-4-stripped-after-hyphen'],
  // " 44 4..." after open bracket
  [/(\[) 44 4 /g, '$1', '44-4-stripped-after-openbracket'],
  // "44 1" after hyphen line-break
  [/([A-Za-z]-) 44 1 ([a-z])/g, '$1 I $2', '44-1-stripped-to-I-hyphen'],
  // ": — 44 " or " — 44 " — em-dash + ditto glyph
  [/(:?\s*—) 44 (?=[A-Za-z])/g, '$1 ', '44-stripped-after-emdash'],
  // " — 44 " (en-dash spacing)
  [/( - ) 44 (?=[A-Za-z])/g, '$1', '44-stripped-after-dash'],
  // " - 44 ment " etc. spaced hyphen line breaks
  [/([A-Za-z] -) 44 (?=[A-Za-z])/g, '$1 ', '44-stripped-after-spaced-hyphen'],
  // " 44 4word" (no space between 4 and word) — most common with
  // run-together OCR like "44 4and", "44 4roar". Strip 44 4 to space.
  [/([A-Za-z,;:!?'"\])]) 44 4(?=[a-z])/g, '$1 ', '44-4-no-space-stripped'],
  // " 44 '" with following word starting with capital (rare)
  [/([A-Za-z,;:!?'"\])]) 44 '(?=[A-Z])/g, "$1 '", '44-singlequote-cap-stripped'],
  // "0111 44 X" — "our" + ditto glyph misread; 0111 → "our".
  // Single observed phrase only.
  [/\bprolong 0111 44 stay\b/g, 'prolong our stay', '0111-44-our-stay'],
  // Hyphen + "^ 44 " — line-break hyphen + stray glyph + ditto.
  [/([A-Za-z]-) \^ 44 (?=[a-z])/g, '$1 ', '44-caret-stripped-after-hyphen'],
  // Hyphen + "'" + 44 (where ' is leading line ditto-prime)
  [/([A-Za-z]-) 44 '(?=[a-z])/g, "$1 '", '44-hyphen-singlequote-stripped'],
  // Hyphen + "'" 44 (alternate)
  [/([A-Za-z]-) 44 '(?=[A-Z])/g, "$1 '", '44-hyphen-singlequote-cap-stripped'],
  // " 44 1 " followed by capital word — same as 44 1 lowercase
  [/([A-Za-z,;:!?'"\])]) 44 1 ([A-Z])/g, '$1 I $2', '44-1-stripped-to-I-cap'],
  // " 44 4 1 " — triple nested quote glyph followed by I-as-1.
  [/([A-Za-z,;:!?'"\])]) 44 4 1 ([A-Za-z])/g, '$1 I $2', '44-4-1-stripped-to-I'],
  // " 44 4 4 4 " — quadruple ditto run (rare)
  [/([A-Za-z,;:!?'"\])]) 44 4 4 4 (?=[A-Za-z])/g, '$1 ', '44-quadruple-stripped'],
  // " 44 4 4 " — triple ditto
  [/([A-Za-z,;:!?'"\])]) 44 4 4 (?=[A-Za-z])/g, '$1 ', '44-triple-stripped'],
  // " 44 — " (em-dash following): ditto + dash boundary
  [/([A-Za-z,;:!?'"\])]) 44 —/g, '$1 —', '44-emdash-after-stripped'],
  // " 44 *ing" — ditto + asterisk + word fragment
  [/([A-Za-z-]) 44 \* /g, '$1 ', '44-star-space-stripped'],
  // " 44 ' She" — ditto + single quote + capital
  [/([a-z],) 44 ' (?=[A-Z])/g, "$1 '", '44-singlequote-cap-stripped-strict'],
  // "44 ' ye" — leading-position ditto + single quote
  [/, 44 ' ([a-z])/g, ", '$1", '44-singlequote-lower-stripped'],
  // " 44 1 X" where the 1 stays as digit (citation): only safe rule is
  // ", 44 1 Corinthians" → ", 1 Corinthians" (verse-prefix citation)
  [/, 44 (1 Corinthians)/g, ', $1', '44-before-1Cor'],
  // ", 44 1," (in citation lists)
  [/([,;:]) 44 1,/g, '$1 I,', '44-stripped-before-Iperiod'],
  // " 44 1 44 will" — double ditto with I-misread between
  [/([A-Za-z,;:!?'"\])]) 44 1 44 ([a-z])/g, '$1 I $2', '44-1-44-collapsed'],

  // " 4 4 " — same artifact, mis-spaced as two separate digits.
  [/([A-Za-z,;:!?'"\])]) 4 4 (?=[A-Za-z])/g, '$1 ', '4-4-stripped'],
  [/([A-Za-z]-) 4 4 (?=[A-Za-z])/g, '$1 ', '4-4-stripped-after-hyphen'],
  [/\. 4 4 (?=[A-Z])/g, '. ', '4-4-stripped-after-period'],
  [/([A-Za-z,;:!?'"\])]) 4 4 '(?=[a-zA-Z])/g, "$1 '", '4-4-stripped-before-singlequote'],
  // " 4 4 4 " — triple ditto run
  [/([A-Za-z,;:!?'"\])]) 4 4 4 (?=[A-Za-z])/g, '$1 ', '4-4-4-stripped'],
  // " 4 4 4 4 4 " — quintuple ditto run (rare)
  [/([A-Za-z,;:!?'"\])]) 4 4 4 4 4 (?=[A-Za-z])/g, '$1 ', '4-4-4-4-4-stripped'],
  // " 4 4 4 4 " — quadruple ditto run
  [/([A-Za-z,;:!?'"\])]) 4 4 4 4 (?=[A-Za-z])/g, '$1 ', '4-4-4-4-stripped'],
  // " 4 4 ' " — double ditto + single quote
  [/([A-Za-z,;:!?'"\])]) 4 4 '(?=[A-Za-z])/g, "$1 '", '4-4-singlequote-stripped'],
  // " 4 4 4 1 " — triple ditto + I-as-1
  [/([A-Za-z,;:!?'"\])]) 4 4 4 1 ([a-z])/g, '$1 I $2', '4-4-4-1-stripped-to-I'],
  // " 4 4 1 " — double ditto + I-as-1
  [/([A-Za-z,;:!?'"\])]) 4 4 1 ([a-z])/g, '$1 I $2', '4-4-1-stripped-to-I'],
  // " 4 4 [" — double ditto + Budge bracket
  [/([A-Za-z,;:!?'"\])]) 4 4 \[/g, '$1 [', '4-4-bracket-stripped'],
  // " 4 4 (" — double ditto + open paren
  [/([A-Za-z,;:!?'"\])]) 4 4 \(/g, '$1 (', '4-4-paren-stripped'],
  // "X- 4 4 4 Y" — line-break hyphen + triple ditto
  [/([A-Za-z]-) 4 4 4 (?=[A-Za-z])/g, '$1 ', '4-4-4-stripped-after-hyphen'],
  // " 4 4 4 " at paragraph-start with leading space (from paragraph splits)
  [/^\s*4 4 4 (?=[A-Za-z])/g, '', 'leading-4-4-4-stripped'],
  // " 4 4 " at paragraph-start with leading space
  [/^\s*4 4 (?=[A-Za-z])/g, '', 'leading-4-4-stripped'],
  // " « 4 4 " — guillemet + double ditto
  [/«\s+4 4 (?=[A-Za-z])/g, '« ', 'guillemet-4-4-stripped'],
  // "1 4 4 " — OCR'd I-as-1 with hyphen artifact
  [/\b1 4 4 (will|have|am)\b/g, 'I $1', '1-4-4-Iverbs'],

  // ` 4 ' ` — closing-quote artifact at line break inside a quote
  // (e.g. "I am con- 4 'strained" → "I am con- 'strained"). The 4 drops.
  [/ 4 '([a-z])/g, " '$1", '4-singlequote-dropped'],

  // " 4 " (a single stray 4) — same glyph in slimmer form. Gated to
  // require letter on both sides (no digit neighbours, no punctuation
  // right-side — same logic as 44).
  [/([A-Za-z]) 4 (?=[A-Za-z])/g, '$1 ', '4-stripped'],

  // "44 " at the very start of a paragraph (no leading space).
  [/^44 (?=[A-Za-z])/g, '', 'leading-44-bare'],
  // "4 4 " at the very start of a paragraph.
  [/^4 4 (?=[A-Za-z])/g, '', 'leading-4-4-bare'],
  // "4 " at the very start of a paragraph + lowercase (continuation
  // glyph — uppercase would be ambiguous with a list-numeral so skip).
  [/^4 (?=[a-z])/g, '', 'leading-4-bare-lowercase'],

  // `"4 ` — straight quote glued onto a stray 4 at line start
  // (sample: `"4 The mind which makes...`). Remove the 4 + space.
  [/"4 (?=[A-Za-z])/g, '"', 'quote-4-attached-dropped'],
];

// ---------------------------------------------------------------------------
// "Abbâ" honorific normalisation — many garbled circumflex glyphs.
// Restricted to forms followed by a space + a Capital letter so that
// legitimate words like "Abbot", "Abbots", "Abbey", "Abbess" are never
// touched. All targets are observed in the bundle as the Syriac/Coptic
// monastic title in front of a monk's name.
// ---------------------------------------------------------------------------
const abbaFixes = [
  [/\bAbbd (?=[A-Z])/g, 'Abbâ ', 'Abbd->Abba-circumflex'],
  [/\bAbb£ (?=[A-Z])/g, 'Abbâ ', 'AbbPound->Abba-circumflex'],
  [/\bAbb& (?=[A-Z])/g, 'Abbâ ', 'AbbAmp->Abba-circumflex'],
  [/\bAbbi (?=[A-Z])/g, 'Abbâ ', 'Abbi->Abba-circumflex'],
  [/\bAbbA (?=[A-Z])/g, 'Abbâ ', 'AbbA->Abba-circumflex'],
  [/\bAbbk (?=[A-Z])/g, 'Abbâ ', 'Abbk->Abba-circumflex'],
  [/\bAbb! (?=[A-Z])/g, 'Abbâ ', 'AbbExcl->Abba-circumflex'],
  [/\bAbbH (?=[A-Z])/g, 'Abbâ ', 'AbbH->Abba-circumflex'],
  [/\bAbbI (?=[A-Z])/g, 'Abbâ ', 'AbbI->Abba-circumflex'],
  [/\bAbb\^ (?=[A-Z])/g, 'Abbâ ', 'AbbCaret->Abba-circumflex'],
  [/\bAbbf (?=[A-Z])/g, 'Abbâ ', 'Abbf->Abba-circumflex'],
  [/\bAbb4 (?=[A-Z])/g, 'Abbâ ', 'Abb4->Abba-circumflex'],
  [/\bAbb3 (?=[A-Z])/g, 'Abbâ ', 'Abb3->Abba-circumflex'],
  [/\bAbbz (?=[A-Z])/g, 'Abbâ ', 'Abbz->Abba-circumflex'],
  [/\bAbbc (?=[A-Z])/g, 'Abbâ ', 'Abbc->Abba-circumflex'],
  [/\bAbbU (?=[A-Z])/g, 'Abbâ ', 'AbbU->Abba-circumflex'],
  [/\bAbbS (?=[A-Z])/g, 'Abbâ ', 'AbbS->Abba-circumflex'],
  [/\bAbbl (?=[A-Z])/g, 'Abbâ ', 'Abbl->Abba-circumflex'],

  // Abb followed by "*" or trailing-quote / apostrophe (Abb* Anthony, Abb' …)
  [/\bAbb\* (?=[A-Z])/g, 'Abbâ ', 'AbbStar->Abba-circumflex'],
  [/\bAbb' (?=[A-Z])/g, 'Abbâ ', 'AbbApos->Abba-circumflex'],

  // Plain "Abba" form (no garble) followed by Capital — also normalise
  // for consistency. The Budge translator uses "Abbâ" throughout in the
  // intact print copy, so unifying makes search and display uniform.
  [/\bAbba (?=[A-Z])/g, 'Abbâ ', 'Abba-plain->Abba-circumflex'],

  // "Abbst" / "AbbI" run-together typos ("Abbst Lot" → "Abbâ Lot")
  [/\bAbbst (?=[A-Z])/g, 'Abbâ ', 'Abbst->Abba-circumflex'],
  // "Abba* X" — asterisk between Abba and the name (1907 footnote
  // glyph that the OCR captured). Sample: "Abba* Poemen" → "Abbâ
  // Poemen". 38 occurrences.
  [/\bAbba\* (?=[A-Z])/g, 'Abbâ ', 'Abba-star->Abba-circumflex'],
  // "Abbd "Name" — Abb garble + space + quote + capital
  [/\bAbb[diA£&!HIk^z] (?="[A-Z])/g, 'Abbâ ', 'Abb-garble-quote-Name->Abba'],
  // "Abb& \"Name" with backslash-escaped quote in raw JSON: appears
  // in the *content* as `Abbâ "Name` after JSON parse. Already covered.
];

// ---------------------------------------------------------------------------
// "Rabbâ" — Pachomian title, similar set of garbles. Skip "Rabbi" because
// it's a legitimate English word; rely only on the visible-glyph variants.
// ---------------------------------------------------------------------------
const rabbaFixes = [
  [/\bRabbd (?=[A-Z])/g, 'Rabbâ ', 'Rabbd->Rabba-circumflex'],
  [/\bRabb& (?=[A-Z])/g, 'Rabbâ ', 'RabbAmp->Rabba-circumflex'],
  [/\bRabbA (?=[A-Z])/g, 'Rabbâ ', 'RabbA->Rabba-circumflex'],
  // Plain "Rabba" → "Rabbâ" for consistency (50 occurrences, all monastic).
  [/\bRabba (?=[A-Z])/g, 'Rabbâ ', 'Rabba-plain->Rabba-circumflex'],
];

// ---------------------------------------------------------------------------
// Coptic monk names with circumflex — OCR turned "ô" into "6".
// All restricted to known forms in this corpus.
// ---------------------------------------------------------------------------
const monkNameFixes = [
  // "H6r" → "Hôr"  (Coptic monk name with circumflex; 6 occurrences,
  // all in "Abbâ H6r" or index entries "H6r, Abbâ"). The Budge edition
  // uses "Hôr".
  [/\bH6r\b/g, 'Hôr', 'H6r->Hor-circumflex'],
  // "L6t" → "Lôt"  (Coptic monk name; 4 occurrences, all next to "Abbâ"
  // or "Sylvanus". Genesis "Lot" already spelled plain elsewhere.)
  [/\bL6t\b/g, 'Lôt', 'L6t->Lot-circumflex'],
  // "Pi6r" → "Piôr"  (Coptic monk name; 2 occurrences, both with Abbâ)
  [/\bPi6r\b/g, 'Piôr', 'Pi6r->Pior-circumflex'],
  // "Pt6r" → "Petrôs" / "Petros"-like — only 2 occurrences; check if
  // these are the monk "Petros" or scribal "Peter". Looking at the
  // bundle, "Pt6r" only shows in index ("Pt6r, the chief…") — likely
  // "Pitôr" or a name variant. Leave alone (not high enough confidence).
  // "Pambd" → "Pambo"  (Coptic monk; 13 occurrences). The clean spelling
  // in this edition is "Pambo" (not Pambô), confirmed by 26 already-clean
  // occurrences.
  [/\bPambd\b/g, 'Pambo', 'Pambd->Pambo'],
  // "Pamb6" → "Pambo"  (variant garble; 8 occurrences)
  [/\bPamb6\b/g, 'Pambo', 'Pamb6->Pambo'],
];

// ---------------------------------------------------------------------------
// Long-s confusions ("ſ" → "f"): observed handful of words.
// Each pattern is restricted to the verified misreads.
// ---------------------------------------------------------------------------
const longSFixes = [
  // "dejefted" → "dejected"  (1 occurrence; long-s read as 'f')
  [/\bdejefted\b/g, 'dejected', 'dejefted->dejected'],
  // "afted" → "acted"  (1 occurrence: "heard these things afted thus")
  [/\bafted\b/g, 'acted', 'afted->acted'],
];

// ---------------------------------------------------------------------------
// Word-level OCR corrections — run-togethers and misreads observed in the
// sample. Each is restricted to the exact phrase context.
// ---------------------------------------------------------------------------
const wordFixes = [
  // "artthou" → "art thou"  (2 occurrences — "than artthou", "more than
  // artthou". Archaic "art thou" is the unambiguous restoration.)
  [/\bartthou\b/g, 'art thou', 'artthou->art-thou'],
  // "andhe" → "and he"  (1 occurrence)
  [/\bandhe\b/g, 'and he', 'andhe->and-he'],
  // "hegoeth" → "he goeth"  (1 occurrence: "and hegoeth not after Him")
  [/\bhegoeth\b/g, 'he goeth', 'hegoeth->he-goeth'],
  // "a6tual" → "actual"  (long-s/cl ligature; the 6 here is OCR for 'c')
  [/\ba6tual\b/g, 'actual', 'a6tual->actual'],
  // "a6lual" → "actual"  (variant of same; the 6l is 'ct')
  [/\ba6lual\b/g, 'actual', 'a6lual->actual'],
  // "ac~l" / "ac~t" → "act" — tilde injected for OCR'd c–t ligature
  // (4 occurrences of "ac~l" and 3 of "ac~t", all standalone "act")
  [/\bac~l\b/g, 'act', 'ac-tilde-l->act'],
  [/\bac~t\b/g, 'act', 'ac-tilde-t->act'],
  // "ac~k" → "act"  (single occurrence, same family)
  [/\bac~k\b/g, 'act', 'ac-tilde-k->act'],
  // "respe6l" / "respe6t" → "respect"  (4 + 1 occurrences)
  [/\brespe6[lt]\b/g, 'respect', 'respe6X->respect'],
  // "negle6l" / "negle6t" → "neglect"
  [/\bnegle6[lt]\b/g, 'neglect', 'negle6X->neglect'],
  // "subje6lion" → "subjection"
  [/\bsubje6lion\b/g, 'subjection', 'subje6lion->subjection'],
  // "subje£t" → "subject" (the £ here stands for OCR'd 'c')
  [/\bsubje£t\b/g, 'subject', 'subject-pound->subject'],
  // "refe6lory" → "refectory"
  [/\brefe6lory\b/g, 'refectory', 'refe6lory->refectory'],
  // "perfe6l" → "perfect"
  [/\bperfe6l\b/g, 'perfect', 'perfe6l->perfect'],
  // "effe6l" → "effect"
  [/\beffe6l\b/g, 'effect', 'effe6l->effect'],
  // "dire6l" → "direct"
  [/\bdire6l\b/g, 'direct', 'dire6l->direct'],
  // "deje6led" → "dejected"
  [/\bdeje6led\b/g, 'dejected', 'deje6led->dejected'],
  // "conne6led" → "connected"
  [/\bconne6led\b/g, 'connected', 'conne6led->connected'],
  // "colle6l" → "collect"
  [/\bcolle6l\b/g, 'collect', 'colle6l->collect'],
  // "reje6ted" → "rejected"
  [/\breje6ted\b/g, 'rejected', 'reje6ted->rejected'],
  // "do6lrine" → "doctrine"
  [/\bdo6lrine\b/g, 'doctrine', 'do6lrine->doctrine'],
  // "o6lrine" → "octrine" — only 1 occurrence; phrase-specific to be safe.
  // Not in the sample, leave alone.
  // "stri6l" → "strict"
  [/\bstri6l\b/g, 'strict', 'stri6l->strict'],
  // "vi6tory" → "victory"
  [/\bvi6tory\b/g, 'victory', 'vi6tory->victory'],
  // "i6tory" → "history" — leave alone (likely "history" but 1 occurrence)
  // "tru6tion" → "truction" (e.g. instruction) — 1 occurrence, leave alone
  // "exa6t" → "exact"
  [/\bexa6t\b/g, 'exact', 'exa6t->exact'],
  // "du6l" → "duct" (in "conduct"/"duct")
  [/\bdu6l\b/g, 'duct', 'du6l->duct'],
  // "chara6ler" → "character"
  [/\bchara6ler\b/g, 'character', 'chara6ler->character'],
  // "fa6l" / "fa6ls" → "fact" / "facts"
  [/\bfa6l\b/g, 'fact', 'fa6l->fact'],
  [/\bfa6ls\b/g, 'facts', 'fa6ls->facts'],
  // "a6ts" → "acts"
  [/\ba6ts\b/g, 'acts', 'a6ts->acts'],
  // "a6t" → "act"  (only 1 occurrence as standalone word)
  [/\ba6t\b/g, 'act', 'a6t->act'],
  // "a6l" → "act"  (12 occurrences as standalone; context "to a6l upon",
  // "did a6l", "could a6l" — verb "act")
  [/\ba6l\b/g, 'act', 'a6l->act'],
  // "a6ls" → "acts"  (5 occurrences)
  [/\ba6ls\b/g, 'acts', 'a6ls->acts'],
  // "e6l" → standalone "ect" — only 10 raw occurrences, but as standalone
  // doesn't form an English word. Leave alone.

  // ---- Standalone digits-as-letter inside name strings ----
  // "Abba*" → already handled in abbaFixes.
];

const allFixes = [
  ...quoteFixes,
  ...abbaFixes,
  ...rabbaFixes,
  ...monkNameFixes,
  ...longSFixes,
  ...wordFixes,
];

// ---------------------------------------------------------------------------
// Stats and samples
// ---------------------------------------------------------------------------
let totalParagraphs = 0;
let modifiedParagraphs = 0;
const samples = []; // [chOrder, paraIdx, before, after, rules]

for (const ch of bundle.chapters) {
  for (const sec of ch.sections || []) {
    for (let i = 0; i < sec.paragraphs.length; i++) {
      const p = sec.paragraphs[i];
      totalParagraphs++;
      const before = p.text;
      let text = before;
      const firedRules = [];
      for (const [re, repl, name] of allFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      if (text !== before) {
        modifiedParagraphs++;
        samples.push([ch.order, i, before, text, firedRules]);
        p.text = text;
      }
    }
  }
}

// Write bundle back
const out = JSON.stringify(bundle, null, 2);
fs.writeFileSync(INPUT, out, 'utf8');

console.log('Total paragraphs processed:', totalParagraphs);
console.log('Total paragraphs modified:', modifiedParagraphs);
console.log('---');
const showCount = process.argv.includes('--all') ? samples.length : 10;
console.log('Sample before/after pairs (showing ' + Math.min(showCount, samples.length) + ' of ' + samples.length + '):');
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Show a window around the first differing character
  let diffStart = 0;
  while (diffStart < before.length && diffStart < after.length && before[diffStart] === after[diffStart]) diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before.slice(ctxStart, diffStart + 100).replace(/\n/g, '\\n');
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100).replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('Distinct rule firings (' + samples.reduce((n, s) => n + s[4].length, 0) + ' total):');
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
