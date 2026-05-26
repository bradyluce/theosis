#!/usr/bin/env node
/**
 * One-off OCR cleanup for St. John Climacus, The Ladder of Divine Ascent
 * (Lazarus Moore tr., Holy Transfiguration Monastery), scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/climacus-ladder.json, applies targeted
 * OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek words, archaic English (thou/thee/-eth/-est),
 * Scripture references, numbered aphorisms, and footnote markers are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/climacus-ladder.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or fully phrase-anchored so legitimate English
// and footnote markers never match.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- "1" misread for letter "l" inside a word ----
  // "invo1untary" → "involuntary"  (Step 15, para 74 — single occurrence in corpus,
  // OCR of "involuntary rape of the heart" — the 1 between vowel and "u" is clearly an "l")
  [/\binvo1untary\b/g, 'involuntary', 'invo1untary->involuntary'],

  // ---- Word-split artefacts at column edges / justification ----
  // "her self" → "herself"  (Step 8, para 33 — "ask her in due time her self." —
  // 1 occurrence of this split vs 4 "herself" elsewhere; pronoun reading is clear)
  [/\bin due time her self\b/g, 'in due time herself', 'her-self->herself'],
  // "some times" → "sometimes"  (3 occurrences, all clearly adverbial. The
  // separate noun reading "some times" makes no sense in any of the three contexts:
  // "even some times even expulsion", "and some times penitent", and a third —
  // the corpus uses "sometimes" 80+ times. Restricted by adjoining words.)
  [/\band some times even\b/g, 'and sometimes even', 'and-some-times-even->and-sometimes-even'],
  [/\band some times penitent\b/g, 'and sometimes penitent', 'and-some-times-penitent->and-sometimes-penitent'],
  [/\bcan some times be seen\b/g, 'can sometimes be seen', 'can-some-times-be-seen->can-sometimes-be-seen'],
  // "in difference" → "indifference"  (Step 27 para 48 — "a heart without
  // compunction which in the negligent is followed by in difference, the mother
  // of devils and falls". "Indifference, the mother of devils" is the unambiguous
  // reading; "in different MSS" and "in disposition" remain correct elsewhere.)
  [/\bfollowed by in difference\b/g, 'followed by indifference', 'in-difference->indifference'],

  // ---- "self" prefix run-together (missing hyphen) ----
  // The translation hyphenates self- consistently (self-condemned/control/will/etc.,
  // 35+ hyphenated occurrences). These four are unambiguous OCR drops of the
  // hyphen since each has the hyphenated cognate already in the corpus.
  // "selfcondemning" → "self-condemning"  (Step 5 — cf. "self-condemned" used
  // for the same idea in a footnote)
  [/\bselfcondemning\b/g, 'self-condemning', 'selfcondemning->self-condemning'],
  // "selfcontradictory" → "self-contradictory"  (Step 18 para 4)
  [/\bselfcontradictory\b/g, 'self-contradictory', 'selfcontradictory->self-contradictory'],
  // "selfdefence" → "self-defence"  (Step 10 — "doing so out of love and care")
  [/\bselfdefence\b/g, 'self-defence', 'selfdefence->self-defence'],
  // "selflove" → "self-love"  (Step 23 — note: hyphenated "self-love" exists once
  // elsewhere in the corpus, confirming the convention)
  [/\bselflove\b/g, 'self-love', 'selflove->self-love'],

  // ---- Run-together page-break artefact ----
  // "St. John Xlii, 35" → "St. John xiii, 35"  (John 13:35 — "By this shall all
  // men know that ye are my disciples, if ye have love one to another". OCR
  // misread `xiii` as `Xlii` — capital X for x, l for i. The corpus uses
  // lowercase roman numerals for chapters; this is the only "Xlii" in the file.)
  [/\bSt\. John Xlii,/g, 'St. John xiii,', 'St-John-Xlii->St-John-xiii'],

  // ---- Roman-numeral chapter, letter-instead-of-digit verse number ----
  // Scripture refs in this translation are `Book <lc-roman-ch>, <arabic-verse>.`
  // The following are confirmed misreads where the verse digit was OCR'd as a
  // similarly-shaped letter. Each is the only occurrence of its pattern in
  // the file (verified via grep), and the verse identification is unambiguous.
  // "Psalm cxxxii, x." → "Psalm cxxxii, 1." — Ps 132:1 LXX / 133:1 MT,
  // "Behold, what is good ... brethren should dwell together in unity" — quoted
  // verbatim in the same paragraph (Step 4 para 36, footnote 3).
  [/\bPsalm cxxxii, x\./g, 'Psalm cxxxii, 1.', 'cxxxii-x->cxxxii-1'],
  // "Romans ii, II" → "Romans ii, 11" — Rom 2:11 "no respect of persons with
  // God" (Step 1 para 4, footnote 3 — paired with "Cf. Romans i, 18" in next fn).
  [/\bRomans ii, II(?!\w)/g, 'Romans ii, 11', 'Romans-ii-II->Romans-ii-11'],
  // "St. Matthew xi, Il" → "St. Matthew xi, 11" — Matt 11:11/12 area, paired
  // with "St. Luke xvi, i6" in the same footnote (Step 15 para 50, footnote 2).
  [/\bMatthew xi, Il(?!\w)/g, 'Matthew xi, 11', 'Matthew-xi-Il->Matthew-xi-11'],
  // "St. Luke xvi, i6" → "St. Luke xvi, 16" — same footnote as above.
  [/\bLuke xvi, i6\b/g, 'Luke xvi, 16', 'Luke-xvi-i6->Luke-xvi-16'],
  // "St. Luke xviii, i—8" → "St. Luke xviii, 1—8" — Luke 18:1-8 the parable of
  // the persistent widow (Step 28 para 64, footnote 4 — "the widow who was
  // wronged by her adversary").
  [/\bLuke xviii, i—8\b/g, 'Luke xviii, 1—8', 'Luke-xviii-i-8->Luke-xviii-1-8'],
  // "Job xiii, I." → "Job xiii, 1." — Step 4 para 99, footnote 1, single occurrence.
  [/\bJob xiii, I\./g, 'Job xiii, 1.', 'Job-xiii-I->Job-xiii-1'],
  // "Job xiv, ii." → "Job xiv, 11." — Step 7 para 25 footnote 1 (about "apple
  // of your eye" / tears guarded). Verses are arabic everywhere else; this is
  // the only "Job xiv, ii" in the file.
  [/\bJob xiv, ii\./g, 'Job xiv, 11.', 'Job-xiv-ii->Job-xiv-11'],
  // "Ecclesiasticus xx, iS." → "Ecclesiasticus xx, 18." — Step 11 para 10 footnote
  // 3; "iS" is OCR of "18" (1 → i, 8 → S). Single occurrence.
  [/\bEcclesiasticus xx, iS\./g, 'Ecclesiasticus xx, 18.', 'Ecclesiasticus-iS->Ecclesiasticus-18'],
];

// ---------------------------------------------------------------------------
// Paragraph-prefix fixes — leading stray page numbers that survived the
// Tier-1 cleaner. The cleaner stripped only numbers followed by ". ", but
// some paragraphs start with a bare page number + space + word (no period).
// Real aphorisms always use "N. " (with period). The form "N <word>" (no
// period) is therefore unambiguous page-number pollution.
// ---------------------------------------------------------------------------
const prefixFixes = [
  // ---- Bare numeric prefix with no period — stray running page number ----
  // Matches text that starts with 1-3 digits, a space, then a lowercase letter
  // (continuation of a wrapped sentence — never the start of an aphorism, since
  // aphorisms begin with a capital). Verified there are 51 such cases in the file
  // and zero of them are aphorism starts (aphorisms always have ". ").
  [/^([0-9]{1,3}) ([a-z])/m, '$2', 'strip-leading-page-num-lc'],
  // ---- Bare numeric prefix with capital — only for verified pollution cases ----
  // For cap starts we restrict to the six known polluted paragraph beginnings so
  // we don't accidentally strip a real aphorism number. Each has been confirmed
  // by surrounding context (step-closer, section-title, or mid-sentence continuation
  // that picks up the previous paragraph mid-thought).
  [/^11 these two virtues,/m, 'these two virtues,', 'strip-11-these-two-virtues'],
  [/^17 About Macedonius the archdeacon$/m, 'About Macedonius the archdeacon', 'strip-17-About-Macedonius'],
  [/^30 Others groaned/m, 'Others groaned', 'strip-30-Others-groaned'],
  [/^44 This is the seventh step\./m, 'This is the seventh step.', 'strip-44-This-is-the-seventh-step'],
  [/^70 Some entice the mind/m, 'Some entice the mind', 'strip-70-Some-entice'],
  [/^79 There is only one thing/m, 'There is only one thing', 'strip-79-There-is-only-one-thing'],
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
      for (const [re, repl, name] of prefixFixes) {
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
