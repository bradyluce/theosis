#!/usr/bin/env node
/**
 * One-off OCR cleanup for Fr. Seraphim Rose's
 * "The Soul After Death" bundle (St. Herman of Alaska Brotherhood, 1980/2009).
 *
 * Reads content/generated/commentary/rose-soul-after-death.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back. Same author
 * + publisher as `fix-rose-religion-ocr.js`, but the surviving long tail here
 * is much smaller — the Tier-1 universal cleaner already handled the bulk of
 * the 1980s typesetting issues.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, archaic English, Russian/Greek transliterations,
 * Scripture references, and footnote numbers are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 *
 * Major rule families
 *   (A) Line-break hyphen artifacts that survived as `word- word` pairs.
 *       The Tier-1 cleaner kept these because the right side was lowercase
 *       and not unambiguously joinable; we resolve each one by hand citing
 *       the exact pair (and the canonical hyphenated form Rose uses
 *       elsewhere in the same bundle).
 *   (B) Run-together CamelCase compounds where the line-break hyphen was lost
 *       entirely (e.g. `KublerRoss`, `nonChristian`, `afterdeath`). Each is
 *       attested as hyphenated elsewhere in the bundle.
 *   (C) Lost-hyphen compounds with all-lowercase right side
 *       (`outof-body`, `Divinelygranted`).
 *
 * Out of scope (left alone):
 *   - Section headings glued to the first sentence of body text
 *     (e.g. "The Orthodox Doctrine of Angels We know..." — parser artifact,
 *     not OCR).
 *   - Footnote-number-glued-to-next-token artifacts (e.g. `74By Father` or
 *     `73ff190 of The Soul`) — also parser artifacts where footnote text was
 *     inlined; not safely reconstructible.
 *   - "tollhouses" (intentional one-word form, used consistently 80+ times).
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/rose-soul-after-death.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rule list: [/regex/, replacement, name]
// Each rule must be unambiguous — applied via String.prototype.replace.
// All patterns are word-bounded so legitimate English never matches.
// ---------------------------------------------------------------------------
const rules = [
  // ===========================================================
  // (A) Line-break hyphenation pairs: `word- word` → joined form.
  // ===========================================================
  // p1552, p2238: "matter-of- factly" → "matter-of-factly"
  //   Standard English compound; Rose uses no other spelling in this bundle.
  [/\bmatter-of- factly\b/g, 'matter-of-factly', 'matter-of-factly'],

  // p371: "well- known monk" → "well-known monk"
  //   Compound adjective; the same bundle has "well-known" hyphenated elsewhere
  //   (the OCR dropped a line break in mid-compound).
  [/\bwell- known\b/g, 'well-known', 'well-known'],

  // p308, p421: "20th- century", "19th- century"
  //   The bundle has 26 occurrences of correctly-hyphenated "Nth-century" /
  //   "Nth century"; these two are the only line-break-broken ones.
  [/\b(\d+)th- century\b/g, '$1th-century', 'Nth-century'],

  // p510: "outof- the-body" → "out-of-the-body"
  //   Rose's standard term; bundle has 6 correctly-formatted "out-of-the-body"
  //   occurrences and 1 OCR-broken one.
  [/\boutof- the-body\b/g, 'out-of-the-body', 'outof-the-body->out-of-the-body'],

  // p1071, p1083: "out- of-body" → "out-of-body"
  //   The dominant form in the bundle (200+ occurrences of "out-of-body").
  [/\bout- of-body\b/g, 'out-of-body', 'out-of-body-spaced'],

  // p1077: "would- be hinderers" → "would-be hinderers"
  //   Standard English compound adjective.
  [/\bwould- be\b/g, 'would-be', 'would-be'],

  // p1092, p1540, p1561, p1564: "Kubler- Ross"
  //   Personal name; 21 occurrences of "Kubler-Ross" in the bundle, these 4
  //   carry a stray space from line-break hyphenation.
  [/\bKubler- Ross\b/g, 'Kubler-Ross', 'Kubler-Ross-spaced'],

  // p1642: "careless- living" → "careless-living"
  //   Compound adjective ("careless-living people"); only occurrence.
  [/\bcareless- living\b/g, 'careless-living', 'careless-living'],

  // p2475: "single- mindedly" → "single-mindedly"
  //   Standard English compound adverb; only occurrence.
  [/\bsingle- mindedly\b/g, 'single-mindedly', 'single-mindedly'],

  // p2556: "Gi- ming Shien" → "Gi-ming Shien"
  //   Personal name (Chinese philosopher); the bundle has "Gi-ming" 2× elsewhere
  //   (next paragraph, p2559), only this one is broken.
  [/\bGi- ming\b/g, 'Gi-ming', 'Gi-ming'],

  // ===========================================================
  // (B) Run-together CamelCase compounds (line-break hyphen lost).
  // ===========================================================
  // p96: "JulyAugust" → "July-August"
  //   Periodical issue spans (Orthodox Life, JulyAugust, 1976). The compound
  //   month range is conventionally written with a hyphen or en-dash; Rose's
  //   bibliography (p2622, etc.) uses comma-separated months, but a
  //   hyphenated form here matches the journal's actual cover convention.
  [/\bJulyAugust\b/g, 'July-August', 'JulyAugust'],

  // p552: "OsisHaraldsson" → "Osis and Haraldsson"
  //   These are two distinct researchers (Drs. Osis and Haraldsson). The
  //   bundle has 30+ correctly-spaced "Osis and Haraldsson" elsewhere; this
  //   is the only run-together OCR error.
  [/\bOsisHaraldsson\b/g, 'Osis and Haraldsson', 'OsisHaraldsson'],

  // p1513, p1537: "KublerRoss" → "Kubler-Ross"
  //   21 occurrences of "Kubler-Ross" (with hyphen) elsewhere in the bundle;
  //   these 2 lost the hyphen entirely.
  [/\bKublerRoss\b/g, 'Kubler-Ross', 'KublerRoss'],

  // p1734: "SoulProfiting" → "Soul-Profiting"
  //   The Russian periodical "Soul-Profiting Reading"; 4 correctly-hyphenated
  //   occurrences elsewhere in the bundle (p1701, p1794, p2745, p2835).
  [/\bSoulProfiting\b/g, 'Soul-Profiting', 'SoulProfiting'],

  // p1881: "MeatFare Saturday" → "Meatfare Saturday"
  //   Standard Orthodox liturgical name (the Saturday before Meatfare Sunday
  //   in the Triodion). The conventional rendering is one word, lowercase
  //   "fare". Only occurrence in this bundle.
  [/\bMeatFare Saturday\b/g, 'Meatfare Saturday', 'MeatFare-Saturday'],

  // p2190: "Latin-ScholasticHellenistic" → "Latin-Scholastic-Hellenistic"
  //   Triple compound describing a strain of theological influence; the OCR
  //   merged the second and third elements. Only occurrence.
  [/\bLatin-ScholasticHellenistic\b/g, 'Latin-Scholastic-Hellenistic', 'ScholasticHellenistic'],

  // p2352: "Bussy-enOthe" → "Bussy-en-Othe"
  //   French place name (location of Mother Mary's monastery, OCA
  //   French diocese). The bundle has "Bussy-en-Othe" correctly hyphenated
  //   in the bibliography (p2703).
  [/\bBussy-enOthe\b/g, 'Bussy-en-Othe', 'Bussy-enOthe'],

  // p2418: "unOrthodox point of view" → "un-Orthodox point of view"
  //   Negative prefix on the proper adjective; the bundle has "un-Orthodox"
  //   2× correctly hyphenated elsewhere (p2454, p2508). Restricted to the
  //   exact phrase to be safe — "unorthodox" (lowercase) is a different word
  //   and is left alone.
  [/\bunOrthodox\b/g, 'un-Orthodox', 'unOrthodox'],

  // p421: "nonChristian" → "non-Christian"
  //   3 correctly-hyphenated "non-Christian" elsewhere in the bundle; this
  //   one lost its hyphen.
  [/\bnonChristian\b/g, 'non-Christian', 'nonChristian'],

  // p96, p775, p972, p1379, p1531, p1549: '"afterdeath"' → '"after-death"'
  //   All 5 occurrences are inside curly quotes (the OCR consistently lost
  //   the hyphen when this word fell on a line break). Rose's standard form
  //   is "after-death" (with hyphen), used in 100+ surrounding instances.
  //   We anchor on the smart-quote pair so we never touch a one-word
  //   "afterdeath" used as a real attributive (none exists in this bundle
  //   without quotes anyway).
  [/“afterdeath”/g, '“after-death”', 'afterdeath-in-quotes'],

  // ===========================================================
  // (C) Lost-hyphen compounds with all-lowercase right side.
  // ===========================================================
  // p1155, p1534, p1582: "outof-body" → "out-of-body"
  //   3 occurrences where the line-break hyphen was lost entirely (no space
  //   between "outof" and "-body"). Standard Rose term — 200+ correct
  //   "out-of-body" elsewhere.
  [/\boutof-body\b/g, 'out-of-body', 'outof-body'],

  // p1379: "Divinelygranted experience" → "Divinely-granted experience"
  //   The bundle uses "Divinely-inspired" (p629) and similar
  //   "Divinely-<verb>ed" compounds with a hyphen. Only occurrence.
  [/\bDivinelygranted\b/g, 'Divinely-granted', 'Divinelygranted'],
];

// ---------------------------------------------------------------------------
// Apply rules to every paragraph.
// ---------------------------------------------------------------------------

let totalParagraphs = 0;
let modifiedParagraphs = 0;
const samples = []; // [chOrder, paraIdx, before, after, firedRules]
const ruleCounts = new Map();

for (const ch of bundle.chapters) {
  for (const sec of ch.sections || []) {
    for (let i = 0; i < sec.paragraphs.length; i++) {
      const p = sec.paragraphs[i];
      totalParagraphs++;
      const before = p.text;
      let text = before;
      const firedRules = [];
      for (const [re, repl, name] of rules) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          ruleCounts.set(name, (ruleCounts.get(name) || 0) + 1);
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

// Write back
const out = JSON.stringify(bundle, null, 2);
fs.writeFileSync(INPUT, out, 'utf8');

console.log('Total paragraphs processed:', totalParagraphs);
console.log('Total paragraphs modified:', modifiedParagraphs);
console.log('---');
const showCount = process.argv.includes('--all') ? samples.length : 10;
console.log('Sample before/after pairs (showing ' + Math.min(showCount, samples.length) + ' of ' + samples.length + '):');
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  let diffStart = 0;
  while (
    diffStart < before.length &&
    diffStart < after.length &&
    before[diffStart] === after[diffStart]
  ) diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before.slice(ctxStart, diffStart + 100).replace(/\n/g, '\\n');
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100).replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('Distinct rule firings (' + ruleCounts.size + ' rules):');
for (const [r, c] of [...ruleCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log('  ' + r + ': ' + c);
}
