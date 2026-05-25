#!/usr/bin/env node
/**
 * OCR cleanup for Cyril of Alexandria "On the Unity of Christ"
 * (1995 SVS Press, tr. McGuckin) bundle.
 *
 * The 5x-zoom re-OCR (May 2026) produced clean, readable English.
 * This script applies deterministic, idempotent fixes for the
 * residual OCR-level transcription errors that remain.
 *
 * STRICT RULES
 *   FIX:
 *     - Letter-confusions in normal English (wouid -> would, etc.)
 *     - Letter substitutions in proper nouns (Carholic -> Catholic, etc.)
 *     - Wrong-letter swaps in context-obvious words (forgotien -> forgotten)
 *     - Stray non-letter glyphs / footnote markers
 *     - Run-together words missing spaces (atthe -> at the)
 *     - Doubled punctuation
 *     - Page-header garbage that bled into body text
 *
 *   PRESERVE:
 *     - Greek terms (hypostasis, theotokos, homoousios, ...)
 *     - Latin phrases and PG/PL/SC citations
 *     - Proper nouns and place names
 *     - Bibliographic abbreviations
 *     - Numbered section markers; digits in dates/refs
 *     - Cut-off page-break truncations
 *
 *   DO NOT:
 *     - Change paragraph boundaries
 *     - Paraphrase
 *     - Touch JSON structure
 *
 * IDEMPOTENT: re-running on already-cleaned text produces no change.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/cyril-alexandria-unity-of-christ.json'
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rule registry. Each rule: { name, apply(text) -> text }.
// We track which rules fired so we can report a meaningful summary.
// ---------------------------------------------------------------------------

const ruleHits = Object.create(null);

function track(name, n) {
  if (!n) return;
  ruleHits[name] = (ruleHits[name] || 0) + n;
}

function rxReplace(text, re, replacement, name) {
  // Count matches first (so we can track without breaking $N backreference
  // semantics — using a callback would force `$1`-style replacements to be
  // interpreted as literal text instead of capture-group backrefs).
  const matches = text.match(re);
  if (!matches || matches.length === 0) return text;
  track(name, matches.length);
  return text.replace(re, replacement);
}

// ---------------------------------------------------------------------------
// 1. SPECIFIC SINGLE-OCCURRENCE FIXES
//    These were identified by scanning the bundle. They are highly targeted
//    string replacements (not regex) so they cannot fire on unrelated text.
//    Each line documents the source string + corrected form.
// ---------------------------------------------------------------------------

const specificFixes = [
  // Proper nouns / bibliographic
  ['Qecumenicorum', 'Oecumenicorum'],         // Acta Conciliorum Oecumenicorum
  ['Carholic Historical Review', 'Catholic Historical Review'],
  ['Prolemies', 'Ptolemies'],
  ['forgotien', 'forgotten'],
  ['MeGuckin', 'McGuckin'],                   // J. A. McGuckin — author
  ['cf. LA.\nMeGuckin', 'cf. J.A.\nMcGuckin'], // (won't hit after MeGuckin->McGuckin runs but kept idempotent)
  ['cf. LA.\nMcGuckin', 'cf. J.A.\nMcGuckin'], // covers post-MeGuckin->McGuckin state
  ['Chrisiological', 'Christological'],
  ['Chréticnnes', 'Chrétiennes'],
  ['Constantinople 11 553', 'Constantinople II 553'],
  ['Stud. Pat,', 'Stud. Pat.'],               // bibliography abbrev period
  ['Manuseript', 'Manuscript'],

  // Run-together words (clear OCR space loss)
  ['atthe', 'at the'],
  ['thatevery', 'that every'],
  ['youmight', 'you might'],
  ['Itis Cyril', 'It is Cyril'],
  ['Itis as', 'It is as'],
  ['itis an', 'it is an'],
  ['itis said', 'it is said'],
  ['itis a holy', 'it is a holy'],
  ['Tdo not doubt', 'I do not doubt'],

  // Letter swaps where context makes correction certain
  ['ar gued rather', 'argued rather'],        // "Cyril ar gued"
  ['devel oped', 'developed'],                // "devel oped by the experience"
  ['untrammelied', 'untrammeled'],
  ['onwologically', 'ontologically'],
  ['constricls that applied', 'constraints that applied'],
  ['lifegiving thing', 'life-giving thing'],
  ['flesh-rather', 'flesh — rather'],         // ordinary human flesh-rather  -> flesh — rather
  ['100 much', 'too much'],                   // "given in 100 much to Syrian demands"
  ['simply 0 be dismissed', 'simply to be dismissed'],
  ['take il up', 'take it up'],
  ['$aid to have been', 'said to have been'],
  ['firsi-bom', 'first-born'],
  ['sels aside the law', 'sets aside the law'],
  // 'rue humanity' is handled as 'perversion of rue humanity' above so it doesn't
  // re-fire on the corrected "true humanity" on subsequent runs (idempotence).
  ['héd the very Christ', 'had the very Christ'],
  ['evéry Power', 'every Power'],
  ['ére perishing', 'are perishing'],         // those that ére perishing
  ['perversion of rue humanity', 'perversion of true humanity'], // context-anchored so "true humanity" itself is not re-matched
  ['He would un» our abandonment', 'He would undo our abandonment'],
  ['complete submissio.:', 'complete submission:'],
  ['al times even seemed', 'at times even seemed'],
  ['carcer as one', 'career as one'],
  ['bul the generations', 'but the generations'],
  ['whercas the heavenly', 'whereas the heavenly'],
  ['clse but gabble', 'else but gabble'],
  ['How els¢ could we', 'How else could we'],
  ['cat of this bread', 'eat of this bread'],
  ['represenied in his later life', 'represented in his later life'],
  ['seripture (Heb 12:2', 'scripture (Heb 12:2'],
  ['(cf. 1 Cor 6:20; | Pet', '(cf. 1 Cor 6:20; 1 Pet'],     // |Pet = 1Pet (the pipe was meant to be digit 1)
  ['{In 3:13)', '(Jn 3:13)'],
  ['for he says}:', 'for he says]:'],
  ['Mk t0:34', 'Mk 10:34'],                   // t0:34 typo for 10:34
  ['J1 2:28', 'Jl 2:28'],                     // J1 = Jl (Joel)
  ['JI 1:5)', 'Jl 1:5)'],                     // JI = Jl (Joel)
  ['(M1 16:24)', '(Mt 16:24)'],               // M1 = Mt (Matthew)
  ['birth from a4 woman', 'birth from a woman'],
  ['his manifestation as man. This 1s why', 'his manifestation as man. This is why'],

  // 'In X:Y' biblical refs that should be 'Jn X:Y' (John, not "in")
  ['(In 14:6)', '(Jn 14:6)'],
  ['(In 10:38)', '(Jn 10:38)'],
  ['(In 4:22)', '(Jn 4:22)'],
  ['(In 10:11,18)', '(Jn 10:11,18)'],
  ['(In 6:51,33)', '(Jn 6:51,33)'],
  ['(cf. In 1:5)', '(cf. Jn 1:5)'],

  // The "trans13Cyril's eucharistic" footnote splice in para 139.
  // The body word continues as "transforming" in para 141 — so leave "trans"
  // as a cut-off page-break truncation and drop the "13" footnote marker.
  ["trans13Cyril's eucharistic", "trans Cyril's eucharistic"],

  // Para 86 "10K nown" — strip leading "10 " footnote marker and rejoin "K nown" -> "Known"
  ['10K nown in Antiquity', 'Known in Antiquity'],

  // Para 107 "12He regarded" — strip "12" footnote marker
  ['12He regarded the question', 'He regarded the question'],

  // Para 146 "14Like the other Fathers" — strip "14" footnote marker
  ['14Like the other Fathers', 'Like the other Fathers'],

  // Para 15 "the Byzantine ad2 Cf." — "ad2" is footnote-marker insertion of
  // footnote text into body. Drop the "ad2 " noise; what follows is a footnote line.
  ['the Byzantine ad2 Cf.', 'the Byzantine. Cf.'],

  // Para 67 "from Alex9 Cyril's Letter 17" — "9" is footnote marker
  ['from Alex9 Cyril', 'from Alex. Cyril'],

  // Page-break headers that ran into the end of a body paragraph.
  // The text continues in the next paragraph; strip the page-header
  // (and the leading "de", "sanc", "under" stays as a cut-off truncation,
  // since paragraph boundaries are preserved per the brief).
  [' de90 ON THE UNITY OF CHRIST', ' de'],
  [' sanc114 ON THE UNITY OF CHRIST', ' sanc'],
  [' underST CYRIL OF ALEXANDRIA 117', ' under'],

  // Stray "*" used as opening quote in OCR
  ['phrase * strictly speaking', 'phrase "strictly speaking'],
  ['called * Appropriation Theory', 'called "Appropriation Theory'],
  ['"*Monophysite', '"Monophysite'],
  ['factors, "* he does not', 'factors," he does not'],
  ['And again: *As all men', 'And again: "As all men'],
  ['(Wis 1:13-14), * Yet through', '(Wis 1:13-14), "Yet through'],
];

function applySpecificFixes(text) {
  for (const [from, to] of specificFixes) {
    if (text.includes(from)) {
      // Count occurrences for tracking
      let count = 0;
      let idx = 0;
      while ((idx = text.indexOf(from, idx)) !== -1) {
        count++;
        idx += from.length;
      }
      text = text.split(from).join(to);
      track(`specific:${from} -> ${to}`, count);
    }
  }
  return text;
}

// ---------------------------------------------------------------------------
// 2. REGEX RULES
//    Applied AFTER specific fixes. These match generic patterns that may
//    cover multiple occurrences.
// ---------------------------------------------------------------------------

function applyRegexRules(text) {
  // --- Letter-confusion rules from the task brief (kept for any future
  //     occurrence; the corpus currently has zero of these) ---
  text = rxReplace(text, /\bwouid\b/g, 'would', 'wouid->would');
  text = rxReplace(text, /\bcouid\b/g, 'could', 'couid->could');
  text = rxReplace(text, /\bshouid\b/g, 'should', 'shouid->should');
  text = rxReplace(text, /\bIie\b/g, 'He', 'Iie->He');
  text = rxReplace(text, /\bIiim\b/g, 'him', 'Iiim->him');
  text = rxReplace(text, /\btbe\b/g, 'the', 'tbe->the');
  text = rxReplace(text, /\btlie\b/g, 'the', 'tlie->the');
  text = rxReplace(text, /\btliis\b/g, 'this', 'tliis->this');
  text = rxReplace(text, /\biuto\b/g, 'into', 'iuto->into');
  text = rxReplace(text, /\bwlien\b/g, 'when', 'wlien->when');
  text = rxReplace(text, /\bjoumey\b/g, 'journey', 'joumey->journey');
  text = rxReplace(text, /\bfhe\b/g, 'the', 'fhe->the');

  // 'etemal' / 'etemity' / 'etemally' (m mis-OCRd for rn)
  text = rxReplace(text, /\betemal\b/g, 'eternal', 'etemal->eternal');
  text = rxReplace(text, /\betemity\b/g, 'eternity', 'etemity->eternity');
  text = rxReplace(text, /\betemally\b/g, 'eternally', 'etemally->eternally');

  // 'bom' -> 'born' only in compound 'first-bom' etc. — too risky alone, fired by specifics.

  // --- "TM" (™) used as a closing double-quote ---
  // McGuckin's translation uses curly “smart” quotes. The OCR replaced many
  // closing right-double-quotes with the trademark symbol. This is safe to
  // do globally — ™ has no legitimate use in this 1995 academic translation.
  text = rxReplace(text, /™/g, '”', 'TM->right-quote');

  // --- Pipe character "|" used as the pronoun "I" ---
  // Survey of all 23 pipes in the corpus shows 22 are mid-sentence
  // standalone "I" and one is a stray bracket-close in a manuscript-lacuna
  // marker. The bracket case is handled by specific fixes above.
  // Pattern: pipe surrounded by spaces  ->  "I"
  text = rxReplace(text, / \| /g, ' I ', 'pipe-space->I');
  // Pipe at start of paragraph or after newline followed by space  ->  "I"
  text = rxReplace(text, /(^|\n)\| /g, '$1I ', 'pipe-paragraph-start->I');

  // --- Digit "1" used as the pronoun "I" mid-sentence ---
  // We only fire when:
  //   - "1" is between spaces (single token), AND
  //   - followed by a lowercase verb / clearly English continuation
  // We do NOT fire when followed by a capitalized Bible-book abbreviation
  // (1 Cor, 1 Pet, 1 Sam, 1 Tim, 1 Jn, 1 Kg) — those are real numbers.
  text = rxReplace(
    text,
    / 1 (will|shall|think|am|have|did|would|look|was|might|do|remember|say|too|announced|said|suppose|and|cannot|do not|don|but|then|know|might|never|am not|live)\b/g,
    ' I $1',
    'digit-1->I (verb context)'
  );

  // --- "7" used as a question mark after a closing parenthesis ---
  // OCR mistook the curl of "?" for digit "7".  Pattern: ")7" at the
  // end of a clause where a question-mark belongs.  Safe globally
  // because ")7" is never a legitimate sequence in this text.
  text = rxReplace(text, /\)7(?=\s|$)/g, ')?', 'paren-7->question');

  // --- Footnote-marker letters embedded between words ---
  // Specific footnote-letter insertions have been handled above.

  // --- Punctuation normalization ---
  // Doubled non-ellipsis period (".." but not "...")
  text = rxReplace(text, /(?<!\.)\.{2}(?!\.)/g, '.', 'doubled-period->single');
  // Doubled comma
  text = rxReplace(text, /,,/g, ',', 'doubled-comma->single');
  // Doubled semicolon
  text = rxReplace(text, /;;/g, ';', 'doubled-semicolon->single');

  // --- Whitespace normalization ---
  // Collapse runs of internal whitespace to a single space
  text = rxReplace(text, /[ \t]{2,}/g, ' ', 'multi-space->single');

  // --- Trim outer whitespace ---
  const trimmed = text.replace(/^\s+|\s+$/g, '');
  if (trimmed !== text) {
    track('outer-trim', 1);
    text = trimmed;
  }

  return text;
}

// ---------------------------------------------------------------------------
// 3. MAIN PASS
// ---------------------------------------------------------------------------

const samples = [];
let modifiedCount = 0;
let totalCount = 0;

for (const chapter of bundle.chapters || []) {
  for (const section of chapter.sections || []) {
    for (const paragraph of section.paragraphs || []) {
      totalCount++;
      const before = paragraph.text;
      let text = before;

      text = applySpecificFixes(text);
      text = applyRegexRules(text);

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
// 4. WRITE BACK
// ---------------------------------------------------------------------------

fs.writeFileSync(INPUT, JSON.stringify(bundle, null, 2) + '\n', 'utf8');

// ---------------------------------------------------------------------------
// 5. REPORT
// ---------------------------------------------------------------------------

console.log('Cyril of Alexandria - On the Unity of Christ - OCR fix pass');
console.log('============================================================');
console.log('Bundle:                ' + INPUT);
console.log('Total paragraphs:      ' + totalCount);
console.log('Modified paragraphs:   ' + modifiedCount);
console.log('');

const rules = Object.keys(ruleHits).sort();
console.log('Distinct rules applied: ' + rules.length);
console.log('');
console.log('Rules fired (with match counts):');
if (rules.length === 0) {
  console.log('  (none)');
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
    console.log('BEFORE: ' + s.before.substring(0, 300) + (s.before.length > 300 ? '...' : ''));
    console.log('AFTER:  ' + s.after.substring(0, 300) + (s.after.length > 300 ? '...' : ''));
  });
}
