#!/usr/bin/env node
/**
 * One-off OCR cleanup for the English edition of St. Peter Mogila (Mohila),
 * "The Orthodox Confession of Faith" — 17th-c. Kyivan symbolic-confessional
 * text in question/answer (Q./R.) catechism format.
 *
 * Reads content/generated/commentary/mogila-confession.json, applies targeted
 * OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * The text is heavy with intentional Latin (Mogila Westernized parts of his
 * theology — "filioque", "Quicunque", "Textus Receptus", "in inferna", PG
 * citations, Vulgate forms), archaic English, "Mohila" spelling (deliberate
 * editorial choice in this edition), and Scripture references in shorthand.
 * Those are preserved.
 *
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/mogila-confession.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-anchored so legitimate text never
// matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---------------------------------------------------------------------
  // Footnote reference brackets where lowercase l was OCR'd for digit 1
  // (Postscript "l" glyph identical to "1" in many serif fonts).
  // ---------------------------------------------------------------------
  // "[l01]" → "[101]" through "[l99]" → "[199]" (ch1 paragraphs 32, 34, 37,
  // 44 all have footnote markers like [l01], [l06], [l09], [l30]). Pattern is
  // restricted to bracketed footnote markers so legitimate "[la]" cannot fire.
  [/\[l(\d{1,2})\]/g, '[1$1]', 'bracket-l-digit->bracket-1-digit'],
  // "[l]" → "[1]"  (ch2 p0 — footnote marker for note [1] after "great
  // reward."; the immediately following marker is "[2]" so this is footnote
  // number 1.)
  [/\[l\]/g, '[1]', 'bracket-l->bracket-1'],
  // Same misread in bracketed "[4l]" — footnote 41 between [40] and [42].
  // (ch3 footnote list, between "Matt 8:20 [4l] I Cor 6:18" and "[42]").
  [/\[4l\]/g, '[41]', 'bracket-4l->bracket-41'],

  // ---------------------------------------------------------------------
  // Scripture-reference shorthand OCR errors (ch0/ch1/ch2 footnote dumps).
  // The same edition uses "I Cor", "I Thess", "II Tim" consistently — these
  // three lone exceptions are clearly broken-space / l-vs-I scans.
  // ---------------------------------------------------------------------
  // "ICor 7:2" → "I Cor 7:2"  (ch0 footnote [281]; the spaced form "I Cor"
  // appears 12+ times in the same footnote list)
  [/\bICor 7:2\b/g, 'I Cor 7:2', 'ICor->I-Cor'],
  // "IThess 5:17-18" → "I Thess 5:17-18"  (ch1 footnote [11]; "I Thess"
  // already appears immediately above at footnote [10] as "I Thess 5 :24")
  [/\bIThess 5:17-18\b/g, 'I Thess 5:17-18', 'IThess->I-Thess'],
  // "lI Tim 3:15" → "II Tim 3:15"  (ch0 footnote [226]; OCR read leading "I"
  // as lowercase "l". Same list uses "II Tim" elsewhere e.g. [102])
  [/\blI Tim 3:15\b/g, 'II Tim 3:15', 'lI-Tim->II-Tim'],

  // ---------------------------------------------------------------------
  // Word-internal letter swaps and broken spaces.
  // ---------------------------------------------------------------------
  // "MceneConstantinopolitan" → "Nicene-Constantinopolitan"  (ch1 footnote
  // (39) — "absent in the MceneConstantinopolitan and primitive Apostles'
  // Creeds". Standard term for the 381 Creed. Same OCR error "Mcene" also
  // appears in "Post-Mcene Fathers" below — both M↔Ni swaps.)
  [/\bMceneConstantinopolitan\b/g, 'Nicene-Constantinopolitan', 'Mcene-Const->Nicene-Const'],
  // "Post-Mcene Fathers" → "Post-Nicene Fathers"  (ch3 footnote (7) — the
  // standard NPNF series title; "Nicene and Post-Nicene Fathers, Vol.14,
  // ed. H. R. Percival, Eerdmans, 1899")
  [/\bPost-Mcene Fathers\b/g, 'Post-Nicene Fathers', 'Post-Mcene->Post-Nicene'],

  // "Westem" → "Western"  (ch1 footnote (50) — "The Westem version carries
  // the 'filioque'" — m↔rn OCR. "Western" appears 7+ times elsewhere in
  // same paragraph correctly spelled.)
  [/\bWestem\b/g, 'Western', 'Westem->Western'],

  // "fomm" → "form"  (ch1 footnote (65) — "These letters fomm one of the
  // 'Symbolical Books'" — mm↔rm OCR; "form" is the only sensible reading.)
  [/\b letters fomm one\b/g, ' letters form one', 'fomm->form'],

  // "Hoary. in Sanctum Sabbatum" → "Hom. in Sanctum Sabbatum"  (ch1 footnote
  // (38) — Latin "Hom." (Homily) misread; the very next sentence references
  // "Homily on Holy Saturday" — same work. "Hoary" is OCR noise for "Hom".)
  [/\bHoary\. in Sanctum Sabbatum\b/g, 'Hom. in Sanctum Sabbatum', 'Hoary->Hom-Latin'],

  // "computation af the commandments" → "computation of the commandments"
  // (ch3 footnote (6) — single OCR letter swap a↔o; "computation of" is the
  // unambiguous reading.)
  [/\bcomputation af the commandments\b/g, 'computation of the commandments', 'af->of'],

  // "wordly pleasures" → "worldly pleasures"  (ch3 p6 Q. 7 on fasting — the
  // missing "l" in "worldly" is a clean OCR drop; "worldly" elsewhere e.g.
  // "wisdom and worldly" in ch0.)
  [/\bwordly pleasures\b/g, 'worldly pleasures', 'wordly->worldly'],

  // "covet ousness" → "covetousness"  (ch3 p22 Q. 26 — broken-space OCR;
  // immediately preceding sentence uses "covetousness" correctly: "He that
  // hates covetousness, shall prolong his days.")
  [/\bcovet ousness\b/g, 'covetousness', 'covet-ousness->covetousness'],

  // "orthodoxcatholic" → "orthodox-catholic"  (ch1 p0 Q. 4 — first occurrence
  // dropped the hyphen; "orthodox-catholic" appears 20+ times in the same
  // text consistently hyphenated. There is also the spaced variant
  // "orthodox- catholic" with stray space — handled below.)
  [/\borthodoxcatholic\b/g, 'orthodox-catholic', 'orthodoxcatholic->orthodox-catholic'],
  // "orthodox- catholic" → "orthodox-catholic"  (3 occurrences across ch1
  // paragraphs 0, 96, 103 — hyphen followed by stray space)
  [/\borthodox- catholic\b/g, 'orthodox-catholic', 'orthodox-space-catholic->orthodox-catholic'],

  // "the H oly" / "and H oly" → "the Holy" / "and Holy"  (3 occurrences in
  // ch1 paragraphs 5, 6, 8 — OCR inserted stray space in capitalised "Holy".
  // Hundreds of correct "Holy" elsewhere; restricted to the H followed by
  // " oly" pattern to avoid any false positive.)
  [/\bH oly\b/g, 'Holy', 'H-oly->Holy'],

  // "lhe Ms. margin" → "The Ms. margin"  (ch2 footnote (14) — "lhe" is OCR
  // of "The" — l↔T, h↔h, e↔e. The same paragraph uses "The Ms." many times
  // correctly; restricted to "lhe Ms." to avoid hitting any other token.)
  [/\blhe Ms\. margin\b/g, 'The Ms. margin', 'lhe-Ms->The-Ms'],

  // "Ar-d whosoever" → "And whosoever"  (ch3 p42 — quoting Matt 5:22; OCR
  // misread "An" as "Ar" plus a stray hyphen. The Vulgate/D-R reads "And
  // whosoever shall say to his brother 'Raca'…")
  [/\bAr-d whosoever\b/g, 'And whosoever', 'Ar-d->And'],

  // "posses even all" → "possess even all"  (ch2 p62 — "whoever truly
  // possesses one virtue, will posses even all the others"; previous clause
  // uses "possesses", this one dropped the final s. "posses" is not a word.)
  [/\bwill posses even all\b/g, 'will possess even all', 'posses->possess'],

  // "Many Sins are forgiven her" → "Many sins are forgiven her"  (ch1 p58 —
  // Scripture quotation from Luke 7:47; "sins" is lowercase in the Douay-Rheims
  // and in every other occurrence in this text. OCR over-capitalised here.)
  [/\b"Many Sins are forgiven her\b/g, '"Many sins are forgiven her', 'Many-Sins->Many-sins'],

  // "coessential" → "co-essential"  (ch1 p5 and p32 — "co-essential" with
  // hyphen appears 8 times elsewhere as the editor's consistent style; these
  // two unhyphenated forms are OCR drops of the hyphen.)
  [/\bcoessential\b/g, 'co-essential', 'coessential->co-essential'],

  // ---------------------------------------------------------------------
  // Punctuation / glyph fixes.
  // ---------------------------------------------------------------------

  // Em-dash OCR'd as low double quote "„" — three contexts: between letters
  // and after a word it acts as an em-dash. The character U+201E is sprinkled
  // throughout (18 occurrences in 5 paragraphs) clearly in place of em-dashes
  // (e.g. "salvation„then we will receive"). Replace with a real em-dash.
  [/„/g, '—', 'low-doublequote->em-dash'],

  // "paraphraseÑR.P." → "paraphrase—R.P."  (ch1 p0 footnote [209] — "Ñ"
  // (U+00D1) is OCR for em-dash before editor's initials. Phrase-anchored
  // so no other Ñ in the corpus is affected.)
  [/\bparaphraseÑR\.P\.\)/g, 'paraphrase—R.P.)', 'paraphrase-N-tilde->paraphrase-emdash'],

  // Doubled single quotes acting as a close double-quote before a footnote
  // bracket — five very specific contexts in body text where the OCR rendered
  // closing " as '' (two apostrophes).
  // "mansions.''[152]" → 'mansions."[152]'   (ch1 p58)
  [/\bmansions\.''\[152\]/g, 'mansions."[152]', 'doubled-single->double-mansions'],
  // "his works.''[154]" → 'his works."[154]'   (ch1 p58)
  [/\bhis works\.''\[154\]/g, 'his works."[154]', 'doubled-single->double-works154'],
  // "great reward.'' [l]" → 'great reward." [1]'   (ch2 p0 footnote [1] —
  // note [l] also gets fixed by the bracket-l-digit rule above; this rule
  // fires first if reordered, so we use the post-bracket-fix target [1] here.)
  [/\bgreat reward\.'' \[1\]/g, 'great reward." [1]', 'doubled-single->double-reward'],
  // "will do it.'' [10]" → 'will do it." [10]'   (ch2 p2)
  [/\bwill do it\.'' \[10\]/g, 'will do it." [10]', 'doubled-single->double-doit'],
  // "higher powers.'' [106]" → 'higher powers." [106]'   (ch3 p57)
  [/\bhigher powers\.'' \[106\]/g, 'higher powers." [106]', 'doubled-single->double-powers'],

  // "(\"gloriam et laudem'')" → '("gloriam et laudem")'  (ch1 p0 footnote
  // (45) — Latin quotation, closing quote rendered as doubled single)
  [/laudem''\)/g, 'laudem")', 'laudem-doublesingle->laudem-doublequote'],

  // "''filioque''in" → '"filioque" in'  (ch1 p0 footnote (51) — doubled
  // singles for open and close quote, plus missing space before "in".
  // Phrase-anchored.)
  [/''filioque''in Western Europe\b/g, '"filioque" in Western Europe', 'doubled-single-filioque-in'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
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
