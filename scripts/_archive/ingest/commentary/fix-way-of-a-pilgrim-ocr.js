#!/usr/bin/env node
/**
 * One-off OCR cleanup for The Way of a Pilgrim (likely the Helen Bacovcin
 * translation, Image Books / Doubleday 1978 / 2013 reprint, scanned PDF → OCR text).
 *
 * Reads content/generated/commentary/way-of-a-pilgrim.json, applies targeted
 * OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Russian transliterations (starets, podvig, versts, Philokalia, etc.), Scripture
 * references, theological vocabulary, and archaic English are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/way-of-a-pilgrim.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or context-bound so legitimate English never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- "Afakist" → "Akathist" (4× in bundle) ----
  // OCR misread of Slavonic "Akafist" — k/f swap and dropped 'th'. The text's own
  // footnote 11 defines it as "Afakist--a liturgical hymn of praise in honor of
  // Christ, Mary, or the saints", which is the standard definition of Akathist.
  // Theosis convention elsewhere (andrew-crete-great-canon, brianchaninov-the-arena,
  // shevkunov-everyday-saints, constantinou-thinking-orthodox, rose-soul-after-death)
  // uses "Akathist" consistently.
  [/\bAfakist\b/g, 'Akathist', 'Afakist->Akathist'],
  [/\bafakists\b/g, 'Akathists', 'afakists->Akathists'],

  // ---- "Phabaid" → "Thebaid" (1× in bundle) ----
  // OCR misread "Th" as "Ph". The Thebaid is the Egyptian desert region famous for
  // early Christian hermits; "the hermit from Phabaid" is otherwise nonsensical.
  // "Phabaid" returns zero historical hits.
  [/\bfrom Phabaid\b/g, 'from the Thebaid', 'Phabaid->Thebaid'],

  // ---- Run-together hyphenated compounds (OCR dropped hyphens) ----
  // The translation uses hyphenated "self-X" forms ~40× across the bundle; a few
  // instances lost the hyphen. Each replacement is restricted to the run-together
  // spelling (which is not a standard English word) so legitimate text is untouched.
  // "selfactivating" → "self-activating" (4×, vs ~40 hyphenated occurrences)
  [/\bselfactivating\b/g, 'self-activating', 'selfactivating->self-activating'],
  // "selfdiscipline" → "self-discipline" (1×, vs hyphenated elsewhere)
  [/\bselfdiscipline\b/g, 'self-discipline', 'selfdiscipline->self-discipline'],
  // "selfknowledge" → "self-knowledge" (1×, vs hyphenated elsewhere)
  [/\bselfknowledge\b/g, 'self-knowledge', 'selfknowledge->self-knowledge'],
  // "selfrenunciation" → "self-renunciation" (1×, vs hyphenated elsewhere)
  [/\bselfrenunciation\b/g, 'self-renunciation', 'selfrenunciation->self-renunciation'],
  // "seriousminded" → "serious-minded" (1× — compound adjective conventionally hyphenated)
  [/\bseriousminded\b/g, 'serious-minded', 'seriousminded->serious-minded'],
  // "pleasureseeking" → "pleasure-seeking" (1× — compound adjective conventionally hyphenated)
  [/\bpleasureseeking\b/g, 'pleasure-seeking', 'pleasureseeking->pleasure-seeking'],
  // "pseudoenlightened" → "pseudo-enlightened" (1× — pseudo- prefix conventionally hyphenated)
  [/\bpseudoenlightened\b/g, 'pseudo-enlightened', 'pseudoenlightened->pseudo-enlightened'],

  // ---- "ABCS" → "ABCs" (1×) ----
  // Text is "constantly repeating the ABCS or scribbling on paper" — clear context
  // of children learning the alphabet. OCR uppercased the trailing plural s.
  [/\bABCS\b/g, 'ABCs', 'ABCS->ABCs'],

  // ---- Sentence-initial lowercase fixes (OCR dropped capital letter) ----
  // Stats across the bundle: 226 sentences after "!"/"?" start with capitals vs only
  // 8 with lowercase. Of 44 speaker labels (PILGRIM./ELDER./MONK./HERMIT./etc.) only
  // 2 are followed by lowercase. Each fix below is phrase-bounded.
  //
  // "PILGRIM. oh, how peaceful" → "PILGRIM. Oh, how peaceful" (Chapter 7 opening)
  [/\bPILGRIM\. oh, how peaceful\b/g, 'PILGRIM. Oh, how peaceful', 'PILGRIM-oh->PILGRIM-Oh'],
  // "HERMIT. one of the chief" → "HERMIT. One of the chief"
  [/\bHERMIT\. one of the chief\b/g, 'HERMIT. One of the chief', 'HERMIT-one->HERMIT-One'],

  // "Praise be to God! you have come" → "Praise be to God! You have come"
  // (dialog: monastic Superior greeting the pilgrim — addressing him directly)
  [/!\s+you have come just in time\b/g, '! You have come just in time', 'you-have-come->You-have-come'],
  // "Good man! since you have noticed" → "Good man! Since you have noticed"
  [/!\s+since you have noticed\b/g, '! Since you have noticed', 'since-you-have-noticed->Since-you-have-noticed'],
  // "But alas! even in the first step" → "But alas! Even in the first step"
  [/!\s+even in the first step\b/g, '! Even in the first step', 'even-in-first-step->Even-in-first-step'],
  // "do not worry! only continue to recite" → "do not worry! Only continue to recite"
  [/!\s+only continue to recite\b/g, '! Only continue to recite', 'only-continue->Only-continue'],
  // "in the beginning. observe the constancy" → "in the beginning. Observe the constancy"
  [/\.\s+observe the constancy of your prayer\b/g, '. Observe the constancy of your prayer', 'observe-the-constancy->Observe-the-constancy'],
  // "stimulating food? of course so that" → "stimulating food? Of course so that"
  [/\?\s+of course so that it would\b/g, '? Of course so that it would', 'of-course-so-that->Of-course-so-that'],
  // "darkness uses against us. out of the abundance" → ". Out of the abundance"
  [/\.\s+out of the abundance of their experience\b/g, '. Out of the abundance of their experience', 'out-of-the-abundance->Out-of-the-abundance'],
  // "to pray? one writer points out" → "to pray? One writer points out"
  [/\?\s+one writer points out that this example\b/g, '? One writer points out that this example', 'one-writer->One-writer'],
  // "depths of ourselves. only the interior life" → ". Only the interior life"
  [/\.\s+only the interior life is a truly Christian life\b/g, '. Only the interior life is a truly Christian life', 'only-the-interior->Only-the-interior'],
  // "reflects this glory. But alas! this unspeakable" → "! This unspeakable"
  [/!\s+this unspeakable and awesome glory\b/g, '! This unspeakable and awesome glory', 'this-unspeakable->This-unspeakable'],

  // ---- Numbered-list capitalization (in the elder's reading-order list) ----
  // The list is "1. the book of...; 2. the book of...; 3. Simeon the New Theologian...;
  // 4. the book of...". Item 3 is capitalized; items 1, 2, 4 lost the 'T' in OCR.
  // Restrict each fix to its exact phrase so we don't touch ordinary "1. the" elsewhere.
  [/\b1\. the book of Nicephorus\b/g, '1. The book of Nicephorus', 'list1-the->list1-The'],
  [/\b2\. the book of Gregory\b/g, '2. The book of Gregory', 'list2-the->list2-The'],
  [/\b4\. the book of Callistus\b/g, '4. The book of Callistus', 'list4-the->list4-The'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — none needed beyond word-level for this corpus.
// ---------------------------------------------------------------------------
const glyphFixes = [];

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
