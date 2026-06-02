#!/usr/bin/env node
/**
 * One-off OCR cleanup for St. Cyril of Alexandria, Festal Letters 1-12
 * (Fathers of the Church Vol. 118, Catholic University of America Press,
 * tr. Philip R. Amidon, 2009), scanned PDF -> OCR text via the Theosis
 * library acquisition pipeline.
 *
 * Reads content/generated/commentary/cyril-alexandria-festal-letters-1-12.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * The Tier-1 universal cleaner has already stripped leading page numbers and
 * standard ALL-CAPS running-header substrings. This script targets the
 * source-specific long tail.
 *
 * The dominant OCR bug in this scan is a typeface oddity: capital I and
 * capital N are systematically rendered as lowercase i and lowercase n by the
 * OCR engine, even inside otherwise ALL-CAPS words. That bug manifests as:
 *   (a) the recto running header "ST. CYRIL OF ALEXANDRIA" coming through as
 *       "ST. CYRi L OF ALEXAnDRiA" - 96 occurrences, all at paragraph start;
 *   (b) the standalone pronoun "I" coming through as lowercase "i" - 383
 *       occurrences (sole genuine lowercase "i" in the corpus is "i.e.");
 *   (c) sentence-initial I/N words ("It", "In", "If", "Is", "Indeed", "Now",
 *       "Nor", "Nothing", "Neither") coming through lowercase;
 *   (d) proper nouns starting with I ("Isaiah", "Israel", "Isaac", "Ishmael",
 *       "Idumaea", "Idumaeans", "Israelite(s)") coming through lowercase;
 *   (e) ALL-CAPS heading words with stray lowercase i/n: "inDEX",
 *       "SCRiPTURE", "GEnERAL", "APPEnDiX";
 *   (f) Roman-numeral entries in the appendix table: "iV", "iX", "XiV",
 *       "XiX", "XVii", "XViii", "XXii", "XXiii", "XXiV", "XXVi", "XXVii",
 *       "XXViii", "XXiX";
 *   (g) Scripture-abbreviation tokens "is" (Isaiah) and "nm" (Numbers)
 *       appearing lowercase in footnotes.
 * In addition, the OCR failed to recognize the drop-cap glyph at the start
 * of each of the 12 Festal Letters, producing letter-openers like
 * "EJOICE IN THE LORD" (should be "REJOICE"), "NCE AGAIN THE" ("ONCE"),
 * etc. - 11 distinct cases (Letter 1 opens correctly, "HE BRIGHT LIGHT"
 * missing T; Letter 3 was lost in transmission and the chapter holds a
 * translator's note that begins "n the Sources Chretiennes" - missing I).
 *
 * Each rule is conservative; theological vocabulary, Greek/Latin
 * quotations, archaic English, Scripture references, and digits inside
 * legitimate citations are preserved. The Latin abbreviation "i.e." is
 * specifically protected via negative lookahead in the standalone-i rule.
 *
 * Idempotent: rules use anchors so re-running is a no-op once errors are
 * fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/cyril-alexandria-festal-letters-1-12.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in
// the scan. Format: [/regex/, 'replacement' | (m, ...g) => string, 'rule-name'].
// All patterns use \b boundaries or explicit anchors so legitimate English
// never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- (a) Recto running-header strip: "<page> ST. CYRi L OF ALEXAnDRiA " ----
  //
  // 96 paragraphs begin with the page-number + recto-page running header
  // glued onto a mid-paragraph continuation. The OCR misreads "CYRIL" and
  // "ALEXANDRIA" as "CYRi L" and "ALEXAnDRiA" because of the typeface bug
  // described in the header comment, which is why the Tier-1 ALL-CAPS
  // stripper couldn't match them.
  // Verified: 96 of 96 occurrences are at paragraph start, none mid-text.
  // The continuation that follows is always real prose, so we strip only the
  // header and leave the rest untouched.
  [/^\d{1,4}\s+ST\. CYRi L OF ALEXAnDRiA\s+/, '', 'running-header-strip'],

  // ---- (b) Drop-cap restoration at start of each Festal Letter ----
  //
  // 11 distinct letter-openers where the first letter (a printed drop-cap
  // glyph) was not recognized by the OCR. Each is anchored to "A.D. <year>"
  // followed by a unique multi-word opening phrase, so the regex cannot
  // misfire elsewhere in the corpus. Each correction is independently
  // verified against the next phrase: e.g. Letter 8 opens "Sound the trumpet
  // in Zion" (Joel 2:1), so missing letter is "S".
  //
  // Letter 1 (ch1): A.D. 414, missing T -> "THE BRIGHT LIGHT"
  [/^A\.D\. 414 HE BRIGHT LIGHT\b/, 'A.D. 414 THE BRIGHT LIGHT', 'dropcap-letter1-T'],
  // Letter 2 (ch2): A.D. 415, missing R -> "REJOICE IN THE LORD" (Phil 4:4)
  [/^A\.D\. 415 EJOICE IN THE LORD\b/, 'A.D. 415 REJOICE IN THE LORD', 'dropcap-letter2-R'],
  // Letter 4 (ch4): A.D. 416, missing O -> "ONCE AGAIN THE"
  [/^A\.D\. 416 NCE AGAIN THE season\b/, 'A.D. 416 ONCE AGAIN THE season', 'dropcap-letter4-O'],
  // Letter 5 (ch5): A.D. 417, missing T -> "THERE IS A TIME" (Eccl 3:1)
  [/^A\.D\. 417 HERE IS A TIME\b/, 'A.D. 417 THERE IS A TIME', 'dropcap-letter5-T'],
  // Letter 6 (ch6): A.D. 418, missing W -> "WITH OUR HOLY FEAST"
  [/^A\.D\. 418 ITH OUR HOLY FEAST\b/, 'A.D. 418 WITH OUR HOLY FEAST', 'dropcap-letter6-W'],
  // Letter 7 (ch7): A.D. 419, missing R -> "REJOICE IN THE Lord" (Phil 4:4)
  [/^A\.D\. 419 EJOICE IN THE Lord\b/, 'A.D. 419 REJOICE IN THE Lord', 'dropcap-letter7-R'],
  // Letter 8 (ch8): A.D. 420, missing S -> "SOUND THE TRUMPET in Zion" (Jl 2:1)
  [/^A\.D\. 420 OUND THE TRUMPET in Zion\b/, 'A.D. 420 SOUND THE TRUMPET in Zion', 'dropcap-letter8-S'],
  // Letter 9 (ch9): A.D. 421, missing O -> "ONCE AGAIN we display"
  [/^A\.D\. 421 NCE AGAIN we display\b/, 'A.D. 421 ONCE AGAIN we display', 'dropcap-letter9-O'],
  // Letter 10 (ch10): A.D. 422, missing B -> "BEHOLD, ONCE again"
  [/^A\.D\. 422 EHOLD, ONCE again\b/, 'A.D. 422 BEHOLD, ONCE again', 'dropcap-letter10-B'],
  // Letter 11 (ch11): A.D. 423, missing C -> "COME, THEN, COME now"
  [/^A\.D\. 423 OME, THEN, COME now\b/, 'A.D. 423 COME, THEN, COME now', 'dropcap-letter11-C'],
  // Letter 12 (ch12): A.D. 424, missing T -> "THE LAW HAS a shadow" (Heb 10:1)
  [/^A\.D\. 424 HE LAW HAS a shadow\b/, 'A.D. 424 THE LAW HAS a shadow', 'dropcap-letter12-T'],

  // ---- (c) Standalone lowercase "i" -> "I" (pronoun) ----
  //
  // 383 standalone "i" tokens. In English prose the standalone pronoun is
  // always uppercase; the sole legitimate lowercase "i" in this corpus is
  // the Latin abbreviation "i.e." (verified: 1 occurrence in ch10
  // "47. i.e., the Eucharist"), which is excluded via negative lookahead.
  // Contractions like "i'm"/"i've" do not occur (verified 0 matches).
  [/\bi\b(?!\.e\.)/g, 'I', 'standalone-i->I'],

  // ---- (d) Sentence-initial lowercase I-words and N-words -> uppercase ----
  //
  // After a sentence terminator (. ! ? optionally followed by closing
  // quotation mark) and whitespace, or after an opening quotation mark, an
  // English sentence must begin with an uppercase letter. The set below
  // covers the I/N-initial words that are systematically lowercased by the
  // I->i, N->n OCR bug. Word lists are restricted to genuine sentence-
  // openers observed in the scan; verb forms that legitimately appear
  // lowercase only mid-sentence are excluded.
  //
  // Pattern: capture-group 1 = the sentence-terminator + whitespace OR
  // opening quote OR start of string; capture-group 2 = the lowercase word.
  // Replacement is built as p1 + uppercase-first-letter + remainder.
  [
    /(^|[.?!]”?\s+|“)(it|in|if|is|indeed|now|nor|next|nothing|neither|naturally)\b/g,
    (m, p1, p2) => p1 + p2.charAt(0).toUpperCase() + p2.slice(1),
    'sentence-initial-I-N-word',
  ],

  // ---- (d2) Sentence-initial lowercase "i" after a footnote-number ----
  //
  // Footnote-content paragraphs begin with "<n>. " where the next char
  // should be capitalized. The (d) rule does not fire here because the
  // preceding "." is part of the number, not a sentence terminator inside
  // prose - but the same uppercasing applies. Restricted to the same I/N
  // word list as (d) plus the standalone "i" pronoun handled by (c).
  // (c) already covered standalone-i; (d2) handles footnote-leading I/N
  // words like "8. it is the choir of prophets".
  [
    /(^\d+\.\s+)(it|in|if|is|indeed|now|nor|next|nothing|neither|naturally)\b/gm,
    (m, p1, p2) => p1 + p2.charAt(0).toUpperCase() + p2.slice(1),
    'footnote-initial-I-N-word',
  ],

  // ---- (d3) Sentence boundary obscured by inline footnote-marker digit ----
  //
  // When a footnote marker (superscript digit in the original) gets glued to
  // the end of a sentence by the OCR, the pattern becomes
  // "<terminator>(quote)?<digit-run><space><lowercase-word>" where the
  // lowercase word is actually starting the next sentence. Examples:
  //   "stand by it.”5 now, that the time is here"  -> "Now"
  //   "I am too young!”18 now even though"          -> "Now"
  //   "is for everything. 2 now the present moment" -> "Now"
  // The lookbehind (?<!\d) prevents this from matching Scripture decimals
  // like "Ps 92.13 in" where "92." is preceded by another digit (verified:
  // 0 such cases exist in this corpus, but the lookbehind makes the rule
  // safe to re-run if more content is added). Digit run is capped at 3
  // chars because the highest footnote marker observed in this position is
  // 78.
  [
    /((?<!\d)[.?!]”?)(\d{1,3})(\s+)(it|in|if|is|indeed|now|nor|next|nothing|neither|naturally)\b/g,
    (m, p1, p2, p3, p4) => p1 + p2 + p3 + p4.charAt(0).toUpperCase() + p4.slice(1),
    'inline-footnote-sentence-boundary',
  ],

  // ---- (e) Proper nouns starting with I that lost their capital ----
  //
  // These are proper nouns that have no legitimate lowercase form in
  // English prose. Each is verified against context (Old Testament names,
  // ethnonyms). Counts in the bundle: Isaiah 10, Israel 41, Isaac 19,
  // Ishmael 1, Idumaea 4, Idumaeans 4, Israelite 1, Israelites 4.
  [/\bisaiah\b/g, 'Isaiah', 'propnoun-isaiah'],
  [/\bisrael\b/g, 'Israel', 'propnoun-israel'],
  [/\bisaac\b/g, 'Isaac', 'propnoun-isaac'],
  [/\bishmael\b/g, 'Ishmael', 'propnoun-ishmael'],
  [/\bidumaea\b/g, 'Idumaea', 'propnoun-idumaea'],
  [/\bidumaeans\b/g, 'Idumaeans', 'propnoun-idumaeans'],
  [/\bisraelite\b/g, 'Israelite', 'propnoun-israelite'],
  [/\bisraelites\b/g, 'Israelites', 'propnoun-israelites'],

  // ---- (f) ALL-CAPS heading words with stray lowercase i/n ----
  //
  // "inDEX" (9x), "SCRiPTURE" (6x), "GEnERAL" (3x), "APPEnDiX" (1x).
  // None of these mixed-case sequences are real English words; they are
  // confined to the appendix / scripture-index back matter of Letter 12.
  [/\binDEX\b/g, 'INDEX', 'heading-inDEX'],
  [/\bSCRiPTURE\b/g, 'SCRIPTURE', 'heading-SCRiPTURE'],
  [/\bGEnERAL\b/g, 'GENERAL', 'heading-GEnERAL'],
  [/\bAPPEnDiX\b/g, 'APPENDIX', 'heading-APPEnDiX'],

  // ---- (g) Roman-numeral table entries with lowercase i ----
  //
  // The appendix "Dates of Easter" table lists letters by Roman numeral:
  // iV, iX, XiV, XiX, XVii, XViii, XXii, XXiii, XXiV, XXVi, XXVii,
  // XXViii, XXiX. Each is a single distinct token; none collides with any
  // English word. We rewrite each with all-uppercase letters.
  [/\biV\b/g, 'IV', 'roman-iV'],
  [/\biX\b/g, 'IX', 'roman-iX'],
  [/\bXiV\b/g, 'XIV', 'roman-XiV'],
  [/\bXiX\b/g, 'XIX', 'roman-XiX'],
  [/\bXVii\b/g, 'XVII', 'roman-XVii'],
  [/\bXViii\b/g, 'XVIII', 'roman-XViii'],
  [/\bXXii\b/g, 'XXII', 'roman-XXii'],
  [/\bXXiii\b/g, 'XXIII', 'roman-XXiii'],
  [/\bXXiV\b/g, 'XXIV', 'roman-XXiV'],
  [/\bXXVi\b/g, 'XXVI', 'roman-XXVi'],
  [/\bXXVii\b/g, 'XXVII', 'roman-XXVii'],
  [/\bXXViii\b/g, 'XXVIII', 'roman-XXViii'],
  [/\bXXiX\b/g, 'XXIX', 'roman-XXiX'],

  // ---- (h) Scripture-abbreviation tokens: "is" (Isaiah), "nm" (Numbers) ----
  //
  // In footnote citation lines the abbreviations "Is" (Isaiah) and "Nm"
  // (Numbers) appear lowercased: e.g. "39. 1 Cor 2.9; Cf. is 64.4." and
  // "9. nm 10.9-10." 21 and 2 occurrences respectively. Restricted via
  // lookahead to whitespace + digit so the rule cannot misfire on the
  // English verb "is" or any other token.
  [/\bis(?=\s+\d)/g, 'Is', 'scripture-abbr-Is'],
  [/\bnm(?=\s+\d)/g, 'Nm', 'scripture-abbr-Nm'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes - only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No additional glyph fixes beyond the wordFixes above for this corpus.
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
      for (const [re, repl, name] of wordFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      for (const [re, repl, name] of glyphFixes) {
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
const showCount = process.argv.includes('--all') ? samples.length : 12;
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
