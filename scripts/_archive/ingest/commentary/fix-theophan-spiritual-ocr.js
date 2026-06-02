#!/usr/bin/env node
// Fix OCR transcription errors in theophan-spiritual-life.json.
//
// Strategy:
//   1. Strip running-header artifacts: "<word> <pageNum>\n\n<ALL-CAPS HEADER> <continuation>"
//      collapses to a single space at the original join site.
//   2. Repair caret/circumflex OCR artifacts. The scanner mangled "W" (and adjacent
//      ligatures) in many ways: `W^`, `\^`, `^^`, `^X^`, `YC^`, `XC^`, `JC^`, `M^`,
//      `V^`, `Y(/^`, `0(/`, etc. Most of these collapse cleanly to "W".
//   3. Repair OCR'd apostrophes that became spaces, asterisks, or carets:
//      "God s" → "God's", "one*s" → "one's", "God^s" → "God's", "don t" → "don't".
//   4. Fix word-level OCR garbage: `becciTTie`→`became`, `doTTiinion`→`dominion`,
//      `Septiiagint`→`Septuagint`, etc.
//   5. Fix scripture-italics OCR: `UTiTnciTTicd ivoTTiciTi ccLvcth Jof thc things
//      oj^the Lord, that she Tnciy he holy` → "The unmarried woman careth for the
//      things of the Lord, that she may be holy" (1 Cor. 7:34, KJV).
//   6. Fix scripture reference garbage: `Christ{2 Cor.`→`Christ (2 Cor.`,
//      `Ep\\Qs\ 2ins 5.15-16`→`Ephesians 5:15-16`, `Sirach 7*39`→`Sirach 7:39`, etc.
//   7. Repair run-together words from missing spaces: `ofthe`→`of the`,
//      `expectedfrom`→`expected from`, etc.

const fs = require('fs');
const path = require('path');

const BUNDLE_PATH = path.join(
  process.cwd(),
  'content',
  'generated',
  'commentary',
  'theophan-spiritual-life.json',
);

// ---------- Helpers ----------

// Tracks which rules fired so we can report.
const ruleStats = Object.create(null);
function bump(rule, n = 1) {
  ruleStats[rule] = (ruleStats[rule] || 0) + n;
}

// Apply a regex replacement and track hits.
// IMPORTANT: when `replacement` is a string with $1/$2 backreferences, we must let
// String.prototype.replace expand them — which it only does if the replacement is
// a string (not a function). So we do the count via a probe pass then run the real
// replace with the original string.
function applyRule(text, rule, re, replacement) {
  if (typeof replacement === 'function') {
    let count = 0;
    const out = text.replace(re, (...args) => {
      count++;
      return replacement(...args);
    });
    if (count > 0) bump(rule, count);
    return out;
  }
  // String replacement — count first, then apply.
  re.lastIndex = 0;
  const matches = text.match(re);
  const count = matches ? matches.length : 0;
  if (count > 0) bump(rule, count);
  return text.replace(re, replacement);
}

// ---------- Running-header header list ----------
// These appear mid-paragraph as "<pageNum>\n\n<HEADER> <continuation>". The "headers"
// are all-caps page headers from the print edition. We list the ones actually present
// (from the survey pass) so we don't accidentally strip legitimate ALL-CAPS phrases
// inside a paragraph (which the survey showed do not exist in this bundle).
const RUNNING_HEADERS = [
  'THE SPIRITUAL LIFE',
  'THE NATURE OF MAN',
  'RENEWAL AND SELF-CLEANSING',
  'TRUE SPIRITUAL ZEAL',
  'COUNSELS BEFORE CONFESSION',
  'LIFE ACCORDING TO THE SPIRIT',
  'STAYING ON THE TRUE PATH',
  'FREE RESOLVE TO LIVE ACCORDING TO GRACE',
  'DILIGENT CONFESSION',
  'REMEMBRANCE OF GOD',
  'UNDISTRACTED PRAYER',
  'WARFARE WITH THE PASSIONS',
  'WARFARE WITH PASSIONATE THOUGHTS',
  'THE HIDDEN ACTION OF GRACE',
  'INNER CONCENTRATION',
  'THE INNER STATE',
  'PATH OF A VIRTUOUS LIFE',
  'REPENTANCE AND COMMUNION',
  'INNER PEACE',
  'THE TRUE PATH',
  'A PRAYER RULE',
  'MOVEMENTS OF THE PASSIONS',
  'DEVELOPMENT OF PASSIONS',
  'CLEANSING THE HEART',
  'NEED OF A GOOD COUNSELOR',
  'THE TRUE GOAL OF LIFE',
  'THE ONE THING NEEDFUL',
  'ANCESTRAL SIN',
  'UNION WITH GOD',
  'UPLIFTING OF FALLEN MAN',
  'THE ACTIVITY OF GRACE',
  'PATIENCE AND CONSTANCY',
  'INITIAL YEARNING',
  'CONDUCT AT HOME',
  'PREPARATION FOR CONFESSION',
  'THE WILL OF GOD',
  'A CONSCIOUS RENEWAL OF THE VOWS GIVEN AT BAPTISM',
  'THE ENEMY LEADS ONE ASTRAY',
  'CAUSES OF SPIRITUAL COOLING',
  'UNCEASING REMEMBRANCE OF GOD',
  'A GOD-PLEASING LIFE',
  'THE GOD-PLEASING LIFE',
  'LIVE ACCORDING TO GRACE',
  'DISPOSITION OF ONE’S HEART',
  'THE COVERING OF THE SOUL',
  'EMPTINESS',
  'THE LIFE OF THE SOUL',
  'THE INTELLECTUAL ASPECT',
  'THE DESIROUS ASPECT',
  'THE HEART AND THE ASPECT OF SENSE',
  'THE ASPECT OF SENSE',
  'FAITH IN THE EXISTENCE OF GOD',
  'THE INFLUENCE OF THE SPIRIT ON THE SOUL',
  'THE SUPREMACY OF SPIRITUAL LIFE',
  'HOW THE SAINTS HEAR OUR PRAYERS',
  'UHOW THE SAINTS HEAR OUR PRAYERS', // OCR variant
  'THE NECESSITY OF UNION WITH GOD',
  'THE REDEMPTIVE UPLIFTING OF FALLEN MAN',
  'THE MYSTERY OF REPENTANCE AND COMMUNION',
  'VARIOUS CAUSES OF SPIRITUAL COOLING',
  'HOW TO ATTAIN UNDISTRACTED PRAYER',
  'THE SLIGHTEST MOVEMENTS OF THE PASSIONS',
  'THE DEVELOPMENT OF PASSIONS',
  'THE GOAL OF SPIRITUAL LIFE',
  'THE BURDENS OF LIFE',
  'TRUE SPIRITUAL ZEAL',
  'THE TRUE PATH OF LIFE',
  'THE BURDENS OF LIFE',
  'SPIRITUAL PROFIT',
  'BURNING LOVE FOR GOD',
  'OBSTACLE TO THE SPIRIT',
  'GUARDING THE HEARING AND SIGHT',
  'ACTIVE WARFARE',
  'SINGING AND MUSIC',
  'JOURNEY TO ST',
  'A JOURNEY TO THE ST',
  'DEPRESSION AND FEAR',
  'THE READING OF BOOKS',
  'ON COLDNESS IN PRAYER',
  'RENUNCIATION OF THE WORLD',
  'THE VOW OF CHASTITY',
  'YEARNING FOR MONASTIC LIFE',
  'THE TRICKS OF THE ENEMY',
  'TEMPTATIONS FROM UNBELIEVERS',
  'INJUSTICE AND FALSE ACCUSATION',
  'FINAL ANXIETIES AND DISTURBANCES',
  'EXAMPLES OF THE',
  'GENERAL RULES FOR',
  'WARNINGS TO ONE ON THE',
  'THE DISTURBANCE IN THE NATURE OF MAN',
  'REPENTANCE AND COMMUNION',
];

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a regex that matches "<pageNum>\n\n<HEADER>(?:\s+continuation)?" inside a paragraph.
// Replace the entire match with a single space — the surrounding text already supplies word
// boundaries on each side (the page number is preceded by a word + space; the header is
// followed by another word + space, which continues the sentence).
function stripRunningHeaders(text) {
  let out = text;
  const headers = RUNNING_HEADERS.map(escapeForRegex).join('|');

  // Form 1: "<page><newline><newline><HEADER><space>" → " " (joins two halves of a sentence)
  // The OCR slurped both the page header and the preceding/following sentence pieces into
  // one text blob.
  const re = new RegExp('\\s*\\d{1,3}\\s*\\n\\n(' + headers + ')\\b', 'g');
  out = out.replace(re, (m, hdr) => {
    bump('runningHeaderStrip:' + hdr, 1);
    return ' ';
  });

  // Form 2: "<pagenum> [*.] <HEADER>" → " " (intra-paragraph chapter footer + next section
  // header). This handles the "May the Lord bless you! 71 * ON COLDNESS IN PRAYER ..."
  // case where a sentence is followed by page-number + asterisk-footnote-marker + section
  // header all within one paragraph.
  const re2 = new RegExp('\\s+\\d{1,3}\\s*[\\*\\.]?\\s*(' + headers + ')\\s', 'g');
  out = out.replace(re2, (m, hdr) => {
    bump('inlineHeaderStrip:' + hdr, 1);
    return ' ';
  });

  // Tidy: collapse the resulting "  " back to " "
  out = out.replace(/  +/g, (m) => {
    bump('collapseDoubleSpace', 1);
    return ' ';
  });
  return out;
}

// ---------- Per-paragraph fix pipeline ----------

function fixParagraph(text) {
  let t = text;

  // 0. Strip running headers BEFORE caret normalization so the regex anchors are stable.
  t = stripRunningHeaders(t);

  // 1. Caret/circumflex artifacts. These are the dominant OCR signature.
  //    Each rule below is conservative and ordered: more-specific forms first.

  // 1a. Highly specific multi-char OCR noise → "W"
  t = applyRule(t, 'caret:Y(/^h → Wh', /Y\(\/\^h/g, 'Wh');
  t = applyRule(t, 'caret:0(/h → Wh (sentence-start ^0(/h)', /\^0\(\/h/g, ' Wh');
  t = applyRule(t, 'caret:^^C^e → We', /\^\^C\^e/g, 'We');
  t = applyRule(t, 'caret:^X^h → Wh', /\^X\^h/g, 'Wh');
  t = applyRule(t, 'caret:^X^a → Wha', /\^X\^a/g, 'Wha');
  t = applyRule(t, 'caret:^XHiat → What', /\^XHiat/g, 'What');
  t = applyRule(t, 'caret:^XTen → When', /\^XTen/g, 'When');
  t = applyRule(t, 'caret:^J7hat → What', /\^J7hat/g, 'What');
  t = applyRule(t, 'caret:^JC^hen → When', /\^JC\^hen/g, 'When');
  t = applyRule(t, 'caret:^JC^hile → While', /\^JC\^hile/g, 'While');
  t = applyRule(t, 'caret:^JCHiat → What', /\^JCHiat/g, 'What');

  // 1b. "YC^" / "XC^" / "JC^" / "M^" / "V^" / "W^" + lowercase → "W<lower>"
  t = applyRule(t, 'caret:YC^L → WL', /YC\^([A-Za-z])/g, 'W$1');
  t = applyRule(t, 'caret:XC^L → WL', /XC\^([A-Za-z])/g, 'W$1');
  t = applyRule(t, 'caret:JC^L → WL', /JC\^([A-Za-z])/g, 'W$1');
  t = applyRule(t, 'caret:M^L → WL', /\bM\^([a-z])/g, 'W$1');
  t = applyRule(t, 'caret:V^L → WL', /\bV\^([a-z])/g, 'W$1');
  t = applyRule(t, 'caret:X^L → WL', /\bX\^([a-z])/g, 'W$1');
  t = applyRule(t, 'caret:W^L → WL', /\bW\^([a-z])/g, 'W$1');
  // ^^ at sentence-start (after space or punctuation) → "W"
  t = applyRule(t, 'caret:start-^^L → WL', /(^|[\s])\^\^([A-Za-z])/g, '$1W$2');
  // \^L → WL (backslash-caret form)
  t = applyRule(t, 'caret:\\^L → WL', /\\\^([A-Za-z])/g, 'W$1');
  // C^e (only when isolated; we already handled trailing forms)
  t = applyRule(t, 'caret:C^e (standalone) → We', /(^|[\s])C\^e\b/g, '$1We');

  // 1c. Asterisk-prefix "^*I" actually marks an editorial footnote — leave the
  //     superscript-1 alone, drop the noise.
  //     Pattern: "destroy that ^*I myself" → "destroy that I myself"
  t = applyRule(t, 'caret:^*I → I', /\^\*I\b/g, 'I');

  // 1d. Mid-word carets that are intra-syllable artifacts.
  t = applyRule(t, 'caret:ow^n → own', /\bow\^n\b/g, 'own');
  t = applyRule(t, 'caret:ever^hing → everything', /\bever\^hing\b/g, 'everything');
  t = applyRule(t, 'caret:personalit^He → personality. He', /\bpersonalit\^He\b/g, 'personality. He');
  t = applyRule(t, 'caret:Cellv^diS → Cell is', /\bCellv\^diS\b/g, 'Cell is');
  t = applyRule(t, 'caret:rec^uires → requires', /\brec\^uires\b/g, 'requires');
  t = applyRule(t, 'caret:oj^a → of a', /\boj\^a\b/g, 'of a');
  t = applyRule(t, 'caret:oj^the → of the', /\boj\^the\b/g, 'of the');
  t = applyRule(t, 'caret:^ovenie → govenie', /\^ovenie\b/g, 'govenie');
  t = applyRule(t, 'caret:Y^nnxv^govenie → during govenie', /Y\^nnxv\^govenie/g, 'during govenie');
  t = applyRule(t, 'caret:worcls^£7T^, → words,', /\bworcls\^£7T\^,/g, 'words,');
  // "Theoph an" / "Th eo ph an" → "Theophan" — first-name OCR with stray spaces.
  t = applyRule(t, 'word:Theoph an → Theophan', /\bTheoph an\b/g, 'Theophan');
  t = applyRule(t, 'word:Th eo ph an → Theophan', /\bTh eo ph an\b/g, 'Theophan');
  // "saints—^who" → "saints—who", "this—^we" → "this—we", "inclined—^whether" etc.
  t = applyRule(t, 'caret:emdash-caret', /—\^([A-Za-z])/g, '—$1');
  // "idolatry,^God" → "idolatry, God" (list-comma footnote marker + lost space)
  t = applyRule(t, 'caret:comma-caret-cap → comma-space', /,\^([A-Z])/g, ', $1');
  // "would^not" → "would not"
  t = applyRule(t, 'caret:would^not → would not', /\bwould\^not\b/g, 'would not');

  // 1e. Footnote-marker carets at sentence end: "word.^ " → "word. " (drop marker)
  //     and "word.^" followed by newline → "word."
  t = applyRule(t, 'caret:sentence-end ".^ " → ". "', /\.\^(\s)/g, '.$1');
  t = applyRule(t, 'caret:sentence-end ".^" → "."', /\.\^$/gm, '.');
  // "creation.^ ”" — the ^ is between period and a closing curly quote.
  t = applyRule(t, 'caret:between . and ”', /\.\^\s*”/g, '.”');
  // "devour^." → "devour."
  t = applyRule(t, 'caret:word^.', /([a-z])\^\./g, '$1.');
  // bare " ^ " adrift in the text — drop it
  t = applyRule(t, 'caret:bare " ^ "', / \^ /g, ' ');
  // "^5", "^3", "^0", "7^" at sentence boundary — footnote digit markers
  t = applyRule(t, 'caret:^digit (footnote marker)', /\s\^\d\s/g, ' ');
  t = applyRule(t, 'caret:digit^ (footnote marker)', /\s\d\^(\s|$)/g, ' ');

  // 1f. Possessive/contraction OCR
  t = applyRule(t, 'caret:God^s → God\'s', /\bGod\^s\b/g, "God’s");
  t = applyRule(t, 'caret:Lord^s → Lord\'s', /\bLord\^s\b/g, "Lord’s");
  t = applyRule(t, 'caret:sun^s → sun\'s', /\bsun\^s\b/g, "sun’s");
  t = applyRule(t, 'caret:Augustine^ → Augustine,', /\bAugustine\^/g, 'Augustine,');
  // Trailing "word^" at end of sentence that isn't a footnote marker (very rare) — leave
  // alone unless explicitly listed above. The footnote-trailing carets we've already
  // stripped via ".^" rule.

  // 1g. Caret following a closing parenthesis is a pure footnote marker — drop it.
  //     e.g. "Heaven)^" → "Heaven)".
  t = applyRule(t, 'caret:")^" → ")"', /\)\^/g, ')');
  // 1h. Caret following a comma is a footnote marker — drop it.
  //     e.g. "proud,^ covetousness" → "proud, covetousness".
  t = applyRule(t, 'caret:",^" → ","', /,\^/g, ',');
  // 1i. Trailing carets after a letter, where the following character is whitespace, are
  //     OCR drops of commas in a list-of-clauses context.
  //     Examples: "concepts^ which", "digestive^ which", "intellect^ whose",
  //     "suppositions^ in total", "prudence^ which is the same", "spirit^ while",
  //     "not^ expressing", "saints—^who" (handled above as em-dash).
  //     We replace "<letter>^ " with "<letter>, ".
  t = applyRule(t, 'caret:trailing word^ <space> → word,<space>', /([A-Za-z])\^(\s)/g, '$1,$2');
  // 1j. Caret at very end of a paragraph (no whitespace follows) → drop.
  t = applyRule(t, 'caret:trailing word^ at end of para', /([A-Za-z])\^$/g, '$1');

  // 1k. Final mop-up: any stray "^" remaining in the text after the above rules
  //     is OCR noise. Drop it.
  t = applyRule(t, 'caret:residual ^ → drop', /\^/g, '');

  // 2. Asterisk for apostrophe (use curly apostrophe to match book's typographic style)
  t = applyRule(t, 'apos:one*s → one’s', /\bone\*s\b/g, 'one’s');
  t = applyRule(t, 'apos:parents* → parents’', /\bparents\*/g, 'parents’');

  // 3. Greater-than glyph: "Lx>rd" → "Lord"
  t = applyRule(t, 'word:Lx>rd → Lord', /\bLx>rd\b/g, 'Lord');

  // 4. Backslash artifacts in scripture references and elsewhere.
  //    These are very specific OCR'd scripture refs.
  t = applyRule(t,
    'scripture:willofGod{\\2:\\-2 → will of God (Rom. 12:1-2)',
    /willofGod\{\\2:\\-2\)/g,
    'will of God (Rom. 12:1-2)',
  );
  t = applyRule(t,
    'scripture:Christ{2 Cor. → Christ (2 Cor.',
    /Christ\{2 Cor\./g,
    'Christ (2 Cor.',
  );
  t = applyRule(t,
    'scripture:Ep\\\\Qs\\ 2ins 5.15-16 → Ephesians 5:15-16',
    /\{Ep\\\\Qs\\ 2ins 5\.15-16\)/g,
    '(Ephesians 5:15-16)',
  );
  t = applyRule(t,
    'scripture:{\\ Cor. 7:32,34) → (1 Cor. 7:32,34)',
    /\{\\ Cor\. 7:32,34\)/g,
    '(1 Cor. 7:32,34)',
  );
  t = applyRule(t,
    'scripture:T\\\\q first \\s → The first is',
    /T\\\\q first \\s\b/g,
    'The first is',
  );
  t = applyRule(t,
    'scripture:^\\\\Q. fiourth → The fourth',
    /\^\\\\Q\. fiourth\b/g,
    'The fourth',
  );
  // After caret-strip the same residue can appear as "\\Q. fiourth"
  t = applyRule(t,
    'scripture:\\\\Q. fiourth → The fourth',
    /\\\\Q\. fiourth\b/g,
    'The fourth',
  );
  // Same for "T\\q first \s" → "The first is"
  t = applyRule(t,
    'scripture:residual T\\\\q first \\s → The first is',
    /T\\\\q first \\s\b/g,
    'The first is',
  );
  t = applyRule(t,
    'scripture:Sirach 7*39 → Sirach 7:39',
    /Sirach 7\*39/g,
    'Sirach 7:39',
  );
  t = applyRule(t,
    'scripture:body is ours\\ → body is ours;',
    /body is ours\\/g,
    'body is ours;',
  );
  t = applyRule(t,
    'scripture:business\\ (be) → business; (be)',
    /business\\ \(be\)/g,
    'business; (be)',
  );
  t = applyRule(t,
    'scripture:every G\\ → every G',
    /every G\\/g,
    'every G',
  );
  t = applyRule(t,
    'scripture:Lord, \\*^Tko → Lord, Who',
    /\\\*\^Tko/g,
    'Who',
  );
  // After caret-strip we may see "\*Tko" (backslash-asterisk-Tko)
  t = applyRule(t,
    'scripture:residual \\*Tko → Who',
    /\\\*Tko/g,
    'Who',
  );
  t = applyRule(t,
    'scripture:siftyou as wheat} → sift you as wheat.',
    /siftyou as wheat\}/g,
    'sift you as wheat.',
  );
  t = applyRule(t,
    'scripture:Spiritual Life} → Spiritual Life.',
    /Spiritual Life\}/g,
    'Spiritual Life.',
  );

  // 5b. Italicized titles: OCR scanned italic open-parens as "{". Standalone "{Word"
  //     where Word is a Title-case noun is an italicized parenthetical title.
  t = applyRule(t, 'brace:{Polnyy → (Polnyy',
    /\{Polnyy\b/g, '(Polnyy');
  t = applyRule(t, 'brace:{Pilgrim) → (Pilgrim)',
    /\{Pilgrim\)/g, '(Pilgrim)');
  t = applyRule(t, 'brace:{Complete → (Complete',
    /\{Complete\b/g, '(Complete');

  // 5. Scripture italics OCR garbage (1 Cor 7:34 KJV)
  //    Original OCR: "UTiTnciTTicd ivoTTiciTi ccLvcth Jof thc things oj^the Lord,
  //    that she Tnciy he holy both in mind andspirit"
  //    KJV: "The unmarried woman careth for the things of the Lord, that she may be
  //    holy both in body and in spirit"
  //    (oj^the already → "of the" above; we still need to fix the others)
  t = applyRule(t,
    'scripture:UTiTnciTTicd ivoTTiciTi ccLvcth Jof thc → The unmarried woman careth for the',
    /UTiTnciTTicd ivoTTiciTi ccLvcth Jof thc\b/g,
    'The unmarried woman careth for the',
  );
  t = applyRule(t,
    'scripture:Tnciy he holy → may be holy',
    /\bTnciy he holy\b/g,
    'may be holy',
  );
  // GOVENIE: scripture italics OCR garbage
  //   "One who hcts vesolved to stand on the path oj^a vivtuous lije must
  //    consciouslyfast. Instvuctwn on pwpev ^ovenie."
  //   →
  //   "One who has resolved to stand on the path of a virtuous life must
  //    consciously fast. Instruction on proper govenie."
  //   (oj^a → "of a" already; ^ovenie → "govenie" already)
  t = applyRule(t, 'scripture:hcts vesolved → has resolved',
    /\bhcts vesolved\b/g, 'has resolved');
  t = applyRule(t, 'scripture:vivtuous lije → virtuous life',
    /\bvivtuous lije\b/g, 'virtuous life');
  t = applyRule(t, 'scripture:consciouslyfast → consciously fast',
    /\bconsciouslyfast\b/g, 'consciously fast');
  t = applyRule(t, 'scripture:Instvuctwn → Instruction',
    /\bInstvuctwn\b/g, 'Instruction');
  t = applyRule(t, 'scripture:pwpev → proper',
    /\bpwpev\b/g, 'proper');
  // "Ehe conduct" → "The conduct"
  t = applyRule(t, 'scripture:Ehe → The', /\bEhe\b/g, 'The');

  // 6. Word-level OCR garbage
  const wordFixes = [
    ['Septiiagint', 'Septuagint'],
    ['doTTiinion', 'dominion'],
    ['becciTTie', 'became'],
    ['fiill', 'full'],
    ['fiirther', 'further'],
    ['fiijih', 'fifth'],
    ['utiites', 'unites'],
    ['utid', 'and'],
    ['cotnbines', 'combines'],
    ['tiuturul', 'natural'],
    ['Divitic', 'Divine'],
    ['gruc6', 'grace'],
    ['Watchfiilness', 'Watchfulness'],
    ['movemeiit', 'movement'],
    ['ExpLznution', 'Explanation'],
    ['ExpLznution', 'Explanation'],
    ['ISdysteries', 'Mysteries'],
    ['hdysteries', 'mysteries'],
    ['Adystery', 'Mystery'],
    ['Adysteries', 'Mysteries'],
    ['harmbny', 'harmony'],
    ['circumspectlyl', 'circumspectly'],
    ['Secondlyy', 'Secondly'],
    ['thoughtsy', 'thoughts'],
    ['theie', 'there'],
    ['Vdtile', 'While'],
    ['matushka', 'matushka'], // Russian term — preserve as-is.
    ['ii6', '116'],
    ['ii8', '118'],
    ['lOO', '100'],
    ['lOI', '101'],
    ['2o6', '206'],
    ['9o', '90'],
    ['Lordy', 'Lord,'],
    ['lordy', 'lord,'],
    ['Christy', 'Christ,'],
    ['Gody', 'God,'],
    ['Lenty', 'Lent,'],
    ['Gentury', 'Century'],
    ['epithemey', 'epitimia'],
    ['youy', 'you,'],
    ['bodyy', 'body,'],
    ['IfMacarius', 'of Macarius'],
    ['ofMacarius', 'of Macarius'],
  ];
  for (const [bad, good] of wordFixes) {
    if (bad === good) continue;
    t = applyRule(t, 'wordfix:' + bad + ' → ' + good,
      new RegExp('\\b' + escapeForRegex(bad) + '\\b', 'g'), good);
  }

  // 7. Apostrophe-as-space — high-confidence English possessives/contractions only.
  //    "God s" → "God's", etc. We only fix the obvious cases the survey turned up.
  const apostropheFixes = [
    ['God s', 'God’s'],
    ['Lord s', 'Lord’s'],
    ['Christ s', 'Christ’s'],
    ['man s', 'man’s'],
    ['life s', 'life’s'],
    ['one s', 'one’s'],
    ['mind s', 'mind’s'],
    ['spirit s', 'spirit’s'],
    ['person s', 'person’s'],
    ['eagle s', 'eagle’s'],
    ['surgeon s', 'surgeon’s'],
    ['stone s', 'stone’s'],
    ['wheat m', 'wheat in'],        // "the wheat m the sieve" — "m" OCR'd from "in"
    ['but m actual', 'but in actual'],
    ['faith m the', 'faith in the'],
    ['Year s', 'Year’s'],
    ['New Year s', 'New Year’s'],
    ['don t', 'don’t'],
    ['Wouldn t', 'Wouldn’t'],
    ['shouldn t', 'shouldn’t'],
    ['couldn t', 'couldn’t'],
    ['won t', 'won’t'],
    ['didn t', 'didn’t'],
    ['isn t', 'isn’t'],
    ['can t', 'can’t'],
  ];
  for (const [bad, good] of apostropheFixes) {
    t = applyRule(t, 'apos:"' + bad + '" → "' + good + '"',
      new RegExp('\\b' + escapeForRegex(bad) + '\\b', 'g'), good);
  }

  // 8. Run-together words (missing spaces).
  const runOnFixes = [
    ['ofthe', 'of the'],
    ['ofhis', 'of his'],
    ['ofHis', 'of His'],
    ['ofa', 'of a'],
    ['ofour', 'of our'],
    ['Ifyou', 'If you'],
    ['ifyou', 'if you'],
    ['expectedfrom', 'expected from'],
    ['Thefrankness', 'The frankness'],
    ['thefirst', 'the first'],
    ['ofmovementfrom', 'of movement from'],
    ['himselffrom', 'himself from'],
    ['distinguishedfrom', 'distinguished from'],
    ['comefrom', 'come from'],
    ['passagefrom', 'passage from'],
    ['dangerfrom', 'danger from'],
    ['apostlefrom', 'apostle from'],
    ['ofprayersfrom', 'of prayers from'],
    ['corruptedfrom', 'corrupted from'],
    ['onefrom', 'one from'],
    ['itselfwith', 'itself with'],
    ['yourselfwith', 'yourself with'],
    ['himselfwith', 'himself with'],
    ['redeemingthe', 'redeeming the'],
    ['lovefor', 'love for'],
    ['preparingfor', 'preparing for'],
    ['carefor', 'care for'],
    ['longingfor', 'longing for'],
    ['desirefor', 'desire for'],
    ['initialyearningfor', 'initial yearning for'],
    ['rulesfor', 'rules for'],
    ['rulefor', 'rule for'],
    ['homefor', 'home for'],
    ['thatyou', 'that you'],
    ['siftyou', 'sift you'],
    ['amongyou', 'among you'],
    ['tellyou', 'tell you'],
    ['grantyou', 'grant you'],
    ['whatsoeveryou', 'whatsoever you'],
    ['espousedyou', 'espoused you'],
    ['maypresentyou', 'may present you'],
    ['haveyou', 'have you'],
    ['ofthis', 'of this'],
    ['ofyour', 'of your'],
    ['thatyour', 'that your'],
    ['beforeyour', 'before your'],
    ['andforgiving', 'and forgiving'],
    ['andspirit', 'and spirit'],
    ['andpatient', 'and patient'],
    ['shallflow', 'shall flow'],
    ['ofyou', 'of you'],
    ['ofworldly', 'of worldly'],
    ['ofGod', 'of God'],
    ['ofmen', 'of men'],
    ['ofdarkness', 'of darkness'],
    ['ofJesus', 'of Jesus'],
    ['ofSalvation', 'of Salvation'],
    ['ofDesire', 'of Desire'],
    ['ofChrist', 'of Christ'],
    ['ofGhrist', 'of Christ'],
    ['ofJacob', 'of Jacob'],
    ['ofDivine', 'of Divine'],
    ['ofLife', 'of Life'],
    ['ofJohn', 'of John'],
    ['ofAveyron', 'of Aveyron'],
    ['ofVoronezh', 'of Voronezh'],
    ['ofBaptism', 'of Baptism'],
    ['ofRepentance', 'of Repentance'],
    ['ofAmerican', 'of American'],
    ['becauseJesus', 'because Jesus'],
    ['forChrist', 'for Christ'],
    ['thatJesus', 'that Jesus'],
    ['suflFered', 'suffered'],
    ['circuTnspectly', 'circumspectly'],
    ['OfAmerica', 'Of America'],
    ['LordJesus', 'Lord Jesus'],
    ['SensualAspect', 'Sensual Aspect'],
    ['faithfail', 'faith fail'],
    ['hut I have prayed', 'but I have prayed'],
    ['ofMacarius', 'of Macarius'],
    ['onit', 'on it'],
    ['offaith', 'of faith'],
    ['ofhuman', 'of human'],
    ['ofliving', 'of living'],
    ['ofliving water', 'of living water'],
    ['ofone', 'of one'],
    ['ofgrace', 'of grace'],
    ['ofgood', 'of good'],
    ['ofevery', 'of every'],
    ['ofevil', 'of evil'],
    ['ofdesire', 'of desire'],
    ['oftreatment', 'of treatment'],
    ['oflife', 'of life'],
    ['Iftreatment', 'of treatment'],
    ['ofbrevity', 'of brevity'],
    ['ofpassions', 'of passions'],
    ['ofpassion', 'of passion'],
    ['ofmercies', 'of mercies'],
    ['oftrue', 'of true'],
    ['ofextreme', 'of extreme'],
    ['ofuse', 'of use'],
    ['ofour', 'of our'],
    ['ofyourself', 'of yourself'],
    ['yourselfto', 'yourself to'],
    ['ofdesires', 'of desires'],
    ['hcts', 'has'],
    ['vesolved', 'resolved'],
    ['vivtuous', 'virtuous'],
    ['lije', 'life'],
    ['Instvuctwn', 'Instruction'],
    ['Jof', 'for'],
    ['thc', 'the'],
    ['Tnciy', 'may'],
    ['ivoTTiciTi', 'woman'],
    ['ccLvcth', 'careth'],
    ['UTiTnciTTicd', 'unmarried'],
    ['TTicd', 'med'],
  ];
  for (const [bad, good] of runOnFixes) {
    t = applyRule(t, 'runon:' + bad + ' → ' + good,
      new RegExp('\\b' + escapeForRegex(bad) + '\\b', 'g'), good);
  }

  // 9. Glyph cleanups
  //    » (right-pointing guillemet) at sentence breaks: typeset artifacts. The two
  //    occurrences in this bundle are sentence-end punctuation OCR'd to ».
  t = applyRule(t, 'glyph:gruc6» → grace.', /gruc6»/g, 'grace.');
  t = applyRule(t, 'glyph:» → .', /»/g, '.');
  //    • (bullet) — single occurrence is "^ 1 • The Russian word is podvtg" — a
  //    footnote marker. Replace with "1." footnote number style.
  t = applyRule(t, 'glyph:" 1 • " → " 1. "', / 1 • /g, ' 1. ');
  t = applyRule(t, 'glyph:residual • → .', /•/g, '.');

  // 10. Punctuation cleanups
  // Double space → single
  t = applyRule(t, 'cleanup:doubleSpace', /  +/g, ' ');
  // Stray "..," or ",." cleanup
  t = applyRule(t, 'cleanup:".." (sentence) → "."', /([a-z])\.\.([A-Z])/g, '$1. $2');
  // Trailing space before newline
  t = applyRule(t, 'cleanup:trailing space before \\n', / +\n/g, '\n');

  return t;
}

// ---------- Run ----------

const raw = fs.readFileSync(BUNDLE_PATH, 'utf8');
const bundle = JSON.parse(raw);

// Pre-pre-pass: some page numbers were OCR'd with lowercase L for 1 (lOO, lOI), or
// with lowercase i (io2, io6, io8, II2, IO0). They sit at paragraph-ends, so we need
// to fix them *before* the merge pre-pass.
function fixOCRdNumber(s) {
  // Numbers like "lOO" = "100", "lOI" = "101", "io6" = "106", "io8" = "108", "II2" = "112",
  // "8o" = "80", "9o" = "90", "2o6" = "206"
  // Rule: a token where chars are in {l, I, i, O, o, 0-9}.
  const fix = (tok) => {
    let s = '';
    for (const c of tok) {
      if (c === 'l' || c === 'I') s += '1';
      else if (c === 'O' || c === 'o') s += '0';
      else s += c;
    }
    return s;
  };
  let r = s;
  // At end of paragraph: digit-letter-digit-? forms commonly seen.
  // Pattern 1: \s lO[OI] or lO\d or lOI or II\d
  r = r.replace(/(\s)(lO[OI0-9]|II[O0-9]|i[oO0]\d|II\d|i[oO0]\d|\d[oO]|\d[oO]\d)(\s*)$/g, (m, p, tok, q) => p + fix(tok) + q);
  // Inline (rare): only the specific known tokens that are not legitimate
  r = r.replace(/\b(lOO|lOI|lO2|io6|io8|II2|II4|II6|II8|2o6)\b/g, (m) => fix(m));
  return r;
}

let preMergeFixCount = 0;
for (const chapter of bundle.chapters) {
  for (const section of chapter.sections) {
    for (const para of section.paragraphs) {
      const fixed = fixOCRdNumber(para.text);
      if (fixed !== para.text) {
        bump('preMergeFix:OCR-page-number', 1);
        preMergeFixCount++;
        para.text = fixed;
      }
    }
  }
}

// Pre-pass: when paragraph N+1 starts with a known running header, the OCR has split a
// single original paragraph into two halves (the page-break was scanned as a paragraph
// break). Merge them back. This is purely an OCR correction — the underlying author's
// paragraph boundary is being RESTORED, not changed. The merged paragraph then flows
// through fixParagraph() like any other.
const headerPattern = new RegExp(
  '^(?:' + RUNNING_HEADERS.map(escapeForRegex).join('|') + ')\\b',
);
// Strip a trailing page-number marker from the prior paragraph. The page number may be:
//   - " 33" (space + digits), the canonical form
//   - "car104" (digits glued to last word — OCR ran them together), where the digits
//     are clearly a 2- or 3-digit page number tacked onto a partial syllable.
// Note: we DO NOT strip a digit that's part of a scripture reference (e.g. "(Romans 1:23)")
// or "lOO" lowercased. So we only strip trailing whitespace+digits OR digits-glued-to-
// a-word fragment that looks like a page number (2-3 digits not preceded by ':' or '.').
function stripTrailingPageNum(s) {
  // " 33" → ""
  let r = s.replace(/\s+\d{1,3}\s*$/, '');
  if (r !== s) return r;
  // "car104" → "car"
  r = s.replace(/(?<=[a-zA-Z])(\d{1,3})\s*$/, '');
  return r;
}
function endsLikePageBreak(s) {
  // OCR-split page break: ends with " <digits>" or ".<digits>" (no period after) or
  // "<word><digits>" (digits glued to last word, e.g. "car104")
  if (/\s+\d{1,3}\s*$/.test(s)) return true;
  if (/(?<=[a-zA-Z])\d{1,3}\s*$/.test(s)) return true;
  return false;
}

let mergedCount = 0;
let strippedHeaderCount = 0;
for (const chapter of bundle.chapters) {
  for (const section of chapter.sections) {
    // Sequential walk that allows the merged paragraph to be checked again against
    // the next-next paragraph, because page breaks can chain (P_n + P_n+1 + P_n+2).
    const merged = [];
    const paras = section.paragraphs.slice();
    while (paras.length > 0) {
      let cur = paras.shift();
      while (paras.length > 0 && headerPattern.test(paras[0].text)) {
        const next = paras[0];
        // Merge only when the prev paragraph ended like an OCR-split page break.
        // Otherwise, just strip the leading header from the next paragraph (it's a
        // legitimate section header that the OCR pulled into the body text).
        if (endsLikePageBreak(cur.text)) {
          paras.shift();
          const curStripped = stripTrailingPageNum(cur.text).replace(/\s+$/, '');
          const nextStripped = next.text.replace(headerPattern, '').replace(/^\s+/, '');
          cur = { ...cur, text: curStripped + ' ' + nextStripped };
          bump('mergeAcrossPageBreak', 1);
          mergedCount++;
        } else {
          // Strip the header in place; do not merge.
          next.text = next.text.replace(headerPattern, '').replace(/^\s+/, '');
          bump('stripHeaderInPlace', 1);
          strippedHeaderCount++;
          break;
        }
      }
      merged.push(cur);
    }
    section.paragraphs = merged;
  }
}

let totalParas = 0;
let modifiedParas = 0;
const sampleDiffs = [];

for (const chapter of bundle.chapters) {
  for (const section of chapter.sections) {
    for (const para of section.paragraphs) {
      totalParas++;
      const before = para.text;
      const after = fixParagraph(before);
      if (after !== before) {
        modifiedParas++;
        if (sampleDiffs.length < 10) {
          sampleDiffs.push({ chId: chapter.id, before, after });
        }
        para.text = after;
      }
    }
  }
}

fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2) + '\n');

console.log('Total paragraphs:', totalParas);
console.log('Modified paragraphs:', modifiedParas);
console.log('Distinct rules fired:', Object.keys(ruleStats).length);

console.log('\n=== Rule firing counts (top 40) ===');
const ruleSorted = Object.entries(ruleStats).sort((a, b) => b[1] - a[1]);
for (const [k, v] of ruleSorted.slice(0, 40)) {
  console.log('  ' + v + ' x ' + k);
}

console.log('\n=== Sample diffs (first 10) ===');
for (let i = 0; i < sampleDiffs.length; i++) {
  const d = sampleDiffs[i];
  // Find the first divergence point
  let lo = 0;
  while (lo < d.before.length && lo < d.after.length && d.before[lo] === d.after[lo]) lo++;
  const winStart = Math.max(0, lo - 60);
  const winLen = 200;
  console.log('\n--- diff ' + (i + 1) + ' (' + d.chId + ') ---');
  console.log('  BEFORE: …' + JSON.stringify(d.before.substring(winStart, winStart + winLen)));
  console.log('  AFTER:  …' + JSON.stringify(d.after.substring(winStart, winStart + winLen)));
}
