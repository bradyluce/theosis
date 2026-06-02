#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Faber & Faber English Philokalia (5-volume,
 * tr. Palmer/Sherrard/Ware), ingested from scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/philokalia.json, applies targeted OCR
 * corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous
 * for THIS source. The Philokalia uses a famously specialized vocabulary
 * (hesychia, nous, dianoia, theoria, prosoche, kollyba, etc.) and many
 * authors with differing translation styles, so word-level "fixes" stay
 * narrow. Theological vocabulary, Greek/Latin/Syriac/Slavonic transliterations,
 * Scripture references, archaic English (thou/thee/thy/Thy, -eth/-est),
 * editorial Roman numerals, and digits are preserved.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/philokalia.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English/Greek never matches.
// Counts cited below are total occurrences in the bundle at the time of audit.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Lost hyphens at line breaks (227 hyphenated forms vs 40 run-together
  //      OCR artifacts in the same bundle, so the hyphenated form is the
  //      translators' canonical spelling). Each compound is restricted to its
  //      exact spelling — we do NOT generalize self-X across the board, since
  //      some self-X words may appear unhyphenated by editorial choice. ----

  // "selfcontrol" → "self-control" (14× run-together vs 142× "self-control"
  // elsewhere — Cassian "On the Eight Vices", Thalassios, Diadochos, etc.)
  [/\bselfcontrol\b/g, 'self-control', 'selfcontrol->self-control'],
  // "selfesteem" → "self-esteem" (9× vs 142× "self-esteem" — same pattern, the
  // sin-name is glossed self-esteem throughout the corpus)
  [/\bselfesteem\b/g, 'self-esteem', 'selfesteem->self-esteem'],
  // "selfindulgence" → "self-indulgence" (2× vs 63× — same pattern)
  [/\bselfindulgence\b/g, 'self-indulgence', 'selfindulgence->self-indulgence'],
  // "senseperception" → "sense-perception" (3× vs 39× — same pattern, technical
  // term for sensory cognition in the patristic ascetic glossary)
  [/\bsenseperception\b/g, 'sense-perception', 'senseperception->sense-perception'],
  // "hardheartedness" → "hard-heartedness" (1× vs 0× — but "hard-hearted" appears
  // hyphenated elsewhere and the unhyphenated form here breaks the OCR pattern;
  // the chapter context lists vices alongside "hardheartedness" in a passion list)
  [/\bhardheartedness\b/g, 'hard-heartedness', 'hardheartedness->hard-heartedness'],
  // "firstborn" → "first-born" (3× vs 1× hyphenated — the OCR-broken form
  // outnumbers the canonical here but Philokalia editorial convention uses the
  // hyphen for the substantive "first-born sons")
  [/\bfirstborn\b/g, 'first-born', 'firstborn->first-born'],
  // "lifegenerating" → "life-generating" (1× vs 2× — single OCR artifact)
  [/\blifegenerating\b/g, 'life-generating', 'lifegenerating->life-generating'],
  // "agelong" → "age-long" (5× vs 14× "age-long" — the eschatological adjective
  // for "aionios" punishment / chastisement is hyphenated in the canonical form)
  [/\bagelong\b/g, 'age-long', 'agelong->age-long'],
  // "wellbeing" → "well-being" (2× vs 23× "well-being" — both occurrences are
  // bare word-pair OCR artefacts of the same technical phrase)
  [/\bwellbeing\b/g, 'well-being', 'wellbeing->well-being'],

  // ---- Line-break hyphen artifacts: "self- X" → "self-X" (a hard space was
  //      inserted at a line break, leaving "self- satisfaction" etc.) Only
  //      3 occurrences total, all in passion-lists.) ----
  [/\bself-\s+satisfaction\b/g, 'self-satisfaction', 'self--satisfaction->self-satisfaction'],
  [/\bself-\s+vaunting\b/g, 'self-vaunting', 'self--vaunting->self-vaunting'],
  [/\bself-\s+inflation\b/g, 'self-inflation', 'self--inflation->self-inflation'],

  // ---- "rn" → "m" misreads (common scanner artifact) ----
  // "coetemal" → "coeternal" (7× OCR vs 9× canonical — exact rn↔m swap on the
  // technical Trinitarian adjective; context always describes Father/Son/Spirit)
  [/\bcoetemal\b/g, 'coeternal', 'coetemal->coeternal'],
  // "conies" → "comes" (4× — verb "comes" misread as the noun for cone-shapes;
  // every occurrence is in the unambiguous frames "X conies from Y" / "X conies
  // to express Z" / "everything that conies, whether good")
  [/\bconies\b/g, 'comes', 'conies->comes'],

  // ---- Doubled letters / glyph misreads ----
  // "Carnbridge" → "Cambridge" (1× — University of Cambridge in bibliography
  // citing Chadwick's 1950 monograph; rn↔m exact swap, same paragraph)
  [/\bCarnbridge\b/g, 'Cambridge', 'Carnbridge->Cambridge'],
  // "leamt" → "learnt" (3× — every occurrence is the verb in idiomatic
  // British-English usage; "leam" the noun does not exist as a word)
  [/\bleamt\b/g, 'learnt', 'leamt->learnt'],

  // ---- "Inroductory" → "Introductory" (5× — letter "t" dropped after "In"
  //      in author-bio section headers; "Introductory Note" is the canonical
  //      label in this edition. All 5 occurrences are bare section heads.) ----
  [/\bInroductory\b/g, 'Introductory', 'Inroductory->Introductory'],

  // ---- Single broken word: "blow more fully the God within" → "know more
  //      fully" (1× — the immediately preceding sentence quotes Ps. 46:10
  //      "Devote yourselves to stillness and know that I am God"; "seek to
  //      blow ... the God within" is nonsense, and "kn" / "bl" are an OCR
  //      letter swap. Phrase-bound to avoid hitting any legitimate verb.) ----
  [/\bseek to blow more fully the God within\b/g, 'seek to know more fully the God within', 'blow-more-fully->know-more-fully'],

  // ---- Missing space after period before chapter/verse digits in scripture
  //      refs (266 well-spaced refs vs 14 missing-space refs in the same forms,
  //      so the missing space is unambiguously the typo). Only the
  //      most-frequently-affected abbreviations are addressed. ----
  [/\b1Cor\.(\d)/g, '1 Cor. $1', '1Cor-no-space'],
  [/\b1Tim\.(\d)/g, '1 Tim. $1', '1Tim-no-space'],
  // (Matt.15:19, Gal.2:4, Isa.66:23, 2 Thess.3:6 occur but each has its own
  // missing-space pattern. We fix the abbreviation + digit collision in one go.)
  [/\bMatt\.(\d+):(\d+)/g, 'Matt. $1:$2', 'Matt-no-space'],
  [/\bGal\.(\d+):(\d+)/g, 'Gal. $1:$2', 'Gal-no-space'],
  [/\bIsa\.(\d+):(\d+)/g, 'Isa. $1:$2', 'Isa-no-space'],
  [/\bEph\.(\d+):(\d+)/g, 'Eph. $1:$2', 'Eph-no-space'],
  [/\bThess\.(\d+):(\d+)/g, 'Thess. $1:$2', 'Thess-no-space'],

  // ---- Vocative "O" misread as "0" (the zero digit) before divine titles.
  //      Each pattern is restricted to address-forms that cannot occur in any
  //      Scripture-verse number ("Ps. 0:1" is not a real reference, and the
  //      vocative is always followed by a divine title with leading caps). ----
  // "0 God" → "O God" (10×)
  [/\b0 God\b/g, 'O God', '0-God->O-God'],
  // "0 Lord" → "O Lord" (33×)
  [/\b0 Lord\b/g, 'O Lord', '0-Lord->O-Lord'],
  // "0 Christ" → "O Christ" (5×)
  [/\b0 Christ\b/g, 'O Christ', '0-Christ->O-Christ'],
  // "0 Master" → "O Master" (2×)
  [/\b0 Master\b/g, 'O Master', '0-Master->O-Master'],
  // "0 Son" → "O Son" (1×)
  [/\b0 Son\b/g, 'O Son', '0-Son->O-Son'],

  // ---- Bibliographic typo: "Twenty-FourDiscourses" — missing space in a
  //      cross-reference (1× vs 89× "Twenty-Four Discourses" — Peter of
  //      Damaskos' Book II in this edition) ----
  [/\bTwenty-FourDiscourses\b/g, 'Twenty-Four Discourses', 'Twenty-FourDiscourses->Twenty-Four-Discourses'],

  // ---- "St 'Mark" with stray quote (1× — Peter of Damaskos quoting Mark the
  //      Ascetic; the stray ' interpolated by OCR. Other 285 instances of "St
  //      Mark" / "St. Mark" in the bundle have no leading quote.) ----
  [/\bSt 'Mark\b/g, 'St Mark', "St-quote-Mark->St-Mark"],

  // ---- Sentence-medial "1" for capital "I" (the personal pronoun). Each
  //      pattern is bound to a phrase distinctive enough that it cannot match
  //      a page header (e.g. "Part 1 thoughts" / "Book 1 The") or a Scripture
  //      verse number. All occurrences below are in first-person narrative
  //      sections of St Peter of Damaskos, St Symeon the New Theologian, and
  //      St Symeon Metaphrastis' Makarian paraphrase. ----
  // "1 had called upon Him" → "I had called upon Him"
  [/\bespecially if 1 had called upon Him\b/g, 'especially if I had called upon Him', '1-had-called->I-had-called'],
  // "1 understand than ten thousand" → "I understand than ten thousand" (1 Cor. 14:19)
  [/\bwhose meaning 1 understand\b/g, 'whose meaning I understand', '1-understand->I-understand'],
  // "1 have committed" → "I have committed"
  [/\bof the sins 1 have committed\b/g, 'of the sins I have committed', '1-have-committed->I-have-committed'],
  // "the sins 1 have already committed are enough" → "I have already committed"
  [/\bthe sins 1 have already committed are enough\b/g, 'the sins I have already committed are enough', '1-have-already-committed->I-have-already-committed'],
  // "1 sought Him whom I love" → "I sought Him whom I love" (Song 3:1)
  [/\bBy night on my bed 1 sought Him\b/g, 'By night on my bed I sought Him', '1-sought->I-sought'],
  // "1 do not regard myself in this way" → "I do not regard myself in this way"
  [/\bAs it is, 1 still do not regard\b/g, 'As it is, I still do not regard', '1-still-do-not->I-still-do-not'],
  // "1 do not ask out of idle curiosity" → "I do not ask out of idle curiosity"
  [/\bthat 1 do not ask out of idle curiosity\b/g, 'that I do not ask out of idle curiosity', '1-do-not-ask->I-do-not-ask'],
  // "1 fall down before Thee" → "I fall down before Thee" (Peter of Damaskos)
  [/\bBut as always 1 fall down before Thee\b/g, 'But as always I fall down before Thee', '1-fall-down->I-fall-down'],
  // "1 speak and do not act" → "I speak and do not act"
  [/\bthat awaits me if 1 speak and do not act\b/g, 'that awaits me if I speak and do not act', '1-speak->I-speak'],
  // "1 no longer remembered" → "I no longer remembered"
  [/\bsuch an extent that 1 no longer remembered\b/g, 'such an extent that I no longer remembered', '1-no-longer-remembered->I-no-longer-remembered'],
  // "1 have mentioned" → "I have mentioned" (Theoliptos)
  [/\battachment to the things that 1 have mentioned\b/g, 'attachment to the things that I have mentioned', '1-have-mentioned->I-have-mentioned'],
  // "1 have said" → "I have said" (Symeon Metaphrastis paraphrase of Makarios)
  [/\bAs 1 have said, I have never yet\b/g, 'As I have said, I have never yet', '1-have-said->I-have-said'],
  // "1 want to say" → "I want to say" (Peter of Damaskos)
  [/\bbut now 1 want to say something further\b/g, 'but now I want to say something further', '1-want-to-say->I-want-to-say'],
  // "1 bear" → "I bear" (Peter of Damaskos)
  [/\bHow shall 1 bear the ceaseless lamenting\b/g, 'How shall I bear the ceaseless lamenting', '1-bear->I-bear'],
  // "1 do?" → "I do?" (Peter of Damaskos)
  [/\bWhat shall 1 do\? I have sinned greatly\b/g, 'What shall I do? I have sinned greatly', '1-do-question->I-do-question'],
  // "1 shall be faultless" → "I shall be faultless" (Ps. 19:13 quoted by Peter)
  [/\bover me, then 1 shall be faultless\b/g, 'over me, then I shall be faultless', '1-shall-be-faultless->I-shall-be-faultless'],
  // "How 1 have loved Thy law" → "How I have loved Thy law" (Ps. 119:97 quoted by Theoliptos)
  [/\b'How 1 have loved Thy law\b/g, "'How I have loved Thy law", '1-have-loved->I-have-loved'],

  // ---- Doubled comma artifacts (4 distinct paragraphs — all are unambiguous
  //      single-comma slots where OCR inserted a duplicate ",,". We scope each
  //      to the surrounding word pair to avoid touching legitimate ",," that
  //      could appear in numeric / programmatic contexts elsewhere.) ----
  // "tears,, an understanding" → "tears, an understanding" (Hesychios)
  [/\btears,, an understanding\b/g, 'tears, an understanding', 'tears-doublecomma->tears-comma'],
  // "and,, by virtue" → "and, by virtue" (Diadochos)
  [/\band,, by virtue of\b/g, 'and, by virtue of', 'and-doublecomma->and-comma'],
  // "Scriptures,, through righteous men" → "Scriptures, through righteous men" (Peter of Damaskos)
  [/\bthe Scriptures,, through righteous men\b/g, 'the Scriptures, through righteous men', 'Scriptures-doublecomma->Scriptures-comma'],
  // "possessed,, yet each of us" → "possessed, yet each of us" (Peter of Damaskos)
  [/\bvirtue which Thou and they possessed,, yet each of us\b/g, 'virtue which Thou and they possessed, yet each of us', 'possessed-doublecomma->possessed-comma'],
  // "food,, but gluttony" → "food, but gluttony" (Peter of Damaskos)
  [/\bit is not food,, but gluttony\b/g, 'it is not food, but gluttony', 'food-doublecomma->food-comma'],
  // "impiety,, in their anxiety" → "impiety, in their anxiety" (Gregory Palamas)
  [/\bAkindynos's impiety,, in their anxiety\b/g, "Akindynos's impiety, in their anxiety", 'impiety-doublecomma->impiety-comma'],
  // "freely or, rather, servilely,, to .the various" → "freely or, rather, servilely, to the various"
  // (Ilias the Presbyter — fixes the doubled comma AND the stray ".the" in one rule)
  [/\bservilely,, to \.the various modes\b/g, 'servilely, to the various modes', 'servilely-doublecomma-dot->servilely-comma-the'],

  // ---- Doubled period artifact (1× — "battles they have been through.. In
  //      the same spirit" in a Peter of Damaskos passage. The next sentence
  //      starts with "In", capitalized — so the second "." is a stray OCR
  //      duplicate, not a sentence-end ellipsis.) ----
  [/\bthrough\.\. In the same spirit\b/g, 'through. In the same spirit', 'through-doubledot->through-dot'],
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
