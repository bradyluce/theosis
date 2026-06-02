#!/usr/bin/env node
/**
 * One-off OCR cleanup for Bp. Kallistos Ware, "The Orthodox Way"
 * (SVS Press, rev. 1995), scanned PDF -> OCR text.
 *
 * Reads content/generated/commentary/ware-the-orthodox-way.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative -- applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Latin terms, archaic English (-eth/-est,
 * thou/thee/thy), Scripture references, and digits are preserved.
 *
 * Idempotent: rules use word boundaries / phrase anchors so re-running is a
 * no-op once errors are fixed.
 *
 * Notes on what is NOT touched here:
 *   - The two index/glossary paragraphs at the back of the book (ch4 p386/387,
 *     p2666/p2672 in the JSON) are densely typeset two-column glossary text
 *     that came out as one big stream of letters+digits. Wholesale regex
 *     repair would be reckless -- those paragraphs are left as-is.
 *   - "wholesale word-split" patterns (e.g. "con templation", "out pouring",
 *     "Theo logian") are very common in this scan but they're real English
 *     fragments that *could* legitimately appear elsewhere. We only fix the
 *     exact phrases observed; we don't try to globally rejoin broken words.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/ware-the-orthodox-way.json',
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-anchored so legitimate English
// never matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- "of" + capitalized proper noun glued together ------------------------
  // The scanner repeatedly dropped the space between "of" and the following
  // capitalized word. Each of these is an unambiguous proper-noun phrase used
  // in patristic citations -- restrict to the exact "of<Noun>" pair so we don't
  // accidentally rewrite "offence" or "official" (which contain "of" + cap by
  // chance after lowercasing).
  // (ch3 p2 -- "Cross ofthe Saviour"; ch2 p0 -- "ofthe wise men"; etc.)
  [/\bofthe\b/g, 'of the', 'ofthe->of-the'],
  // ch1 p91 -- "stand in awe ofthee, all-holy Trinity"
  [/\bofthee\b/g, 'of thee', 'ofthee->of-thee'],
  // ch3 p131 (and several others)
  [/\bofthem\b/g, 'of them', 'ofthem->of-them'],
  // ch4 p169 (glossary entry: "Cyril ofAlexandria")
  [/\bofAlexandria\b/g, 'of Alexandria', 'ofAlexandria->of-Alexandria'],
  // ch4 -- "month ofApril"
  [/\bofApril\b/g, 'of April', 'ofApril->of-April'],
  // ch4 p126 -- "tower ofBabel" (Gen. 11:7)
  [/\bofBabel\b/g, 'of Babel', 'ofBabel->of-Babel'],
  // ch4 (glossary) -- "Antony ofEgypt"
  [/\bofEgypt\b/g, 'of Egypt', 'ofEgypt->of-Egypt'],
  // ch4 (glossary) -- "Irenaeus ofLyons"
  [/\bofLyons\b/g, 'of Lyons', 'ofLyons->of-Lyons'],
  // ch4 -- "Son ofMan"
  [/\bofMan\b/g, 'of Man', 'ofMan->of-Man'],
  // ch4 (section heading) -- "A Change ofMind"
  [/\bofMind\b/g, 'of Mind', 'ofMind->of-Mind'],
  // ch4 (glossary) -- "Gregory ofNyssa"
  [/\bofNyssa\b/g, 'of Nyssa', 'ofNyssa->of-Nyssa'],
  // ch4 (glossary) -- "Evagrius ofPontus"
  [/\bofPontus\b/g, 'of Pontus', 'ofPontus->of-Pontus'],
  // ch4 -- "Lord ofScripture" and "text ofScripture"
  [/\bofScripture\b/g, 'of Scripture', 'ofScripture->of-Scripture'],
  // Glossary -- "(I) oRmooox" etc; "ofSt" appears in author lists
  [/\bofSt\b/g, 'of St', 'ofSt->of-St'],

  // ---- "if" + word run-togethers (rare here) --------------------------------
  // ch1 p1 -- "As iffrom mouths offlame." -- two words ("if" / "from") merged.
  [/\biffrom\b/g, 'if from', 'iffrom->if-from'],
  // Same paragraph: "offlame" -- "of flame". Only this single occurrence.
  [/\bofflame\b/g, 'of flame', 'offlame->of-flame'],
  // ch4 p227 -- "pleasures offood and drink"
  [/\boffood\b/g, 'of food', 'offood->of-food'],
  // ch4 p219 -- "like a flame offire"
  [/\boffire\b/g, 'of fire', 'offire->of-fire'],

  // ---- "Theo logian" -- broken hyphenation at the page break ----------------
  // Restrict to the exact two-word fragment; standalone "Theo" is not a word
  // in this book. (ch4 p212 and ch1 -- "St Gregory the Theo logian")
  [/\bTheo logian\b/g, 'Theologian', 'Theo-logian->Theologian'],

  // ---- "Catho lic" -- broken hyphenation (ch0 p24 only) ---------------------
  [/\bCatho lic\b/g, 'Catholic', 'Catho-lic->Catholic'],

  // ---- "B ible" -- the proofreader split "Bible" across the column edge -----
  // 4 occurrences; the standalone capital "B" cannot start any other word in
  // this corpus that would be followed by "ible" with a space.
  [/\bB ible\b/g, 'Bible', 'B-ible->Bible'],

  // ---- "personally1" / "away 1 to" -- stray "1" used in place of comma/period
  // ch3 p16 -- "wipe away 1 to release him" => "wipe away, to release him"
  // (The OCR "1" here is the unmistakable scan of a comma; the surrounding
  // text is a clear comma-spliced relative clause.)
  [/\bwipe away 1 to release him\b/g, 'wipe away, to release him', 'away-1->away-comma'],
  // ch4 p63 -- "speak to me, personally1 the words of fire"
  // Here "1" stands in for a comma after "personally"; the surrounding clause
  // is a noun-phrase appositive that needs a comma to read correctly.
  [/\bpersonally1 the words of fire\b/g, 'personally, the words of fire', 'personally1->personally-comma'],

  // ---- "heavem" -- "heaven" mis-OCR'd with terminal m (ch0 p75 only) -------
  // Restrict to "in heavem" so we don't catch any unrelated -em ending.
  [/\bin heavem\b/g, 'in heaven', 'heavem->heaven'],

  // ---- "tenn" / "tenning" -- "term"/"terming" mis-OCR'd (n-r swap) ---------
  // ch3 p16 -- "a tenn that signifies"; ch2 p682 -- "by tenning evil 'nothing'"
  // Restrict to the exact phrases so we don't accidentally touch any -enn-
  // legitimate word.
  [/\ba tenn that\b/g, 'a term that', 'tenn-that->term-that'],
  [/\bby tenning evil\b/g, 'by terming evil', 'tenning-evil->terming-evil'],

  // ---- "whiCh" -- internal capital C (ch4 p63 only) ------------------------
  // No legitimate English word capitalises an internal C after "whi"; this is
  // OCR noise.
  [/\bwhiCh\b/g, 'which', 'whiCh->which'],

  // ---- "MutUal" -- internal capital U (ch1 p2 -- section heading) ----------
  [/\bMutUal Love\b/g, 'Mutual Love', 'MutUal-Love->Mutual-Love'],

  // ---- "undiVided" -- internal capital V (ch1 p515) ------------------------
  // Only one occurrence; surrounding sentence is "essence and undivided.'"
  [/\bundiVided\b/g, 'undivided', 'undiVided->undivided'],

  // ---- "PaJamas" -- "Palamas" mis-OCR'd capital-J for lowercase-l ----------
  // ch2 p664 -- "St Gregory PaJamas" -- the name appears correctly as
  // "Palamas" elsewhere in the book; "PaJamas" cannot be a real name.
  [/\bPaJamas\b/g, 'Palamas', 'PaJamas->Palamas'],

  // ---- "TheJesus Prayer" -- run-together with capital next word ------------
  // ch4 (glossary, p386 area, p2516 line) -- "TheJesus Prayer" -> "The Jesus Prayer"
  [/\bTheJesus Prayer\b/g, 'The Jesus Prayer', 'TheJesus->The-Jesus'],

  // ---- "TheHarp ofthe Spirit" -- title rendered with merged "The Harp" -----
  // ch4 p2429 -- "S. Brock, TheHarp ofthe Spirit"
  [/\bTheHarp\b/g, 'The Harp', 'TheHarp->The-Harp'],

  // ---- "SheiWood" -- proper name "Sherwood" mis-OCR'd (rh -> hi) ------------
  // ch4 p2531 -- "SheiWood {Ancient Christian Writers" -- this refers to the
  // translator Polycarp Sherwood. "SheiWood" is not a real name; the i+W
  // combination cannot start an English word.
  [/\bSheiWood\b/g, 'Sherwood', 'SheiWood->Sherwood'],

  // ---- "iMadochus" -- "Diadochus" mis-OCR'd ("D" garbled to "iM") ----------
  // ch4 p2240 -- "St iMadochus of Photike" -- St Diadochus of Photike is the
  // 5th-c. Greek ascetic. "iMadochus" cannot be a real word; the leading
  // lowercase-i then capital-M can never start a Greek personal name.
  [/\bSt iMadochus\b/g, 'St Diadochus', 'iMadochus->Diadochus'],

  // ---- "11ze" -- "The" mis-OCR'd (capital T + h ligature read as "11z") ----
  // ch4 p2240 -- "St iMadochus of Photike 11ze Jesus Prayer helps" --
  // Only one occurrence; phrase-anchor to be safe.
  [/\b11ze Jesus Prayer\b/g, 'The Jesus Prayer', '11ze->The'],

  // ---- "loannildos" -- "Ioannikios" mis-OCR'd (Greek saint name) -----------
  // ch1 p1 -- "Prayer of St loannildos" -- the saint is St Ioannikios the
  // Great (9th c.), and the glossary later correctly writes "Ioannikios"
  // (ch4 p2462). The leading "l" (lowercase ell) is an OCR misread of the
  // capital "I"; "ld" is a misread of "ki" (k loses its cross-bar).
  [/\bSt loannildos\b/g, 'St Ioannikios', 'loannildos->Ioannikios'],

  // ---- "Syriae Father" -- "Syriac Father" mis-OCR'd (c -> e) ---------------
  // ch4 p2429 -- "Ephrem the Syrian, St (c. 306-73): Syriae Father." --
  // "Syriae" is not a word; St Ephrem is a Syriac Father.
  [/\bSyriae Father\b/g, 'Syriac Father', 'Syriae->Syriac'],

  // ---- "Annunciation·" -- stray middle-dot footnote marker ------------------
  // ch1 p49 -- "At the Annunciation· the Father sends" -- the middle dot is
  // a footnote-anchor glyph the OCR retained as text; replace with a single
  // space so the sentence reads naturally.
  [/\bAnnunciation· the Father\b/g, 'Annunciation the Father', 'Annunciation-middot->Annunciation'],

  // ---- "him· self" -- middle dot used as soft hyphen across line break -----
  // ch3 p0 -- "reconciling the world unto him· self." -- middle dot is a stray
  // hyphenation glyph splitting "himself".
  [/\bhim· self\b/g, 'himself', 'him-middot-self->himself'],

  // ---- "0 " -- digit-zero misread for vocative O ---------------------------
  // The vocative "O Father", "O Lord", etc. is frequently OCR'd as "0 Father".
  // Restrict to vocative + capital-noun combinations actually present in the
  // book (Trinity hymns and prayers, ch1 p0/p1/p59, ch2 p587/p973, ch3 p1266).
  // We do NOT touch any standalone "0" that might be a section number.
  [/\b0 Father, my hope\b/g, 'O Father, my hope', '0-Father-vocative'],
  [/\b0 Son, my refuge\b/g, 'O Son, my refuge', '0-Son-vocative'],
  [/\b0 Holy Spirit, my protection\b/g, 'O Holy Spirit, my protection', '0-Holy-Spirit-vocative'],
  [/\b0 Trinity\b/g, 'O Trinity', '0-Trinity-vocative'],
  [/\b0 undivided Unity\b/g, 'O undivided Unity', '0-undivided-vocative'],
  [/\b0 heavenly King\b/g, 'O heavenly King', '0-heavenly-King-vocative'],
  [/\b0 Lord\b/g, 'O Lord', '0-Lord-vocative'],
  [/\b0 Christ\b/g, 'O Christ', '0-Christ-vocative'],
  [/\b0 Unity\b/g, 'O Unity', '0-Unity-vocative'],
  // Send, 0 Christ already covered by "0 Christ" above

  // ---- "wili.." -- "will." mis-OCR'd (terminal l read as i) + double dot ---
  // ch1 p49 -- "the work of Mary's free wili.. God waited for her" -- the
  // possessive context demands "free will."; "wili" is not a word.
  [/\bfree wili\.\.\s*God\b/g, 'free will. God', 'wili->will-period'],

  // ---- "alf" -- "all" mis-OCR'd (terminal l read as f) ---------------------
  // ch4 p1637 -- "'They were alf with one accord in one place' (Acts 2:1)"
  // -- the Acts citation is unambiguous: "all with one accord".
  [/\bThey were alf with\b/g, 'They were all with', 'alf-with->all-with'],

  // ---- "yourselfresponsible" / "himselfin" / "himselfendrely" ---------------
  // "self" + next-word merges where the next word is short and English.
  // ch4 p937 -- "you make yourselfresponsible in all sincerity"
  [/\byourselfresponsible\b/g, 'yourself responsible', 'yourselfresponsible->yourself-responsible'],
  // ch4 p1835 -- "concealing himselfin his very appearing"
  [/\bhimselfin\b/g, 'himself in', 'himselfin->himself-in'],
  // ch4 p2195 -- "Unless a man gives himselfendrely to the Cross" -- the
  // Colliander quotation reads "entirely" in print; "endrely" is the OCR
  // garble (n+t+i -> n+d+r; e/e preserved). Two errors stacked: merge AND
  // letter swap. We fix the merge but leave "endrely" -> see next rule.
  [/\bhimselfendrely\b/g, 'himself entirely', 'himselfendrely->himself-entirely'],

  // ---- "se1ee·" -- "selec-" mis-OCR'd (l->1, c->e, hyphen as middle dot) ---
  // ch4 p2429 -- "For a se1ee· tion of his hymns" -- the only word that fits
  // is "selection". Anchored to the exact two-token broken phrase.
  [/\bFor a se1ee· tion\b/g, 'For a selection', 'se1ee-tion->selection'],

  // ---- "(Fellow• ship" -- bullet glyph used as hyphen + broken word --------
  // ch4 p2429 -- "(Fellow• ship of St Alban and St Sergius, London, 1975)."
  [/\(Fellow• ship\b/g, '(Fellowship', 'Fellow-bullet-ship->Fellowship'],

  // ---- "every· where" -- middle-dot soft hyphen splitting "everywhere" -----
  // ch2 p664 -- "He is every· where and nowhere"
  [/\bevery· where\b/g, 'everywhere', 'every-middot-where->everywhere'],

  // ---- "A!hree" -- "A three" / "Athree" mis-OCR'd ("t" garbled to "!h") ---
  // ch0 p?? -- "A!hree 'J>ointers'" -- the section heading should read
  // "Three 'Pointers'" or similar; here we have a stray initial "A" then
  // "!hree". The "!" cannot be valid sentence-initial punctuation followed
  // by "hree". Replace with "Three" and drop the stray leading A+!.
  // ("J>ointers'" is its own mess but we leave it; "Three Pointers" is the
  // chapter section name visible in the TOC scan elsewhere.)
  [/\bA!hree '/g, "Three '", 'A!hree->Three'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes -- only for unambiguous cases.
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
console.log(
  'Sample before/after pairs (showing ' +
    Math.min(showCount, samples.length) +
    ' of ' +
    samples.length +
    '):',
);
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Show a window around the first differing character
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
    ' total):',
);
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
