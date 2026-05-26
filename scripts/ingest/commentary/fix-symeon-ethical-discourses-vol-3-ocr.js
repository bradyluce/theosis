#!/usr/bin/env node
/**
 * One-off OCR cleanup for the SVS Press Popular Patristics 16 ed. of
 * St Symeon the New Theologian, "On the Mystical Life: The Ethical
 * Discourses, Volume 3" (intro/trans/notes by Alexander Golitzin, 1997),
 * scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/symeon-ethical-discourses-vol-3.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary (theoria, theosis, nous, hesychia, parresia, etc.),
 * Greek/Latin/French citations, Migne column refs (PG/PL XYZ.123A-456B,
 * "ff" = "and following"), scholarly abbreviations (Civ.Dei, Adv.Haer.,
 * Eccl.Hier., Myst.Theo., Asc.Hom., etc.), Scripture references, and
 * digits in citations are preserved.
 *
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries / unique anchor phrases so re-running
 * is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/symeon-ethical-discourses-vol-3.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or anchored to unique context.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Common single-word misspellings (each appears at most twice) ----
  // "drunkeness" → "drunkenness"  (#171 — "imagery of wine and drunkeness for
  // the experience of God"; standard English spelling has double n)
  [/\bdrunkeness\b/g, 'drunkenness', 'drunkeness->drunkenness'],
  // "millenium" → "millennium" (#24 "over a millenium if we take Augustus";
  // #92 "great dogmas affirmed by the Councils of the first millenium" —
  // both clearly want the double-n English noun)
  [/\bmillenium\b/g, 'millennium', 'millenium->millennium'],

  // ---- Proper-noun OCR errors ----
  // "Krivochiene" → "Krivocheine"  (#310 — single occurrence; the surname
  // appears 38× elsewhere in the same document as "Krivocheine", the
  // correct transliteration of Bishop Basil Krivocheine)
  [/\bKrivochiene\b/g, 'Krivocheine', 'Krivochiene->Krivocheine'],
  // "Velichkovksy" → "Velichkovsky" (#458 — index entry "St Paissy
  // Velichkovksy"; consonant-cluster k/v transposed. Single occurrence.)
  [/\bVelichkovksy\b/g, 'Velichkovsky', 'Velichkovksy->Velichkovsky'],
  // "Golitzen, Et Introibo" → "Golitzin, Et Introibo"  (3 paragraphs, 4
  // occurrences — all in citations of the book by Alexander Golitzin
  // [the volume's translator and the author of Et Introibo ad Altare Dei].
  // The correct spelling "Golitzin" appears 3× elsewhere in the same doc
  // [title page, cataloging line, bibliography entry]. Restricted to the
  // exact "Golitzen, Et Introibo" / "Golitzen, Et Introibo," phrase so no
  // other proper-noun match is risked.)
  [/\bGolitzen, Et Introibo\b/g, 'Golitzin, Et Introibo', 'Golitzen-Et-Introibo->Golitzin'],
  // "A. Golitzen" → "A. Golitzin" (#214 — same author, first attribution)
  [/\bA\. Golitzen\b/g, 'A. Golitzin', 'A-Golitzen->A-Golitzin'],

  // ---- Hyphenated/compound English broken or run together ----
  // "twentiethcentury" → "twentieth-century"  (#14 "even a twentiethcentury
  // and not uncritical Roman Catholic scholar" — adjectival compound; the
  // hyphenated form is the prevailing convention in this translator/series)
  [/\btwentiethcentury\b/g, 'twentieth-century', 'twentiethcentury->twentieth-century'],

  // ---- Footnote-number stuck to next word (digit+lowercase) ----
  // "draws53and" → "draws and"  (#124 — footnote marker 53 absorbed into
  // sentence boundary. Stripping the digit is the correct call here because
  // the original superscript footnote ref is non-recoverable from OCR and
  // leaving "53" in place breaks the prose. Restricted to the exact 6-char
  // token so no legitimate text can match.)
  [/\bdraws53and\b/g, 'draws and', 'draws53and->draws-and'],
  // "water42and" → "water and"  (#162 — same pattern; footnote marker 42
  // absorbed into "and". Single occurrence; exact-token match.)
  [/\bwater42and\b/g, 'water and', 'water42and->water-and'],

  // ---- Footnote-number stuck to start of next sentence (digit+Capital) ----
  // "intimate.”21Rapture" → "intimate.” 21 Rapture is the beginning…"
  // — for these we strip the footnote number (non-recoverable) and insert a
  // single space so the next sentence starts cleanly.
  // (#159 — closing quote + footnote 21 + sentence-initial "Rapture")
  [/\bintimate\.”21Rapture\b/g, 'intimate.” Rapture', 'intimate-21Rapture->intimate-Rapture'],
  // "alone.50While" — "soul alone.50While known most intimately…" (#162)
  [/\bsoul alone\.50While\b/g, 'soul alone. While', 'alone-50While->alone-While'],
  // "light.105Abba" — "reflecting its light.105Abba Sisoes dies…" (#179)
  [/\bits light\.105Abba\b/g, 'its light. Abba', 'light-105Abba->light-Abba'],
  // "echoes him.124Concerning" — "Symeon so often echoes him.124Concerning
  // the knowledge that comes from God" (#180)
  [/\bechoes him\.124Concerning\b/g, 'echoes him. Concerning', 'him-124Concerning->him-Concerning'],

  // ---- Scripture-reference OCR error: 2 Cor 12:24 → 12:2-4 ----
  // (#332 — Palamas appealing to "II Corinthians 12:24 as his proof text"
  // for Paul's rapture to the third heaven. The Pauline passage is 2 Cor
  // 12:2-4, not 12:24. 2 Cor 12 has 21 verses but "12:24" cannot be the
  // proof text for the third-heaven episode. The hyphen was dropped in OCR.)
  [/\bII Corinthians 12:24\b/g, 'II Corinthians 12:2-4', 'IICor-12-24->IICor-12-2-4'],

  // ---- "sun or righteousness" → "sun of righteousness" (Mal 4:2) ----
  // (#288 — "commanded to possess 'the sun or righteousness shining within
  // us'". The biblical phrase is "Sun of righteousness" [Mal 4:2 LXX/MT].
  // The correct phrase "sun of righteousness" appears at P137 in the same
  // bundle. OCR f→r swap on the small word "of".)
  [/\bsun or righteousness\b/g, 'sun of righteousness', 'sun-or-righteousness->sun-of-righteousness'],

  // ---- Doubled period after page-range citation ----
  // "436-451.. In Trans" → "436-451. In Trans" (#220 — only doubled-period
  // occurrence in the document; sits between a closing page-range and the
  // start of the next citation sentence.)
  [/\b436-451\.\. In Trans\b/g, '436-451. In Trans', 'doublepd-436-451->single'],

  // ---- Citation page-range OCR errors (missing hyphen between numbers) ----
  // These all appear in footnote sequences; each is a unique exact-token match.
  // "H 1.4245" → "H 1.42-45"  (#96 — Hymn 1, lines 42-45)
  [/\bH 1\.4245\b/g, 'H 1.42-45', 'H1-4245->H1-42-45'],
  // "H 58.2531" → "H 58.25-31"  (#96 — Hymn 58, lines 25-31)
  [/\bH 58\.2531\b/g, 'H 58.25-31', 'H58-2531->H58-25-31'],
  // "H 34.1528" → "H 34.15-28"  (#97 — Hymn 34, lines 15-28)
  [/\bH 34\.1528\b/g, 'H 34.15-28', 'H34-1528->H34-15-28'],
  // "C 3.421426" → "C 3.421-426"  (#97 — Catechesis 3, lines 421-426)
  [/\bC 3\.421426\b/g, 'C 3.421-426', 'C3-421426->C3-421-426'],
  // "Vie XIV.131132" → "Vie XIV.131-132"  (#97 — Hausherr's Vie)
  [/\bVie XIV\.131132\b/g, 'Vie XIV.131-132', 'Vie-131132->Vie-131-132'],
  // "XIV.137140" → "XIV.137-140"  (#97 — same Vie, same paragraph)
  [/\bXIV\.137140\b/g, 'XIV.137-140', 'XIV-137140->XIV-137-140'],
  // "Praxis, 97111" → "Praxis, 97-111"  (#141 — Völker's Praxis)
  [/\bPraxis, 97111\b/g, 'Praxis, 97-111', 'Praxis-97111->Praxis-97-111'],
  // "Mémoires V (1973): 313327" → "Mémoires V (1973): 313-327"  (#97 —
  // single-occurrence page range in journal citation; also restored at
  // P417 already correctly as "313-327")
  [/\(1973\): 313327\b/g, '(1973): 313-327', '1973-313327->1973-313-327'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No glyph fixes beyond the wordFixes above for this corpus.
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
console.log(
  'Sample before/after pairs (showing ' +
    Math.min(showCount, samples.length) +
    ' of ' +
    samples.length +
    '):'
);
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  let diffStart = 0;
  while (
    diffStart < before.length &&
    diffStart < after.length &&
    before[diffStart] === after[diffStart]
  )
    diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before
    .slice(ctxStart, diffStart + 100)
    .replace(/\n/g, '\\n');
  const afterSnippet = after
    .slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100)
    .replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log(
  'Distinct rule firings (' +
    samples.reduce((n, s) => n + s[4].length, 0) +
    ' total):'
);
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
