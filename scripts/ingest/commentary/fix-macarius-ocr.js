#!/usr/bin/env node
/**
 * One-off OCR cleanup for Pseudo-Macarius Fifty Spiritual Homilies bundle.
 * Reads content/generated/commentary/macarius-egyptian.json, applies targeted
 * OCR-error corrections (only changes paragraph[].text), and writes back.
 *
 * Each rule is conservative — applies only where pattern is unambiguous.
 * Reports a summary + sample diffs to stdout.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/macarius-egyptian.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Each rule: a function that takes a paragraph text and returns the fixed text.
// We track which rule fired for sample reporting.
// ---------------------------------------------------------------------------

// Specific word-level corrections — every entry is a verified OCR error.
// Format: [/regex/, 'replacement', 'rule-name']
// The regex must be word-bounded so we don't catch valid English.
const wordFixes = [
  // 'hotise' -> 'house' (1:14, hapax)
  [/\bhotise\b/g, 'house', 'hotise->house'],
  // 'chanty' -> 'charity' (3:5, 19:18) — appears only twice; both are OCR for charity
  [/\bchanty\b/g, 'charity', 'chanty->charity'],
  // 'prophcsieth' -> 'prophesieth' (6:9, hapax)
  [/\bprophcsieth\b/g, 'prophesieth', 'prophcsieth->prophesieth'],
  // 'slftck' -> 'slack' (14:4, hapax)
  [/\bslftck\b/g, 'slack', 'slftck->slack'],
  // 'Epli' -> 'Eph' (15:103 footnote, hapax)
  [/\bEpli\b/g, 'Eph', 'Epli->Eph'],
  // 'eceive' -> 'receive' (15:132, hapax)
  [/\beceive\b/g, 'receive', 'eceive->receive'],
  // 'thqughts' -> 'thoughts' (16:15, hapax)
  [/\bthqughts\b/g, 'thoughts', 'thqughts->thoughts'],
  // 'eyev' -> 'eye,' (18:18, hapax — context "all eyev all spirit" → "all eye, all spirit")
  // The 'v' is an OCR misread comma after 'eye'.
  [/\beyev\b/g, 'eye,', 'eyev->eye,'],
  // 'htal' -> 'heal' (20:0, hapax)
  [/\bhtal\b/g, 'heal', 'htal->heal'],
  // 'beciuse' -> 'because' (20:1, hapax)
  [/\bbeciuse\b/g, 'because', 'beciuse->because'],
  // 'heavanly' -> 'heavenly' (20:1, hapax)
  [/\bheavanly\b/g, 'heavenly', 'heavanly->heavenly'],
  // 'becauses' -> 'because' (26:62, hapax — context "He is called the Saviour, becauses He saves")
  [/\bbecauses\b/g, 'because', 'becauses->because'],
  // 'thexlispensations' -> 'the dispensations' (29:1, hapax — run-together + xl→d)
  [/\bthexlispensations\b/g, 'the dispensations', 'thexlispensations->the dispensations'],
  // 'bittqr' -> 'bitter' (35:2, hapax)
  [/\bbittqr\b/g, 'bitter', 'bittqr->bitter'],
  // 'commandmentsconcerning' -> 'commandments concerning' (37:6, hapax — missing space)
  [/\bcommandmentsconcerning\b/g, 'commandments concerning', 'commandmentsconcerning->commandments concerning'],
  // 'Bui' -> 'But' (28:15, hapax — final 't' misread as 'i')
  [/\bBui\b/g, 'But', 'Bui->But'],
  // 'Tfiess' -> 'Thess' (50:14 footnote, hapax — 'h' misread as 'fi')
  [/\bTfiess\b/g, 'Thess', 'Tfiess->Thess'],
  // 'imto' -> 'unto' (1:39, hapax — context "Yea, I say imto you" = "I say unto you" KJV Luke 18:8)
  [/\bimto\b/g, 'unto', 'imto->unto'],
  // 'oj' -> 'of' (49:0, hapax — context "got rid oj the pleasure")
  [/\boj\b/g, 'of', 'oj->of'],
  // 'sour' -> 'soul' (50:11, hapax in this position — context "renewing his sour in gladness of heart")
  // Note: 'sour' is a real word; we restrict via specific phrase.
  [/\brenewing his sour\b/g, 'renewing his soul', 'renewing-his-sour->soul'],
  // 'Num. riii.' -> 'Num. xiii.' (50:7 — context "Num. riii., xiv., after the return of Joshua")
  [/\bNum\. riii\./g, 'Num. xiii.', 'Num.riii->Num.xiii'],
  // 'ens'iing' -> 'ensuing' (15:31 — apostrophe-iing is u-ing misread)
  [/\bens'iing\b/g, 'ensuing', 'ens-iing->ensuing'],
  // 'go*bd-looking' -> 'good-looking' (15:111 — asterisk is misread 'o')
  [/\bgo\*bd-looking\b/g, 'good-looking', 'go*bd-looking->good-looking'],
  // 'said *Mary' -> 'said, Mary' (12:45 — stray asterisk that disrupts word)
  [/\bsaid \*Mary\b/g, 'said, Mary', 'said-*Mary->said,-Mary'],
  // 'possesses!' -> 'possessest' (1:39 — final 't' misread as '!')
  [/\bpossesses! /g, 'possessest ', 'possesses!->possessest'],
  // 'Amosix.' -> 'Amos ix.' (50:253 — Scripture index missing space)
  [/\bAmosix\b/g, 'Amos ix', 'Amosix->Amos ix'],
];

// Glyph/punctuation level fixes — only for unambiguous cases.
const glyphFixes = [
  // ' / ' starting a Bible quote (e.g. ', / am the bread of life') — italicized I misread as /
  // Pattern: a punctuation/quote-end mark followed by '/ ' followed by a verb-form (am, will, etc).
  // Catch ', / Verb', ': / Verb', '? / Verb', etc.
  [/([,:;?]) \/ ([A-Za-z])/g, '$1 I $2', 'stray-slash-as-I'],
  // 'and again,/ am the bread' (34:1) — no space before /
  [/\band again,\/ am the bread\b/g, 'and again, I am the bread', 'and-again-slash-am'],
  // 'desires / to approve' (19:16) — stray slash mid-sentence; replace with single space
  [/\bdesires \/ to approve\b/g, 'desires to approve', 'stray-slash-desires-to'],
  // 'order I that' (19:16) — stray uppercase I; replace with single space
  [/\b in order I that the Lord\b/g, ' in order that the Lord', 'stray-I-in-order-that'],
  // 'com- I pelling' (19:16) — hyphenated word split, stray I between
  [/\bcom- I pelling\b/g, 'compelling', 'com-I-pelling->compelling'],
  // 'f~ 6.' (19:16) — stray glyphs at paragraph start before section number
  [/^f~ 6\. /gm, '6. ', 'f~-section-start'],
  // '// is' starting a paragraph — should be 'It is' (49:0, 50:0)
  [/^\/\/ is /gm, 'It is ', '//-is->It-is'],
  // '// any/so/ye' at start of Bible quotation — should be 'If'
  // Need to match after various sentence-end punctuation
  // ', // word' (5:19 etc.)
  [/, \/\/ ([a-z])/g, ', If $1', '//-If-after-comma'],
  // '. //, it says' (5:50): period + space + // + comma + space
  [/\binto\. \/\/, it says\b/g, 'into. If, it says', '//-If-into'],
  // '! // so be' (5:61)
  [/\bus! \/\/ so be\b/g, 'us! If so be', '//-If-us!'],
  // '. // any' or '. // some' — sentence-start If after period
  [/\. \/\/ ([a-z])/g, '. If $1', '//-If-after-period'],
  // 'A ~ Man' (6:15) — stray tilde between A and capital word
  [/\bA ~ Man\b/g, 'A Man', 'A-tilde-Man->A-Man'],
  // 'h?' (9:3) — '?' is misread 'e'
  [/, h\? fled\b/g, ', he fled', 'h?->he'],
  // 'glory.,l' (5:63) — comma-l is misread footnote 1
  [/\bglory to glory\.,l\b/g, 'glory to glory.1', 'glory.,l->glory.1'],
  // 'her., 3.' (1:5) — stray comma after period before section number
  [/\bdirects her\., 3\. /g, 'directs her. 3. ', 'her.,->her.'],
  // 'passions..' (1:21) — doubled period
  [/\blife of bad passions\.\. /g, 'life of bad passions. ', 'passions..->passions.'],
  // 'hinders..Certainly' (27:53) — doubled period + missing space
  [/\bhinders\.\.Certainly\b/g, 'hinders. Certainly', 'hinders..->hinders.'],
  // 'Christ..To' (39:1) — doubled period + missing space
  [/\bChrist\.\.To\b/g, 'Christ. To', 'Christ..To->Christ. To'],
  // 'poor.. Upon' (40:8) — doubled period (period already followed by space)
  [/\bto the poor\.\. Upon\b/g, 'to the poor. Upon', 'poor..->poor.'],
  // 'vision,, and' (7:12) — doubled comma
  [/\bvision,, and\b/g, 'vision, and', 'vision,,->vision,'],
  // 'case,, you' (22:2) — doubled comma
  [/\bcase,, you\b/g, 'case, you', 'case,,->case,'],
  // 'good^finish' (11:40) — caret instead of space
  [/\bgood\^finish\b/g, 'good finish', 'good^finish->good finish'],
  // 'heavens/' We' (5:50) — slash misread period before close-quote
  [/\bin the heavens\/' We\b/g, "in the heavens.' We", 'heavens-slash-quote'],
  // 'rests/ require' (15:115) — slash misread comma
  [/\bthe Lord rests\/ require\b/g, 'the Lord rests, require', 'rests-slash-require'],
  // 'words/thou' (17:36) — slash misread comma
  [/\bforce of words\/thou\b/g, 'force of words, thou', 'words-slash-thou'],
  // 'only /will' (19:19) — stray slash before italicized word
  [/\bif he only \/will, he\b/g, 'if he only will, he', 'only-slash-will'],
];

// Citation 'z' -> '2' fix — restricted to footnote-context patterns where 'z' stands
// alone surrounded by a citation abbreviation. The 'z' in these positions is OCR
// misreading of the digit '2' as a footnote number between citations.
// We use very narrow regex matches: ' z Matt.', ' z John', ' z Rom.', etc. — only
// patterns where 'z' is followed by a known Scripture book abbreviation.
//
// We also handle the case where z is followed by 'i Foo' (small i = 1).
const scriptureBookAbbrevs = [
  'Gen', 'Ex', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', 'Sam', 'Kings', 'Chron',
  'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Cant', 'Song', 'Is', 'Isa',
  'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jon', 'Mic', 'Nah',
  'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom',
  'Cor', 'Gal', 'Eph', 'Phil', 'Col', 'Thess', 'Tim', 'Tit', 'Phm', 'Heb', 'Jas',
  'Pet', 'Jude', 'Rev', 'Apoc', 'Hi', 'Cp',
];
const bookPattern = scriptureBookAbbrevs.join('|');
const citationZRegex = new RegExp(' z (' + bookPattern + ')\\b', 'g');
// Also match 'z i Foo', 'z I Foo', or 'z 2 Foo' (numbered citation forms — i and I both = 1)
const citationZNumRegex = new RegExp(' z (i|I|2) (' + bookPattern + ')\\b', 'g');
// Special case for 'z Johni' where Johni is malformed John i (12:20)
const citationZJohniRegex = / z Johni\b/g;
// Citation z at the start of a footnote-only paragraph (5:7)
const citationStartZRegex = new RegExp('^z (' + bookPattern + ')\\b', '');

// Stats and samples
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
      // Apply word-level fixes
      for (const [re, repl, name] of wordFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      // Apply glyph-level fixes
      for (const [re, repl, name] of glyphFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      // Apply citation 'z' -> '2' fixes via regex (footnote markers in citations)
      let before2 = text;
      text = text.replace(citationZNumRegex, ' 2 $1 $2');
      if (text !== before2) firedRules.push('citation-z-num->2');
      before2 = text;
      text = text.replace(citationZRegex, ' 2 $1');
      if (text !== before2) firedRules.push('citation-z->2');
      before2 = text;
      text = text.replace(citationZJohniRegex, ' 2 Johni');
      if (text !== before2) firedRules.push('citation-z-johni');
      before2 = text;
      text = text.replace(citationStartZRegex, '2 $1');
      if (text !== before2) firedRules.push('citation-z-start');
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
const showCount = process.argv.includes('--all') ? samples.length : 20;
console.log('Sample before/after pairs (showing ' + showCount + ' of ' + samples.length + '):');
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Find the first differing position to show context
  let diffStart = 0;
  while (diffStart < before.length && diffStart < after.length && before[diffStart] === after[diffStart]) diffStart++;
  const ctxStart = Math.max(0, diffStart - 30);
  const beforeSnippet = before.slice(ctxStart, diffStart + 80);
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 80);
  console.log(`Ch${chOrder} para${idx}: [${rules.join(',')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('All ' + samples.length + ' rule firings:');
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
