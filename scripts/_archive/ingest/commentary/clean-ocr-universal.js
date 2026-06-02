#!/usr/bin/env node
/**
 * Universal Tier-1 OCR cleaner. Runs across every bundle in
 * content/generated/commentary/*.json and strips source-INDEPENDENT artifacts
 * that are characteristic of PDF→text extraction:
 *
 *   1. Bare-digit page-number sequences leaked at paragraph start
 *      ("38 37 77 To Master Thomas..." → "To Master Thomas...")
 *   2. Inline page-number runs that appear mid-paragraph after a sentence end
 *      ("...truly are. 41 40 79 a GREG..." → "...truly are.")
 *   3. Running-header substrings (work title in ALL CAPS bracketed by prose)
 *   4. Split-cap citation names with stray space ("N AZIANZEN" → "NAZIANZEN")
 *
 * Each rule is conservative: requires word-bounded or punctuation-bounded
 * context so legitimate ALL-CAPS section headings, list markers, and citation
 * numbering aren't damaged.
 *
 * Idempotent: rules use anchors/boundaries so re-running is a no-op once an
 * artifact is removed.
 *
 * Usage:
 *   node scripts/ingest/commentary/clean-ocr-universal.js              # all bundles
 *   node scripts/ingest/commentary/clean-ocr-universal.js maximus-*    # glob
 *   node scripts/ingest/commentary/clean-ocr-universal.js --dry-run    # report only
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '../../../content/generated/commentary');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const filters = args.filter(a => !a.startsWith('--'));

const allFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
const targets = filters.length === 0
  ? allFiles
  : allFiles.filter(f => filters.some(g => {
      // simple glob: foo-* matches anything starting with foo-
      if (g.endsWith('*')) return f.startsWith(g.slice(0, -1));
      return f === g || f === g + '.json';
    }));

if (targets.length === 0) {
  console.error('No bundles matched', filters);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Rule definitions. Each returns { text, fired: bool, ruleName } or applies
// the transform itself and bumps a counter.
// ---------------------------------------------------------------------------

/**
 * Rule 1: Leading page-number debris.
 * Strip 1-4 digit clusters at the very start of a paragraph when followed
 * by a Capital + lowercase letter (real prose). Do NOT strip when:
 *   - prefix looks like a section marker: "[1]", "1.", "(1)"
 *   - prefix is a single digit followed by "]" (e.g. "[3]")
 *   - first non-digit char is not a capital letter
 *
 * Examples that fire:
 *   "38 37 77 To Master Thomas..."  → "To Master Thomas..."
 *   "91 Prologue Maximus' opening..."  → "Prologue Maximus' opening..."
 *   "82 44 Rather, let us..."  → "Rather, let us..."
 * Examples that do NOT fire:
 *   "[1] From St. Gregory's..."  (section marker preserved)
 *   "1. Some text"  (numbered list preserved)
 *   "1 Cor. 4.21" — only matches "1 C" then space-A-Z. We require `[A-Z][a-z]`
 *     after digits, so "1 Cor" matches "1 C" + "or" lowercase — would fire.
 *     Mitigation: require AT LEAST 2 digit clusters OR a 3+ digit cluster.
 */
const LEADING_DIGITS = /^(?:\d{1,4}\s+){2,4}([A-Z][a-z])/;
const LEADING_BIG_DIGIT = /^(\d{3,4})\s+([A-Z][a-z])/;

function stripLeadingDigits(text, stats) {
  let t = text;
  const m1 = t.match(LEADING_DIGITS);
  if (m1) {
    t = t.slice(m1[0].length - m1[1].length);
    stats.leadingDigitsMulti = (stats.leadingDigitsMulti || 0) + 1;
    return t;
  }
  const m2 = t.match(LEADING_BIG_DIGIT);
  if (m2) {
    t = t.slice(m2[0].length - m2[2].length);
    stats.leadingDigitsBig = (stats.leadingDigitsBig || 0) + 1;
    return t;
  }
  return text;
}

/**
 * Rule 2: Inline page-number runs after a sentence end.
 * Pattern: `[.!?][space]<digit cluster(s)>[space]<Capital + lowercase>`
 *
 * Example that fires:
 *   "...intellectual activity. 39 78 deeds, and you..."
 *      → "...intellectual activity. deeds, and you..."
 *
 * Constraint: require AT LEAST 2 digit clusters OR a 3-4 digit number. Avoids
 * stripping legitimate Scripture refs (which never appear here since Scripture
 * refs use the form "Matt. 5:3", not bare digits).
 */
const INLINE_DIGITS_MULTI = /([.!?])\s+(?:\d{1,4}\s+){2,4}([A-Z][a-z])/g;
const INLINE_DIGITS_BIG = /([.!?])\s+(\d{3,4})\s+([A-Z][a-z])/g;

function stripInlineDigits(text, stats) {
  let t = text;
  const before1 = t;
  t = t.replace(INLINE_DIGITS_MULTI, (m, punct, cap) => {
    stats.inlineDigitsMulti = (stats.inlineDigitsMulti || 0) + 1;
    return `${punct} ${cap}`;
  });
  t = t.replace(INLINE_DIGITS_BIG, (m, punct, num, cap) => {
    stats.inlineDigitsBig = (stats.inlineDigitsBig || 0) + 1;
    return `${punct} ${cap}`;
  });
  return t;
}

/**
 * Rule 3: Split-cap citation names.
 * Pattern: a SINGLE capital letter, space, then 2+ capital letters, in a
 * context that suggests it's an author/place name inside a citation rather
 * than a section header. The strongest signal: preceded by punctuation +
 * space (",", ".", ";"), OR appears between lowercase prose words.
 *
 * Examples that fire:
 *   ", T HUNBERG, Microcosm and Mediator..."  → ", THUNBERG, Microcosm..."
 *   "GREG. N AZ., Or. 29.2"  → "GREG. NAZ., Or. 29.2"
 *   "of Plotinus' 'overflowing' One, a sort... N AZIANZEN, Or. 23"
 *      → "...NAZIANZEN, Or. 23"
 *
 * Examples that do NOT fire (safety):
 *   "A BOOK ABOUT GOD" — preceded by start-of-paragraph or space, not punctuation
 *   Section headings like "S SAINT JOSEPH TAUGHT" — preceded by start/space
 *
 * Constraint: require punctuation (`[,.;]`) + whitespace immediately before
 * the single-cap. Plus the next word must be all-caps and followed by `,.;:` or end.
 */
const SPLIT_CAP_AFTER_PUNCT = /([,.;])(\s+)([A-Z])\s+([A-Z]{2,})(?=[,.;:\s])/g;

function collapseSplitCaps(text, stats) {
  return text.replace(SPLIT_CAP_AFTER_PUNCT, (m, punct, ws, c1, rest) => {
    stats.splitCapCollapsed = (stats.splitCapCollapsed || 0) + 1;
    return `${punct}${ws}${c1}${rest}`;
  });
}

/**
 * Rule 4: Running-header substrings.
 * Only fires for work titles ≥ 10 chars that appear in ALL CAPS as a
 * substring of a paragraph longer than `title.length + 40`, with lowercase
 * prose BOTH before AND after the title. This guards against legitimate
 * subtitles (which usually open the paragraph) and standalone heading
 * paragraphs (which the parser would already filter).
 *
 * Example that fires:
 *   "...both natures. AMBIGUA TO THOMAS 21 See L ARCHET, La Divinisation..."
 *      → "...both natures. 21 See L ARCHET, La Divinisation..."
 *      (then Rule 2 strips "21" and Rule 3 fixes "L ARCHET")
 *
 * Example that does NOT fire:
 *   "AMBIGUA TO THOMAS\n\nFollows the body of the work..."  (header alone)
 *   "THE DIVINE LITURGY: ..." at paragraph start (no lowercase before)
 */
function stripRunningHeaders(text, headers, stats) {
  let t = text;
  for (const h of headers) {
    if (h.length < 10) continue;
    // Build a regex that requires lowercase letter (or digit) somewhere before
    // and lowercase letter somewhere after the header occurrence.
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`([a-z][^A-Z]{0,80})\\s+${escaped}\\s+([a-zA-Z0-9])`, 'g');
    t = t.replace(re, (m, before, after) => {
      stats.runningHeader = (stats.runningHeader || 0) + 1;
      return `${before} ${after}`;
    });
  }
  return t;
}

/**
 * Rule 5: Normalize internal whitespace runs introduced by removal.
 * Collapse multiple spaces, trim, but preserve newlines (paragraph internal
 * newlines are rare but possible).
 */
function normalizeWhitespace(text) {
  return text.replace(/[ \t]{2,}/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let totalBundles = 0;
let totalParagraphs = 0;
let totalModified = 0;
const bundleReports = [];

for (const file of targets.sort()) {
  const fp = path.join(DIR, file);
  const bundle = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const chapters = bundle.chapters || [];
  if (chapters.length === 0) continue;
  totalBundles++;

  const headers = (bundle.works || [])
    .flatMap(w => [w.title?.toUpperCase(), w.shortTitle?.toUpperCase()].filter(Boolean));

  const stats = {};
  let bundleModified = 0;
  let bundleParas = 0;
  const samples = [];

  for (const c of chapters) {
    for (const s of (c.sections || [])) {
      const paras = s.paragraphs || [];
      for (let i = 0; i < paras.length; i++) {
        const p = paras[i];
        if (!p.text) continue;
        bundleParas++;
        totalParagraphs++;
        const before = p.text;

        let t = before;
        t = stripLeadingDigits(t, stats);
        t = stripInlineDigits(t, stats);
        t = stripRunningHeaders(t, headers, stats);
        t = collapseSplitCaps(t, stats);
        t = normalizeWhitespace(t);

        if (t !== before) {
          bundleModified++;
          totalModified++;
          if (samples.length < 3) samples.push({ before, after: t });
          if (!DRY_RUN) p.text = t;
        }
      }
    }
  }

  if (!DRY_RUN && bundleModified > 0) {
    fs.writeFileSync(fp, JSON.stringify(bundle, null, 2), 'utf8');
  }

  bundleReports.push({ file, paragraphs: bundleParas, modified: bundleModified, stats, samples });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`\nTier-1 OCR cleaner ${DRY_RUN ? '(DRY RUN)' : ''}`);
console.log('Bundles scanned:', totalBundles);
console.log('Paragraphs scanned:', totalParagraphs);
console.log('Paragraphs modified:', totalModified);
console.log('');

const aggregate = {};
for (const r of bundleReports) for (const [k, v] of Object.entries(r.stats)) aggregate[k] = (aggregate[k] || 0) + v;
console.log('Rule firings (aggregate):');
for (const [k, v] of Object.entries(aggregate).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log('');

const top = bundleReports.filter(r => r.modified > 0).sort((a, b) => b.modified - a.modified).slice(0, 20);
console.log('Top-20 bundles by paragraphs modified:');
for (const r of top) console.log(`  ${r.modified.toString().padStart(4)}  ${r.file}`);
console.log('');

if (filters.length > 0 && bundleReports.length <= 3) {
  console.log('Sample before/after pairs:');
  for (const r of bundleReports) {
    console.log(`\n--- ${r.file} (${r.modified}/${r.paragraphs} modified) ---`);
    for (const s of r.samples) {
      console.log('  BEFORE:', JSON.stringify(s.before.slice(0, 200)));
      console.log('  AFTER: ', JSON.stringify(s.after.slice(0, 200)));
      console.log('');
    }
  }
}

if (DRY_RUN) console.log('\n(Dry run — no files were modified.)');
