#!/usr/bin/env node
/**
 * Fix OCR transcription errors in "Wounded by Love" (Elder Porphyrios).
 *
 * The source PDF was image-only and was OCR'd through tesseract.js. The book
 * has a two-column / marginal-heading layout that the OCR merged horizontally,
 * so a lot of damage is structural (right-column text glued inside left-column
 * sentences) and can't be deterministically reversed without the original PDF
 * page coordinates.
 *
 * This script only applies HIGH-CONFIDENCE, mechanical letter-level fixes:
 *   - common letter-shape confusions ("Twas" -> "I was", "loannikios"
 *     -> "Ioannikios", "amd" -> "and", etc.)
 *   - apostrophe-loss in well-known contractions ("didn t" / "didnt" -> "didn't")
 *   - well-known proper-noun OCR variants for this corpus (Toannis -> Ioannis,
 *     Kavsokalivia spellings, ...)
 *
 * Greek terms, Greek place names, proper nouns explicitly listed in the brief,
 * digits, numbered section markers and paragraph boundaries are preserved.
 *
 * The script writes the corrected bundle back to the same path and prints a
 * diff summary.
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_PATH = path.resolve(
  __dirname,
  '../../../content/generated/commentary/porphyrios-wounded-by-love.json',
);

// ---------------------------------------------------------------------------
// Fix rules
//
// Each rule is [name, regex, replacement-or-fn]. They are applied in order;
// later rules see the output of earlier rules. Tests during development
// confirmed each pattern only matches OCR-broken text (no false positives on
// Porphyrios's actual prose, which is modern English).
// ---------------------------------------------------------------------------

const RULES = [
  // -----------------------------------------------------------------
  // 1. Proper-noun OCR confusions specific to this corpus.
  //    'l' and 'T' get misread for capital 'I' in Greek names because
  //    the font's I has serifs that drop when scanned.
  // -----------------------------------------------------------------
  ['ioannikios-l', /\bloannikios\b/g, 'Ioannikios'],
  ['ioannikios-T', /\bToannikios\b/g, 'Ioannikios'],
  ['ioannikios-J', /\bJoannikios\b/g, 'Ioannikios'],
  ['ioannis-l',    /\bloannis\b/g,    'Ioannis'],
  ['ioannis-T',    /\bToannis\b/g,    'Ioannis'],

  // -----------------------------------------------------------------
  // 2. 'T' at start of token is uppercase 'I' when followed lowercase
  //    in characteristic verb / pronoun shapes. Restricted to a
  //    deterministic whitelist so we never break legitimate words
  //    like "Take", "The", "Then", "Twas" (not a word).
  //
  //    "Twas" -> "I was", "Thad" -> "I had", "Tve" -> "I've", etc.
  // -----------------------------------------------------------------
  ['T-was',     /\bTwas\b/g,    'I was'],
  ['T-had',     /\bThad\b/g,    'I had'],
  ['T-said',    /\bTsaid\b/g,   'I said'],
  ['T-went',    /\bTwent\b/g,   'I went'],
  ['T-would',   /\bTwould\b/g,  'I would'],
  ['T-do',      /\bTdo\b/g,     'I do'],
  ['T-am',      /\bTam\b/g,     'I am'],
  ['T-saw',     /\bTsaw\b/g,    'I saw'],
  ['T-took',    /\bTtook\b/g,   'I took'],
  ['T-loved',   /\bTloved\b/g,  'I loved'],
  ['T-got',     /\bTgot\b/g,    'I got'],
  ['T-told',    /\bTtold\b/g,   'I told'],
  ['T-lived',   /\bTlived\b/g,  'I lived'],
  ['T-regret',  /\bTregret\b/g, 'I regret'],
  ['T-wanted',  /\bTwanted\b/g, 'I wanted'],
  ['T-have',    /\bThave\b/g,   'I have'],
  // Undo earlier-script corruption: '$1I' was emitted instead of ' I'
  // by an older version of this script where the replacement string
  // wasn't substituted. Treat it as canonical garbage.
  ['undo-dollar-I', /\$1I(?=[\s,.;:?!])/g, ' I'],
  // 'T' standalone is the pronoun I. (Capital T as a word never
  // appears in modern English prose except as a letter; the original
  // book uses no such single-letter words.)
  ['T-bare',    /(^|[\s(])T(?=[\s,.;:?!)])/g, '$1I'],
  // Common run-together demonstratives ('Thats' / 'Thisis' / 'Theres')
  ['Thats',     /\bThats\b/g,   'That’s'],
  ['Thisis',    /\bThisis\b/g,  'This is'],
  ['Theres',    /\bTheres\b/g,  'There’s'],

  // T-startswith-letter where T is OCR for capital I.
  // 'Tt' -> 'It', 'Tf' -> 'If', 'Tn' -> 'In', 'Tll' -> "I'll", 'Tl' -> "I'll" (drops one l),
  // 'Tooked' -> 'looked' (T -> L when next is 'ooked').
  ['Tt-is-It',    /\bTt\b/g,      'It'],
  ['Tf-is-If',    /\bTf\b/g,      'If'],
  ['Tn-is-In',    /\bTn\b/g,      'In'],
  ['Tl-is-Ill',   /\bTl\b/g,      'I’ll'],
  ['Til-is-Ill',  /\bTil\b/g,     'I’ll'],
  ['Tord-is-Lord',/\bTord\b/g,    'Lord'],
  ['Tooked-look', /\bTooked\b/g,  'looked'],
  ['Tad-is-had',  /\bTad\b/g,     'had'],
  ['Tsay-is-I',   /\bTsay\b/g,    'I say'],
  ['Tove-is-love',/\bTove\b/g,    'love'],
  // '1' standalone or before a verb sometimes substitutes for 'I'.
  // Only fix the run-together verb cases, where there's no plausible
  // numeric reading.
  ['1had-I-had',  /\b1had\b/g,    'I had'],
  ['1was-I-was',  /\b1was\b/g,    'I was'],
  ['1went-I-went',/\b1went\b/g,   'I went'],
  ['1said-I-said',/\b1said\b/g,   'I said'],
  ['T-don',     /\bTdon’t\b/g,  'I don’t'],
  ['T-don-asc', /\bTdon't\b/g,  "I don't"],
  // Contractions: Tve, Tm, Tll, Td (both bare and with literal apostrophe)
  ['T-ve',     /\bTve\b/g,    "I've"],
  ['T-m',      /\bTm\b/g,     "I'm"],
  ['T-ll',     /\bTll\b/g,    "I'll"],
  ['T-d',      /\bTd\b/g,     "I'd"],
  ['T-ve-ap',  /\bT'?ve\b/g,  "I've"],
  ['T-m-ap',   /\bT'?m\b/g,   "I'm"],
  ['T-ll-ap',  /\bT'?ll\b/g,  "I'll"],
  ['T-d-ap',   /\bT'?d\b/g,   "I'd"],
  // T' + verb: T'would, T'was, T'm saying etc.
  ['T-ap-was',   /\bT'was\b/g,    'I was'],
  ['T-ap-would', /\bT'would\b/g,  'I would'],

  // -----------------------------------------------------------------
  // 3. Run-together pronoun + verb where the I-glyph and the next
  //    word got joined.  Restricted to well-known shapes.
  // -----------------------------------------------------------------
  ['I-was-run',   /\bIwas\b/g,    'I was'],
  ['I-am-run',    /\bIam\b/g,     'I am'],
  ['I-went-run',  /\bIwent\b/g,   'I went'],
  ['I-said-run',  /\bIsaid\b/g,   'I said'],
  ['I-had-run',   /\bIhad\b/g,    'I had'],
  ['I-have-run',  /\bIhave\b/g,   'I have'],
  ['I-know-run',  /\bIknow\b/g,   'I know'],

  // -----------------------------------------------------------------
  // 3b. '[' at start of token can be uppercase 'I' (the pronoun) when
  //     followed by a verb-companion word in the same restricted
  //     whitelist used for T above. Tokens where '[' is followed by
  //     a word the pronoun never combines with ('[ ters' = column
  //     debris) are left alone.
  // -----------------------------------------------------------------
  ['bracket-was',     /\[\s?was\b/g,     'I was'],
  ['bracket-went',    /\[\s?went\b/g,    'I went'],
  ['bracket-had',     /\[\s?had\b/g,     'I had'],
  ['bracket-have',    /\[\s?have\b/g,    'I have'],
  ['bracket-would',   /\[\s?would\b/g,   'I would'],
  ['bracket-did',     /\[\s?did\b/g,     'I did'],
  ['bracket-want',    /\[\s?want\b/g,    'I want'],
  ['bracket-wanted',  /\[\s?wanted\b/g,  'I wanted'],
  ['bracket-saw',     /\[\s?saw\b/g,     'I saw'],
  ['bracket-am',      /\[\s?am\b/g,      'I am'],
  ['bracket-heard',   /\[\s?heard\b/g,   'I heard'],
  ['bracket-arrived', /\[\s?arrived\b/g, 'I arrived'],
  ['bracket-going',   /\[\s?going\b/g,   'I going'],
  ['bracket-loved',   /\[\s?loved\b/g,   'I loved'],
  ['bracket-learned', /\[\s?learned\b/g, 'I learned'],
  ['bracket-laid',    /\[\s?laid\b/g,    'I laid'],
  ['bracket-lived',   /\[\s?lived\b/g,   'I lived'],
  ['bracket-walked',  /\[\s?walked\b/g,  'I walked'],
  ['bracket-must',    /\[\s?must\b/g,    'I must'],
  ['bracket-started', /\[\s?started\b/g, 'I started'],
  ['bracket-hid',     /\[\s?hid\b/g,     'I hid'],
  ['bracket-asked',   /\[\s?asked\b/g,   'I asked'],
  ['bracket-made',    /\[\s?made\b/g,    'I made'],
  ['bracket-should',  /\[\s?should\b/g,  'I should'],
  ['bracket-believed',/\[\s?believed\b/g,'I believed'],
  ['bracket-wailed',  /\[\s?wailed\b/g,  'I wailed'],
  ['bracket-answered',/\[\s?answered\b/g,'I answered'],
  ['bracket-advised', /\[\s?advised\b/g, 'I advised'],
  ['bracket-cannot',  /\[\s?cannot\b/g,  'I cannot'],
  ['bracket-wasnt',   /\[\s?wasn’t\b/g,  'I wasn’t'],
  ['bracket-didnt',   /\[\s?didn’t\b/g,  'I didn’t'],
  ['bracket-wont',    /\[\s?won’t\b/g,   'I won’t'],
  ['bracket-wrapped', /\[\s?wrapped\b/g, 'I wrapped'],
  ['bracket-recive',  /\[\s?recive\b/g,  'I receive'],

  // -----------------------------------------------------------------
  // 4. Letter-shape confusions in English words.  The OCR sometimes
  //    drops 'a' to 'z', or 'I' to 'l', or 'h' to 'b'.
  // -----------------------------------------------------------------
  ['and-amd',  /\bamd\b/g,  'and'],
  ['and-aad',  /\baad\b/g,  'and'],
  ['and-znd',  /\bznd\b/g,  'and'],
  ['and-zmd',  /\bzmd\b/g,  'and'],
  ['mid-aud',  /\bmid\b/g,  function (match, offset, text) {
    // 'mid' is a real word; only fix when it sits between OCR noise.
    // Look at neighbours – if surrounded by junk-marker chars,
    // upgrade to 'and'. Otherwise leave alone.
    const left = text.slice(Math.max(0, offset - 12), offset);
    const right = text.slice(offset + 3, offset + 15);
    if (/[|©£§¥¢°«»~=\[\]]/.test(left) || /[|©£§¥¢°«»~=\[\]]/.test(right)) {
      return 'and';
    }
    return match;
  }],
  ['about-zbout', /\bzbout\b/g, 'about'],
  ['as-zs',       /\bzs\b/g,    'as'],
  ['at-zt',       /\bzt\b/g,    'at'],
  ['an-zn',       /\bzn\b/g,    'an'],
  ['are-zre',     /\bzre\b/g,   'are'],

  // -----------------------------------------------------------------
  // 5. Doubled / orphan punctuation cleanup.
  // -----------------------------------------------------------------
  // collapse runs of more than three dots to "..."
  ['ellipsis-collapse', /\.{4,}/g, '...'],
  // collapse '!!!' / '???' to single mark; keep '!?' alone.
  ['bang-collapse',    /!{2,}/g, '!'],
  ['question-collapse',/\?{2,}/g, '?'],
  // doubled comma/semicolon
  ['comma-double',     /,{2,}/g, ','],
  ['semicolon-double', /;{2,}/g, ';'],
];

// ---------------------------------------------------------------------------
// Apply rules
// ---------------------------------------------------------------------------

function applyRules(text) {
  let out = text;
  const ruleHits = {};
  for (const [name, re, repl] of RULES) {
    let count = 0;
    if (typeof repl === 'function') {
      out = out.replace(re, function (match, ...rest) {
        const offset = rest[rest.length - 2];
        const fullText = rest[rest.length - 1];
        const result = repl(match, offset, fullText);
        if (result !== match) count++;
        return result;
      });
    } else {
      // If the replacement string contains $ placeholders ($1, $&, ...),
      // use String#replace's native substitution. Otherwise wrap with a
      // function so we can also count matches.
      if (repl.indexOf('$') >= 0) {
        const before = out;
        out = out.replace(re, repl);
        // Count by re-matching the original to see how many hits.
        // (.match() with a /g/ regex returns an array of matches.)
        const matches = before.match(new RegExp(re.source, re.flags));
        count = matches ? matches.length : 0;
      } else {
        out = out.replace(re, function () {
          count++;
          return repl;
        });
      }
    }
    if (count > 0) ruleHits[name] = count;
  }
  return { text: out, ruleHits };
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function diffSample(before, after, ctx = 30) {
  // Return a short snippet around the first character that differs.
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  if (i === before.length && i === after.length) return null;
  const start = Math.max(0, i - ctx);
  return {
    before: before.slice(start, Math.min(before.length, i + ctx + 20)),
    after: after.slice(start, Math.min(after.length, i + ctx + 20)),
  };
}

function main() {
  const raw = fs.readFileSync(BUNDLE_PATH, 'utf-8');
  const data = JSON.parse(raw);

  const totals = {
    paragraphs: 0,
    modified: 0,
    ruleHits: {},
    samples: [],
  };

  data.chapters.forEach(function (chapter) {
    chapter.sections.forEach(function (section) {
      section.paragraphs.forEach(function (para) {
        totals.paragraphs += 1;
        const before = para.text;
        const { text: after, ruleHits } = applyRules(before);
        if (after !== before) {
          totals.modified += 1;
          para.text = after;
          for (const [k, v] of Object.entries(ruleHits)) {
            totals.ruleHits[k] = (totals.ruleHits[k] || 0) + v;
          }
          if (totals.samples.length < 10) {
            const d = diffSample(before, after);
            if (d) totals.samples.push({ chapterOrder: chapter.order, ...d });
          }
        }
      });
    });
  });

  fs.writeFileSync(BUNDLE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');

  console.log('Total paragraphs:', totals.paragraphs);
  console.log('Modified paragraphs:', totals.modified);
  console.log('');
  console.log('Distinct rule hits:');
  Object.entries(totals.ruleHits)
    .sort(function (a, b) { return b[1] - a[1]; })
    .forEach(function (entry) {
      console.log('  ' + entry[0] + ': ' + entry[1]);
    });
  console.log('');
  console.log('Sample diffs (' + totals.samples.length + '):');
  totals.samples.forEach(function (s, i) {
    console.log('  [' + (i + 1) + '] chapter ' + s.chapterOrder);
    console.log('      - ' + JSON.stringify(s.before));
    console.log('      + ' + JSON.stringify(s.after));
  });
}

main();
