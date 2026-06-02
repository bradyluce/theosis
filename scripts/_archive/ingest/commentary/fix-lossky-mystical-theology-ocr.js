#!/usr/bin/env node
/**
 * One-off OCR cleanup for Vladimir Lossky, The Mystical Theology of the
 * Eastern Church (James Clarke & Co. / SVS Press English ed., 1957;
 * English translation from French), scanned PDF -> OCR text.
 *
 * Reads content/generated/commentary/lossky-mystical-theology.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative -- applies only where the pattern is unambiguous.
 * Russian transliterations (sobornost, theosis), French theological terms
 * (kenosis, apophaticism, Areopagitica), Latin/Greek citations, French author
 * names (Daniélou, Régnon, de Gandillac), and Migne column references are
 * preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/lossky-mystical-theology.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Run-together compound words: missing hyphen ----
  // "selfabandonment" -> "self-abandonment" (Ch7 idx239 — unique occurrence;
  // other self- compounds in this translation are hyphenated:
  // self-assertion, self-consciousness, self-emptying (3x), self-knowledge,
  // self-limitation, self-revealing, self-sufficiency)
  [/\bselfabandonment\b/g, 'self-abandonment', 'selfabandonment->self-abandonment'],
  // "selfemptying" -> "self-emptying" (Ch8 idx? — unique; "self-emptying"
  // appears 3 other times with hyphen in same translation)
  [/\bselfemptying\b/g, 'self-emptying', 'selfemptying->self-emptying'],
  // "nonbeing" -> "non-being" (Ch1 idx? — unique; "non-being" appears 6x
  // with hyphen elsewhere in same translation, plus non-existence/-existent/
  // -relative/-temporal — house style is hyphenated non-)
  [/\bnonbeing\b/g, 'non-being', 'nonbeing->non-being'],
  // "divinenothingness" -> "divine nothingness" (Ch3 idx76 — unique;
  // "impersonal apophaticism of the divine nothingness prior to the Trinity"
  // is the unambiguous reading; both halves are normal English words and
  // appear separately many times)
  [/\bdivinenothingness\b/g, 'divine nothingness', 'divinenothingness->divine-nothingness'],
  // "allpowerfully" -> "all-powerfully" (Ch5 idx? — unique; "all-powerful",
  // "all-embracing", "all-wise", "all-ruling", "all-beautiful" all use
  // hyphenated all- elsewhere in same translation)
  [/\ballpowerfully\b/g, 'all-powerfully', 'allpowerfully->all-powerfully'],
  // "reestablished" -> "re-established" (Ch9 idx? — unique; "re-established"
  // and "re-establish" both appear once elsewhere with hyphen)
  [/\breestablished\b/g, 're-established', 'reestablished->re-established'],
  // "reestablishes" -> "re-establishes" (same translation hyphenates re-)
  [/\breestablishes\b/g, 're-establishes', 'reestablishes->re-establishes'],
  // "lovingkindness" -> "loving-kindness" (Ch11 idx421 — unique; standard
  // Christian/biblical phrasing is hyphenated "loving-kindness" in KJV
  // tradition; appears in a hymn citation "infinite in lovingkindness")
  [/\blovingkindness\b/g, 'loving-kindness', 'lovingkindness->loving-kindness'],
  // "pseudoDenys" -> "pseudo-Denys" (Ch0 idx36, idx38 — both occurrences;
  // matches "Pseudo-Dionysius" form used elsewhere in same translation;
  // French convention requires hyphen before "Denys")
  [/\bpseudoDenys\b/g, 'pseudo-Denys', 'pseudoDenys->pseudo-Denys'],

  // ---- Single-letter typos / dropped letters ----
  // "distinguishess" -> "distinguishes" (Ch4 idx114 — unique; "the theology
  // of the Eastern Church distinguishess in God the three hypostases" —
  // doubled 'ss' is OCR garble of single 's' verb ending)
  [/\bdistinguishess\b/g, 'distinguishes', 'distinguishess->distinguishes'],
  // "comtemplation" -> "contemplation" (Ch0 idx? — unique; "to invite Timothy
  // to mystical comtemplation" — m for n is a classic OCR error; the word
  // "contemplation" appears 39 times correctly elsewhere)
  [/\bcomtemplation\b/g, 'contemplation', 'comtemplation->contemplation'],

  // ---- French diacritic OCR errors ----
  // "chrètiennes" -> "chrétiennes" (Ch4 idx? — single occurrence with grave
  // accent; correct French is acute "chrétiennes" which appears 4x elsewhere
  // in the same Sources Chrétiennes series citations)
  [/\bchrètiennes\b/g, 'chrétiennes', 'chretiennes-grave->chretiennes-acute'],
  // "thèologie" -> "théologie" (Ch3 idx? — single occurrence with grave
  // accent in "Etudes de thèologie positive"; correct French is acute
  // "théologie", and "théologie/théologiques" appear with acute elsewhere)
  [/\bthèologie\b/g, 'théologie', 'theologie-grave->theologie-acute'],

  // ---- Migne Roman numeral OCR errors: G OCR'd for C ----
  // "P.G., XGIV" -> "P.G., XCIV" (Ch2 idx47, Ch3 idx40 — three total
  // occurrences; XCIV is the correct Migne tomus for John Damascene's De
  // fide orthodoxa and appears 13x correctly elsewhere in the same bundle)
  [/\bXGIV\b/g, 'XCIV', 'XGIV->XCIV'],

  // ---- French article "l'" OCR'd as digit "1'" ----
  // "Denys 1'Aréopagite" -> "Denys l'Aréopagite" (Ch0 idx? — unique;
  // the other "Aréopagite" instances correctly use "l'", and this is the
  // standard French rendering of Pseudo-Dionysius's epithet)
  [/\bDenys 1’Aréopagite\b/g, 'Denys l’Aréopagite', '1-Areopagite->l-Areopagite'],

  // ---- Footnote-number glued to following word (lost space) ----
  // "28Wensinck" -> "28 Wensinck" (Ch10 idx379 — only occurrence; surrounding
  // footnote bibliography uses "27 ‘De oratione" / "29 ‘Π ρὶ" with spaces,
  // so the "28" lost its space before the citation author)
  [/\b28Wensinck\b/g, '28 Wensinck', '28Wensinck->28-space-Wensinck'],
  // "53Cf." -> "53 Cf." (Ch10 idx380 — only occurrence; same footnote line
  // bibliography format — "52 'Doctrina...' 53 Cf. William Law" should
  // have a space after the footnote number)
  [/\b53Cf\./g, '53 Cf.', '53Cf->53-space-Cf'],

  // ---- Chapter-head drop-cap: title runs into body, drop-cap letter lost ----
  // Each chapter's first paragraph starts with the section heading (no
  // separator) immediately followed by the body text minus its first letter,
  // which was rendered as a large drop-cap and dropped by OCR. We restore
  // the missing capital and insert a newline between heading and body.
  // The phrases are unique because they contain both the title and the first
  // few body words.

  // Ch0 (Chapter 2 / "The Divine Darkness"): drop-cap "T" lost from "The"
  [/^The Divine Darkness he problem of the knowledge of God\b/m,
    'The Divine Darkness\nThe problem of the knowledge of God',
    'ch2-droptcap-T-The-problem'],
  // Ch1 (Chapter 3 / "God in Trinity"): drop-cap "T" lost from "The"
  [/^God in Trinity he apophaticism characteristic\b/m,
    'God in Trinity\nThe apophaticism characteristic',
    'ch3-dropcap-T-The-apophaticism'],
  // Ch2 (Chapter 4 / "Uncreated Energies"): drop-cap "T" lost from "The"
  [/^Uncreated Energies he revelation of God\b/m,
    'Uncreated Energies\nThe revelation of God',
    'ch4-dropcap-T-The-revelation'],
  // Ch3 (Chapter 5 / "Created Being"): drop-cap "W" lost from "We"
  [/^Created Being e must now turn from\b/m,
    'Created Being\nWe must now turn from',
    'ch5-dropcap-W-We-must'],
  // Ch4 (Chapter 6 / "Image and Likeness"): drop-cap "I" lost from "If"
  [/^Image and Likeness f man contains within himself\b/m,
    'Image and Likeness\nIf man contains within himself',
    'ch6-dropcap-I-If-man'],
  // Ch5 (Chapter 7 / "The Economy of the Son"): drop-cap "I" lost from "In"
  [/^The Economy of the Son n our examination\b/m,
    'The Economy of the Son\nIn our examination',
    'ch7-dropcap-I-In-our'],
  // Ch6 (Chapter 8 / "The Economy of the Holy Spirit"): drop-cap "T" lost
  [/^The Economy of the Holy Spirit he Incarnation of the Word\b/m,
    'The Economy of the Holy Spirit\nThe Incarnation of the Word',
    'ch8-dropcap-T-The-Incarnation'],
  // Ch7 (Chapter 9 / "Two Aspects of the Church"): drop-cap "A" lost from "Although"
  [/^Two Aspects of the Church lthough the Son and the Holy Spirit\b/m,
    'Two Aspects of the Church\nAlthough the Son and the Holy Spirit',
    'ch9-dropcap-A-Although'],
  // Ch8 (Chapter 10 / "The Way of Union"): drop-cap "T" lost from "The"
  [/^The Way of Union he deification\b/m,
    'The Way of Union\nThe deification',
    'ch10-dropcap-T-The-deification'],
  // Ch9 (Chapter 11 / "The Divine Light"): drop-cap "U" lost from "Union"
  [/^The Divine Light nion with God is a mystery\b/m,
    'The Divine Light\nUnion with God is a mystery',
    'ch11-dropcap-U-Union'],
  // Ch10 (Chapter 12 / "Conclusion: The Feast of the Kingdom"): drop-cap "I" lost
  [/^Conclusion: The Feast of the Kingdom n our introduction\b/m,
    'Conclusion: The Feast of the Kingdom\nIn our introduction',
    'ch12-dropcap-I-In-our-introduction'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes -- only for unambiguous cases.
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
