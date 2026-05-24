#!/usr/bin/env node
/**
 * One-off OCR cleanup for Cyril of Alexandria "On the Unity of Christ"
 * (1995 SVS Press, tr. McGuckin) bundle.
 *
 * Reads content/generated/commentary/cyril-alexandria-unity-of-christ.json,
 * applies conservative deterministic OCR-error fixes (only changes
 * paragraph[].text — never structure), and writes back.
 *
 * IMPORTANT CONTEXT
 * -----------------
 * This is the worst-OCR-quality source in the Theosis corpus. Unlike most
 * scans, the OCR did not preserve enough word structure for the usual
 * "wouid -> would" / "Iie -> He" / "tbe -> the" letter-confusion rules to
 * find any matches: the corruption pattern is whole-word collapse, not
 * letter substitution within otherwise-readable English. Most paragraphs
 * are streams of disconnected glyph runs with isolated real words.
 *
 * Therefore the rules below are intentionally extremely conservative.
 * Per the task instructions, garbled stretches we cannot decode are LEFT
 * ALONE rather than guessed. The script's job here is:
 *
 *   1. Run the documented "safe" OCR-letter-confusion rules (no-op on most
 *      paragraphs because the underlying patterns don't appear).
 *   2. Apply low-risk whitespace and noise-glyph normalizations that do
 *      not change meaning.
 *
 * The rules are idempotent — re-running the script on already-cleaned
 * text produces no further changes.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/cyril-alexandria-unity-of-christ.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rule registry. Each rule is { name, apply(text) -> text }.
// We track which rules fired so we can report a meaningful summary.
// ---------------------------------------------------------------------------

const ruleHits = Object.create(null); // ruleName -> match count

function track(name, matches) {
  if (!matches) return;
  ruleHits[name] = (ruleHits[name] || 0) + matches;
}

function applyRegex(text, re, replacement, name) {
  const m = text.match(re);
  if (m) {
    track(name, m.length);
    return text.replace(re, replacement);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Letter-confusion rules from the brief (run despite zero expected hits on
// this corpus — they document the safe transformations and remain idempotent
// for any future re-OCR of the same source).
// ---------------------------------------------------------------------------

const letterConfusionRules = [
  // 'wouid' / 'couid' / 'shouid' / 'wouId' etc. -> would / could / should
  [/\bwouid\b/g, 'would', 'wouid->would'],
  [/\bcouid\b/g, 'could', 'couid->could'],
  [/\bshouid\b/g, 'should', 'shouid->should'],
  // 'Iie' / 'Iiim' -> He / him  (uppercase-I followed by lowercase-ie)
  [/\bIie\b/g, 'He', 'Iie->He'],
  [/\bIiim\b/g, 'him', 'Iiim->him'],
  // 'tbe' / 'tlie' / 'tliis' -> the / the / this
  [/\btbe\b/g, 'the', 'tbe->the'],
  [/\btlie\b/g, 'the', 'tlie->the'],
  [/\btliis\b/g, 'this', 'tliis->this'],
  // 'iuto' / 'wlien' / 'joumey' / 'fhe'
  [/\biuto\b/g, 'into', 'iuto->into'],
  [/\bwlien\b/g, 'when', 'wlien->when'],
  [/\bjoumey\b/g, 'journey', 'joumey->journey'],
  [/\bfhe\b/g, 'the', 'fhe->the'],
];

// ---------------------------------------------------------------------------
// Punctuation normalization (no semantic change).
// ---------------------------------------------------------------------------

const punctuationRules = [
  // Doubled period not part of an ellipsis: ".." -> "."
  // (we explicitly do NOT touch "..." ellipses)
  [/(?<!\.)\.{2}(?!\.)/g, '.', 'doubled-period->single'],
  // Doubled comma ",," -> ","
  [/,,/g, ',', 'doubled-comma->single'],
  // Doubled semicolon ";;" -> ";"
  [/;;/g, ';', 'doubled-semicolon->single'],
];

// ---------------------------------------------------------------------------
// Whitespace normalization — conservative.
// ---------------------------------------------------------------------------

const whitespaceRules = [
  // Collapse runs of internal whitespace to a single space.
  [/[ \t]{2,}/g, ' ', 'multi-space->single'],
  // Strip leading/trailing whitespace from the paragraph as a whole — applied
  // separately at the end because the regex form needs anchors.
];

// ---------------------------------------------------------------------------
// Run-together-words rule: split CamelCase joins like "thedispensations".
// This is intentionally narrow: only fires on a lowercase block followed by
// a capital followed by a lowercase block, where the result is clearly a
// missed inter-word space. We do NOT split proper-noun compounds.
// Disabled by default on this corpus because the OCR noise contains too many
// false-positive sequences (e.g. footnote-letter glyphs) — leaving this rule
// here for documentation only.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main pass.
// ---------------------------------------------------------------------------

const samples = []; // {before, after} for the first 10 modified paragraphs
let modifiedCount = 0;
let totalCount = 0;

for (const chapter of bundle.chapters || []) {
  for (const section of chapter.sections || []) {
    for (const paragraph of section.paragraphs || []) {
      totalCount++;
      const before = paragraph.text;
      let text = before;

      for (const [re, replacement, name] of letterConfusionRules) {
        text = applyRegex(text, re, replacement, name);
      }
      for (const [re, replacement, name] of punctuationRules) {
        text = applyRegex(text, re, replacement, name);
      }
      for (const [re, replacement, name] of whitespaceRules) {
        text = applyRegex(text, re, replacement, name);
      }

      // Trim outer whitespace (idempotent).
      const trimmed = text.replace(/^\s+|\s+$/g, '');
      if (trimmed !== text) {
        track('outer-trim', 1);
        text = trimmed;
      }

      if (text !== before) {
        modifiedCount++;
        if (samples.length < 10) {
          samples.push({ before, after: text });
        }
        paragraph.text = text;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Write back.
// ---------------------------------------------------------------------------

fs.writeFileSync(INPUT, JSON.stringify(bundle, null, 2) + '\n', 'utf8');

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------

console.log('Cyril of Alexandria - On the Unity of Christ - OCR fix pass');
console.log('============================================================');
console.log('Bundle:                ' + INPUT);
console.log('Total paragraphs:      ' + totalCount);
console.log('Modified paragraphs:   ' + modifiedCount);
console.log('');
console.log('Rules fired (with match counts):');
const rules = Object.keys(ruleHits).sort();
if (rules.length === 0) {
  console.log('  (none — corpus contains no instances of the safe-rule patterns)');
} else {
  for (const name of rules) {
    console.log('  - ' + name + ': ' + ruleHits[name]);
  }
}
console.log('');
console.log('Sample before/after pairs (up to 10):');
if (samples.length === 0) {
  console.log('  (no paragraphs were modified)');
} else {
  samples.forEach((s, i) => {
    console.log('--- Sample ' + (i + 1) + ' ---');
    console.log('BEFORE: ' + s.before);
    console.log('AFTER:  ' + s.after);
  });
}
