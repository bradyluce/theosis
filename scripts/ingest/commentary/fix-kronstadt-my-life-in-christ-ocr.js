#!/usr/bin/env node
/**
 * One-off OCR cleanup for St. John of Kronstadt, "My Life in Christ"
 * (Goulaeff translation, CCEL public-domain edition), scanned/text-extracted.
 *
 * Reads content/generated/commentary/kronstadt-my-life-in-christ.json, applies
 * targeted corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Slavonic transliterations, archaic English
 * (-eth/-est, thou/thee/thy), Scripture references, and digits are preserved.
 * The Goulaeff style uses "--" as em-dash and "---" / "—-" as variant em-dashes;
 * those are LEFT ALONE.
 *
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/kronstadt-my-life-in-christ.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or punctuation-anchored.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Page-break split words: residual digit stuck in the middle of a word ----
  // The Tier-1 cleaner stripped most page numbers, but for ~20 cases the page
  // number was embedded in the middle of a word that was split at a line break
  // (e.g. "en65 emies" was originally "ene[PB:65]mies" → "enemies"). Each
  // pattern is unique in the document and only matches the exact split.
  //
  // ch1 p180: "enlightened96 is" → "enlightened is" (96 = page marker)
  [/\benlightened96 is\b/g, 'enlightened is', 'pb-enlightened96'],
  // ch1 p244: "en65 emies" → "enemies"
  [/\ben65 emies\b/g, 'enemies', 'pb-en65emies'],
  // ch1 p282: "lamb168 there" → "lamb there"
  [/\blamb168 there\b/g, 'lamb there', 'pb-lamb168'],
  // ch1 p635: "life406 for" → "life for"
  [/\blife406 for\b/g, 'life for', 'pb-life406'],
  // ch1 p812: "or223 dinary" → "ordinary"
  [/\bor223 dinary\b/g, 'ordinary', 'pb-or223dinary'],
  // ch1 p829: "spir226 it" → "spirit"
  [/\bspir226 it\b/g, 'spirit', 'pb-spir226it'],
  // ch2 p202: "light123 in" → "light in"
  [/\blight123 in\b/g, 'light in', 'pb-light123'],
  // ch2 p258: "re341 ceiveth" → "receiveth"
  [/\bre341 ceiveth\b/g, 'receiveth', 'pb-re341ceiveth'],
  // ch2 p278: "vi347 olence" → "violence"
  [/\bvi347 olence\b/g, 'violence', 'pb-vi347olence'],
  // ch2 p348: "separ367 ation" → "separation"
  [/\bsepar367 ation\b/g, 'separation', 'pb-separ367ation'],
  // ch2 p371: "hy374 pocritically" → "hypocritically"
  [/\bhy374 pocritically\b/g, 'hypocritically', 'pb-hy374pocritically'],
  // ch2 p475: "accom404 plishing" → "accomplishing"
  [/\baccom404 plishing\b/g, 'accomplishing', 'pb-accom404plishing'],
  // ch2 p493: "dis409 turbance" → "disturbance"
  [/\bdis409 turbance\b/g, 'disturbance', 'pb-dis409turbance'],
  // ch2 p618: "some442 times" → "sometimes"
  [/\bsome442 times\b/g, 'sometimes', 'pb-some442times'],
  // ch2 p704: "you470 are" → "you are"
  [/\byou470 are\b/g, 'you are', 'pb-you470are'],
  // ch2 p707: "servant473 in" → "servant in"
  [/\bservant473 in\b/g, 'servant in', 'pb-servant473in'],
  // ch2 p757: "under476 standing" → "understanding"
  [/\bunder476 standing\b/g, 'understanding', 'pb-under476standing'],
  // ch2 p860: "self500 love" → "self-love" (hyphenated elsewhere in same translation
  // 86×, e.g. "self-love" passim; pre-split was "self[PB:500]love")
  [/\bself500 love\b/g, 'self-love', 'pb-self500love'],
  // ch2 p868: "per501 sonal" → "personal"
  [/\bper501 sonal\b/g, 'personal', 'pb-per501sonal'],
  // ch2 p912: "en509 tering" → "entering"
  [/\ben509 tering\b/g, 'entering', 'pb-en509tering'],

  // ---- Hyphen-space line-break splits: word broken across a line ending in
  // a soft hyphen. Each pattern is checked to be unique in the bundle and the
  // re-joined form is the obvious English word.
  //
  // ch1 p224: "rare- fied" → "rarefied"
  [/\brare- fied\b/g, 'rarefied', 'hyph-rare-fied'],
  // ch1 p522: "corre- sponding" → "corresponding"
  [/\bcorre- sponding\b/g, 'corresponding', 'hyph-corre-sponding'],
  // ch1 p627: "plenteous- ness" → "plenteousness"
  [/\bplenteous- ness\b/g, 'plenteousness', 'hyph-plenteous-ness'],
  // ch2 p141: "our- selves" → "ourselves"
  [/\bour- selves\b/g, 'ourselves', 'hyph-our-selves'],
  // ch2 p618: "any- thing" → "anything"
  [/\bany- thing\b/g, 'anything', 'hyph-any-thing'],
  // ch2 p1025: "con- tinually" → "continually"
  [/\bcon- tinually\b/g, 'continually', 'hyph-con-tinually'],
  // ch2 p1060: "right- eousness" → "righteousness"
  [/\bright- eousness\b/g, 'righteousness', 'hyph-right-eousness'],

  // ---- Single-word OCR typos (verified unique misreads) ----
  // ch1 p296: "harmoninous" → "harmonious" (only occurrence; clear "n" duplication
  // before the suffix; "harmonious order" is the only sensible reading)
  [/\bharmoninous\b/g, 'harmonious', 'harmoninous->harmonious'],
  // ch1 p157: "counseller" → "counsellor" (only occurrence; standard British
  // spelling for "counsellor" — Goulaeff uses British orthography elsewhere,
  // e.g. "honour", "labour", "neighbour")
  [/\bcounseller\b/g, 'counsellor', 'counseller->counsellor'],
  // ch1 p407: "apparalled" → "apparelled" (only occurrence; "gorgeously apparelled
  // and living delicately" is a direct echo of Luke 7:25 KJV "gorgeously
  // apparelled". The intended British -elled spelling)
  [/\bgorgeously apparalled\b/g, 'gorgeously apparelled', 'apparalled->apparelled'],
  // ch2 p899: "at the fame time" → "at the same time" (only "fame time" in the
  // document; "fame" elsewhere is legitimate noun "fame"/"renown")
  [/\bat the fame time\b/g, 'at the same time', 'fame-time->same-time'],
  // ch1 p873: "moneyloving" → "money-loving" (only occurrence; the paragraph
  // explicitly contrasts "soul-loving" vs this — the original almost certainly
  // had the same hyphenation. Goulaeff hyphenates "soul-loving" 4× passim.)
  [/\bmoneyloving\b/g, 'money-loving', 'moneyloving->money-loving'],
  // ch1 p238: "onlybegotten" → "only-begotten" (only occurrence; same translation
  // uses "Only begotten" / "only-begotten" passim — this is a single run-together)
  [/\bonlybegotten Son\b/g, 'only-begotten Son', 'onlybegotten->only-begotten'],
  // ch1 p621: "soirée's" → "soirees" (only occurrence; an apostrophe was inserted
  // inside the word during OCR — neither a possessive nor a contraction makes
  // sense; the plural noun "soirees" is meant. Restricted to the unique form
  // "soirée's" to avoid touching legitimate French/curly apostrophe uses.)
  [/\bsoirée's\b/g, 'soirees', 'soirees-apos->soirees'],

  // ---- Footnote-marker digits glued to next sentence/word ----
  // Original print edition had superscript footnote numerals. In the text extract
  // they appear as inline digits, sometimes correctly followed by a space, but
  // 58× a sentence-initial capital letter immediately follows the digit with no
  // space, and 5× a lowercase trailing word follows the digit. Each fix below
  // adds the missing space after the footnote digit. The pattern requires
  // closing punctuation (' " . , ; : ! ?) BEFORE the digit so we only match
  // sentence/quote-boundary footnote markers and never legitimate Scripture
  // verse refs (which are formatted as "Psalm xvii. 15" — no preceding punctuation).
  //
  // Format: ["...",NNNCapital] → ["...",NNN Capital]
  [/(["'])([0-9]{1,3})([A-Z][a-z])/g, '$1$2 $3', 'footnote-quote-digit-Word'],
  // Format: [...,NNNlowercase] → [...,NNN lowercase]
  // Restricted to following a quote/punctuation to avoid legit "2nd", "3rd" etc.
  [/(["'])([0-9]{1,3})([a-z]{2,})/g, '$1$2 $3', 'footnote-quote-digit-word'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // ---- Stray bullet "•" injected mid-text ----
  // ch2 p258: '!•"' → '!"' (stray bullet between "vice!" and closing quote — a
  // bullet has no place between an exclamation and a quote; restricted to this
  // exact 3-char sequence so legitimate bullet punctuation is preserved)
  [/!•"/g, '!"', 'stray-bullet-after-bang'],
  // ch2 p276: "the • sacraments" → "the sacraments" (stray bullet between
  // "the" and "sacraments"; restricted to a bullet flanked by spaces and a
  // following lowercase word)
  [/ • sacraments\b/g, ' sacraments', 'stray-bullet-sacraments'],
  // ch2 p979: "of • useless sand" → "of useless sand" (same artefact)
  [/ • useless sand\b/g, ' useless sand', 'stray-bullet-useless'],

  // ---- Stray filled-square "■" injected before word ----
  // ch2 p981: "meeting ■with anyone" → "meeting with anyone" (■ replaces a
  // space; restricted to "■with" — the only filled-square in the document)
  [/ ■with anyone\b/g, ' with anyone', 'stray-square-with'],

  // ---- Stray degree-sign "°" replacing a space ----
  // ch2 p1017: "he is°not quite" → "he is not quite" (° replaces a space;
  // restricted to the exact "is°not" form — the only ° in the document)
  [/\bis°not\b/g, 'is not', 'stray-degree-is-not'],
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
