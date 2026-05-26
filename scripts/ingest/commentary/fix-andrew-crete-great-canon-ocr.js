#!/usr/bin/env node
/**
 * One-off OCR cleanup for the English ed. of St. Andrew of Crete's
 * "The Great Canon" — a Lenten penitential canon sung at Great Compline.
 *
 * Reads content/generated/commentary/andrew-crete-great-canon.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Source quality is generally very good (Tier-1 universal cleaner already
 * caught the bulk). What remains are a couple of surgical punctuation fixes
 * where two distinct liturgical units were joined without a sentence break.
 *
 * Deliberately PRESERVED (not touched):
 *   - Stress-mark diacritics on hymn words ("Divínely", "Sávior", "compléte",
 *     "mércy", "Theotókos", etc. in paras 634-637) — these are intentional
 *     chant accents in sessional hymns by Joseph the Hymnographer.
 *   - "blessèd" / "All-blessèd" / "Most-belovèd" — grave-accent on -ed
 *     marks the syllabic pronunciation in archaic English.
 *   - Small-caps formatting splits like "G REAT", "C ANON", "P SALM",
 *     "S EDALEN", "T ROPARION" — these are OCR renderings of small-caps in
 *     rubric headers; not textual errors, just typographical artifacts that
 *     the user reads through. Risk of broken matches outweighs benefit.
 *   - All Old Testament proper names (Dathan, Abiram, Manasseh, Ahab, Elijah,
 *     Tishbite, Zarephath, Jezebel, Jannes, Jambres, Hophni, Phineas, Ham,
 *     Shem, Japheth, Reuben, etc.) — many obscure, none misread.
 *   - Archaic English verb endings (-eth, -est), pronouns (thou/thee/thy),
 *     and service-book interjections ("O God", "O my soul", "Refrain:").
 *
 * Each rule is conservative — applies only where the pattern is unambiguous
 * and observed in the actual text.  Idempotent: word-bounded / exact-string
 * patterns make re-runs a no-op.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/andrew-crete-great-canon.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word/phrase-level OCR corrections. Each entry is a verified misread observed
// in the source. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are exact-phrase or word-bounded so legitimate text never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Spurious "for;" after "in sin" — duplicated troparion (paras 314, 711) ----
  // Original troparion: "I see that I have surpassed all men in sin, for I have
  // sinned not in ignorance, but consciously, and with understanding."
  // The OCR dropped the comma after "sin" and replaced the comma after "for"
  // with a semicolon, producing the meaningless "sin for;". The same troparion
  // appears twice in the canon (once on Monday, once on Thursday); both copies
  // have the identical error. Restricting to this exact 6-word context so the
  // word "for" elsewhere is never affected.
  [/\bin sin for; I have sinned\b/g, 'in sin, for I have sinned', 'sin-for-semi->sin-comma-for'],

  // ---- Missing sentence break before "Theotokion:" (paras 268, 566) ----
  // The line "Most Holy Theotokos, save us." is a standalone refrain that
  // appears 6× elsewhere in the canon (paras 600, 643, 841, 900, and 268/566
  // post-fix). In two paragraphs the OCR ran it straight into the following
  // Theotokion troparion: "Most Holy Theotokos, save us Theotokion: O Most-
  // pure Theotokos and All-laudable Virgin, fervently intercede for our
  // salvation." Insert the missing period + space so the refrain ends and
  // the Theotokion prefix begins cleanly (matches the layout used 42× elsewhere
  // for "Theotokion: ..." lines). Restricting to the exact 9-word context so
  // no other "save us" phrase is affected.
  [/\bMost Holy Theotokos, save us Theotokion:/g, 'Most Holy Theotokos, save us. Theotokion:', 'save-us-Theotokion-join->period-Theotokion'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No glyph-level fixes needed beyond the wordFixes above. The text uses
  // smart quotes (' ' ‘ ’) and chant accents consistently.
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
