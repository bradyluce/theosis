#!/usr/bin/env node
/**
 * One-off OCR cleanup for the SVS Press Popular Patristics 15 ed. of
 * St Symeon the New Theologian, "On the Mystical Life: The Ethical
 * Discourses, Volume 2: On Virtue and Christian Life" (intro/trans/notes
 * by Alexander Golitzin, 1996), scanned PDF -> OCR text.
 *
 * Reads content/generated/commentary/symeon-ethical-discourses-vol-2.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative -- applies only where the pattern is unambiguous.
 * Theological vocabulary (theoria, theosis, nous, hesychia, parresia,
 * apatheia, etc.), Greek/Latin/French citations, Migne column refs
 * (PG/PL XYZ.123A-456B), scholarly abbreviations (Or., Theo. Or., PG, deC,
 * Life of Antony, etc.), Scripture references, British spellings
 * ("judgement", "practise" as verb), and digits in citations are preserved.
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
  '../../../content/generated/commentary/symeon-ethical-discourses-vol-2.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or anchored to unique context.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Common single-word misspellings (each appears at most twice) ----
  // "drunkeness" -> "drunkenness"  (#380 -- two occurrences in the same
  // paragraph; standard English noun is double-n. The doc uses the correct
  // "drunkenness" twice elsewhere -- #346 and #351 -- so the desired
  // spelling is unambiguous.)
  [/\bdrunkeness\b/g, 'drunkenness', 'drunkeness->drunkenness'],
  // "despondancy" -> "despondency"  (#146, #253 -- two occurrences; no
  // "despondency" elsewhere, but the English noun is unambiguously -ency
  // and the word is plain English with no theological overload.)
  [/\bdespondancy\b/g, 'despondency', 'despondancy->despondency'],
  // "ennumerated" -> "enumerated"  (#208, #240 -- two occurrences; standard
  // English has single n after "e". OCR doubled the n.)
  [/\bennumerated\b/g, 'enumerated', 'ennumerated->enumerated'],
  // "certianly" -> "certainly"  (#143 -- single occurrence in a footnote;
  // the doc uses the correct "certainly" 17 times elsewhere. Classic
  // a/i transposition.)
  [/\bcertianly\b/g, 'certainly', 'certianly->certainly'],
  // "governerships" -> "governorships"  (#140 -- single occurrence,
  // "advance to abbacies and governerships". Standard English noun.)
  [/\bgovernerships\b/g, 'governorships', 'governerships->governorships'],
  // "descendents" -> "descendants"  (#189 -- single occurrence in a
  // footnote on Augustine on original sin: "passes on in turn through
  // sexual procreation to all of his descendents". Standard English
  // noun spells -ants; -ents is a known frequent misspelling.)
  [/\bdescendents\b/g, 'descendants', 'descendents->descendants'],
  // "expells" -> "expels"  (#28 -- single occurrence, "expells them from
  // his table". Standard English doubles only on -ed/-ing/-er, not the
  // bare 3rd-person form.)
  [/\bexpells\b/g, 'expels', 'expells->expels'],
  // "lillies" -> "lilies"  (#351 -- single occurrence in a quotation of
  // Mt 6:28: "Consider the lillies of the field". Standard English spells
  // "lilies" with single l before -ies. The Matthew quotation is
  // unambiguous.)
  [/\blillies of the field\b/g, 'lilies of the field', 'lillies->lilies'],
  // "unchangably" -> "unchangeably"  (#405 -- single occurrence, "remained
  // unchangably in His divinity". Standard English keeps the silent e
  // before -ably for "unchange-".)
  [/\bunchangably\b/g, 'unchangeably', 'unchangably->unchangeably'],
  // "prominance" -> "prominence"  (#434 -- single occurrence, "Tabor's
  // prominance in the controversy". Standard English noun is -ence.)
  [/\bprominance\b/g, 'prominence', 'prominance->prominence'],

  // ---- Proper-noun OCR errors ----
  // "Phillip" -> "Philip"  (#89 -- single occurrence in Discourse V
  // introduction: "Christ's words to Phillip, 'He who has seen Me has seen
  // the Father' (Jn 14:9)". The apostle's name is spelled "Philip" in
  // English; "Phillip" is a personal-name variant never used for the
  // biblical figure.)
  [/\bChrist's words to Phillip\b/g, "Christ's words to Philip", 'Phillip->Philip-apostle'],
  // "Crysanthus" -> "Chrysanthus"  (#189 -- single occurrence in a
  // footnote: "The feast of SS. Crysanthus and Daria is celebrated on
  // March 19th". The saint's name is "Chrysanthus" -- Greek chrysos,
  // "gold" -- the OCR dropped the "h" after C.)
  [/\bSS\. Crysanthus and Daria\b/g, 'SS. Chrysanthus and Daria', 'Crysanthus->Chrysanthus'],

  // ---- Hyphenated compound English broken or run together ----
  // "allHoly" -> "all-Holy"  (#88, #247 -- two occurrences; the hyphenated
  // form "all-Holy" appears 8 times elsewhere in the same translator, in
  // doxological formulas. Pure OCR run-together at a page or column break.)
  [/\ballHoly\b/g, 'all-Holy', 'allHoly->all-Holy'],
  // "lifecreating" -> "life-creating"  (#143 -- single occurrence in
  // doxology: "the all-Holy, good, and lifecreating Spirit". The matching
  // doxology in #88 reads "all-Holy Spirit" -- and the translator
  // hyphenates "life-giving" 7 times in the same doc, so the convention
  // is hyphenated life- compounds.)
  [/\blifecreating Spirit\b/g, 'life-creating Spirit', 'lifecreating->life-creating'],

  // ---- Scripture-reference OCR errors: missing hyphen in verse ranges ----
  // The original printed scripture refs use a hyphen between start and end
  // verse ("Jn 14:21-23"). The OCR merged a hyphen out of four verse-range
  // refs, producing 4-digit numbers that are not real verses. Each is
  // restricted to its exact bracketed-citation context so no other number
  // (year, page, etc.) can match.
  // "[Jn 16:1214]" -> "[Jn 16:12-14]"  (#124 -- John 16 has 33 verses;
  // 12-14 are the Counselor-passage quoted in context.)
  [/\[Jn 16:1214\]/g, '[Jn 16:12-14]', 'Jn-16-1214->Jn-16-12-14'],
  // "[Jn 14:1516]" -> "[Jn 14:15-16]"  (#126 -- John 14 has 31 verses;
  // 15-16 are the "another Counselor" passage explicitly named in the
  // sentence being cited.)
  [/\[Jn 14:1516\]/g, '[Jn 14:15-16]', 'Jn-14-1516->Jn-14-15-16'],
  // "[Eph 6:1417]" -> "[Eph 6:14-17]"  (#208 -- Eph 6 has 24 verses;
  // 14-17 are the "shield/helmet/sword" passage in the immediate
  // sentence "with the shield and helm and the rest that St. Paul has
  // enumerated".)
  [/\[Eph 6:1417\]/g, '[Eph 6:14-17]', 'Eph-6-1417->Eph-6-14-17'],
  // "[cf. Gal 5:1624]" -> "[cf. Gal 5:16-24]"  (#392 -- Gal 5 has 26
  // verses; 16-24 are the "flesh vs. Spirit" passage quoted in context:
  // "from the flesh itself as true enemy of the Spirit".)
  [/\[cf\. Gal 5:1624\]/g, '[cf. Gal 5:16-24]', 'Gal-5-1624->Gal-5-16-24'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes -- only for unambiguous cases.
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
