// Phase 2: dictionary spell-check pass.
//
// Walk every paragraph across every generated commentary bundle. For each
// out-of-dictionary token, generate edit-distance-1 candidates and apply
// a fix only when the transformation matches a known OCR confusion
// pattern AND the candidate is in the dictionary. Skip proper nouns,
// archaic English, theological terms.
//
// Two phases internally:
//   --scan: collect proposals only, write to a report file.
//   --apply: actually rewrite the bundles using the apply-list.

import { readFileSync, readdirSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import wordsArray from "an-array-of-english-words";

const GENERATED_DIR = join(process.cwd(), "content/generated/commentary");
const REPORTS_DIR = join(GENERATED_DIR, "_reports");

// ── Dictionary build ───────────────────────────────────────────────────────

const baseWords = new Set<string>(
  (wordsArray as string[]).map((w) => w.toLowerCase()),
);

// Archaic / theological / liturgical additions the base dictionary misses.
const ARCHAIC_AND_THEOLOGICAL = [
  // Archaic English
  "shew", "shewed", "shewest", "shewing", "shewn", "shews",
  "wouldst", "couldst", "shouldst", "dost", "doth", "hast", "hath",
  "saith", "sayest", "ye", "thee", "thy", "thine", "thou",
  "didst", "wert", "art", "wast", "shalt", "wilt", "mayst", "mayest",
  "spake", "spakest", "ofttimes", "oft", "naught", "aught",
  "henceforth", "thenceforth", "whence", "whither", "wherefore",
  "whereof", "wherein", "whereto", "thereto", "therein", "thereof",
  "therewith", "thereupon", "hereunto", "hereunder", "wheresoever",
  "whosoever", "whatsoever", "whensoever", "withersoever",
  "afore", "betwixt", "yon", "yonder", "yea", "nay", "verily",
  "mete", "meted", "rod", "ought", "begat", "begotten", "beget",
  "wast", "withal", "lest",
  // Greek + Latin theological vocabulary commonly transliterated in
  // English translations of the Fathers.
  "theosis", "kenosis", "hesychasm", "hesychast", "hesychasts", "hesychia",
  "nous", "noetic", "ousia", "hypostasis", "hypostases", "homoousion",
  "homoousios", "pneuma", "logos", "agape", "philia", "eros",
  "metanoia", "askesis", "ascesis", "anchorite", "anchorites", "anchoritic",
  "cenobite", "cenobites", "cenobitic", "coenobite", "coenobitic",
  "starets", "staretz", "startsy", "skete", "sketes", "lavra", "lavras",
  "podvig", "podvizhniki", "filokalia", "philokalia", "philokalic",
  "theotokos", "panagia", "athonite", "athos", "byzantium",
  "patristic", "patristics", "patrology", "patrologia",
  "kerygma", "kerygmatic", "didache", "didache",
  "monad", "dyad", "triad",
  "iconographer", "iconographers", "iconography", "iconographic",
  "iconostasis", "iconostases", "menaion", "horologion", "octoechos",
  "akathist", "akathists", "anaphora", "anaphoras", "epiclesis",
  "epicleses", "diaconate", "diaconal", "diakonia", "ekklesia",
  "metropolitan", "metropolitans", "metropolia",
  "synaxarion", "typikon", "typika", "ladder",
  "deification", "deify", "deified", "deifying",
  "apophatic", "cataphatic", "kataphatic", "katavasia", "katavasias",
  "uncreated", "uncreatedness", "energies", "essence",
  "monasticism", "cenobium", "skete", "wilderness",
  "anchoritism", "eremitic", "eremitism",
  "kontakion", "kontakia", "troparion", "troparia",
  "antiphon", "antiphons", "antiphonal",
  "stikhera", "stichera", "irmos", "irmoi", "irmoses",
  "phyletism", "iconoclasm", "iconoclast", "iconoclasts", "iconoclastic",
  "filioque", "augustinian",
  "septuagint", "vulgate", "peshitta",
  "elder", "elders", "fathership",
  "abba", "amma",
  "monk", "monks", "monkhood",
  "filokalia",
  // Greek transliterations of common words
  "logoi", "hypostatic", "consubstantial",
  "soteriology", "ecclesiology", "pneumatology", "anthropology",
  "mariology", "christology", "trinity", "trinitarian",
  "incarnation", "redemption", "salvation", "resurrection",
  "ascension", "pentecost", "theophany", "epiphany",
  "transfiguration", "annunciation", "dormition",
  // Hagiographic vocabulary
  "stylite", "stylites", "stylitic", "fool-for-christ", "fool", "fools",
  "venerable", "blessed", "holy", "saint", "saints",
  // Liturgical
  "epistle", "epistles", "gospel", "gospels",
  "compline", "matins", "vespers", "nocturns", "prime", "terce", "sext", "none",
  "trisagion", "phos", "hilaron",
  // Specific Father names (lowercase form for matching)
  "augustinian", "thomistic", "palamite", "palamism", "palamas",
  "athanasian", "cappadocian", "antiochene", "alexandrian",
  // Eastern names that often get OCR'd
  "kallistos", "panteleimon",
];
for (const w of ARCHAIC_AND_THEOLOGICAL) baseWords.add(w.toLowerCase());

// Common English contractions the base dictionary lists separately.
for (const w of ["dont", "wont", "isnt", "wasnt", "havent", "hasnt", "didnt", "couldnt", "shouldnt", "wouldnt"]) {
  baseWords.add(w);
}

// ── Preserve rules: words that look "wrong" to the base dictionary but
// are actually correct archaic / patristic English. Critical to define
// these because otherwise the spell-checker will "correct" them into
// modern forms and corrupt the original prose.

function isArchaicVerbForm(lower: string): boolean {
  // -eth: third-person singular present ("seeth", "calleth", "knoweth")
  // -est: second-person singular ("knowest", "lovest", "hearest")
  // The stem (minus the suffix) should be either a dictionary verb or a
  // dictionary verb minus its final "e".
  const checkStem = (stem: string): boolean => {
    if (baseWords.has(stem)) return true;
    if (stem.length > 1 && baseWords.has(stem + "e")) return true;
    return false;
  };
  if (lower.endsWith("eth") && lower.length >= 5) {
    const stem = lower.slice(0, -3);
    if (checkStem(stem)) return true;
  }
  if (lower.endsWith("est") && lower.length >= 5) {
    const stem = lower.slice(0, -3);
    if (checkStem(stem)) return true;
  }
  // Past tense archaic: "spake", "brake", "wist" — already added above.
  return false;
}

function isAllowedShortFragment(lower: string): boolean {
  // Short stranded fragments like "tion", "tions", "tious" appear when a
  // word break wasn't dehyphenated. We don't try to fix these — better to
  // leave the original alone than to suggest a wrong fix.
  if (/^(tion|tions|tious|ment|ments|ness|nesses|less|able|ible|ing|ings|ed|ly|ity|ities)$/.test(lower)) {
    return true;
  }
  return false;
}

// Common ecclesiastical / theological terms the base dictionary lacks.
const EXTRA_VOCAB = [
  "eucharist", "eucharists", "eucharistic", "eucharistically",
  "deifying", "deification", "deify", "deified",
  "consubstantial", "homoousion", "homoousios",
  "trisagion", "akathist", "akathists",
  "metropolia", "metropolitanate",
  "hesychast", "hesychasts", "hesychastic",
  "patristic", "patristics",
  "monk", "monks", "monkly",
  "starets", "staretz",
  "skete", "sketes",
  "kontakion", "kontakia",
  "troparion", "troparia",
  "irmos", "irmoi",
  "katavasia", "katavasias",
  "iconostasis", "iconostases",
  "menaion", "menaia",
  "octoechos", "horologion",
  "synaxarion", "synaxaria",
  "typikon", "typika",
  "philokalia", "philokalic",
  "didache", "epiclesis", "epicleses",
  "kerygma", "kerygmatic",
  "anaphora", "anaphoras", "anaphoral",
  "stikhera", "stichera",
  "antiphon", "antiphons", "antiphonal", "antiphonary",
  "stikheron", "sticheron",
  "compline",
  "athonite", "athos",
  "phyletism", "phyletist",
  "filioque", "papacy", "papal",
  "ecumenical", "patriarchate", "patriarch", "patriarchs",
  "monasticism", "monastic", "monastics", "monastery", "monasteries",
  "asceticism", "ascetical", "ascetics", "ascetic",
  "kenosis", "kenotic", "theosis", "theotokos",
  "hesychia", "hesychasm", "hesychast",
  "logos", "logoi",
  "nous", "noetic", "noetically",
  "ousia", "hypostasis", "hypostases", "hypostatic",
  "metanoia", "askesis", "ascesis",
  "anchorite", "anchorites", "anchoritic", "anchoritism",
  "cenobite", "cenobites", "cenobitic", "coenobitic", "coenobium",
  "eremitic", "eremitism", "eremitic",
  "stylite", "stylites", "stylitic",
  "fools", "fool",
  "festal",
  "petrine", "pauline", "johannine",
  "soteriological", "soteriology", "soteriologically",
  "ecclesiology", "ecclesiological", "ecclesiologically",
  "pneumatology", "pneumatological", "pneumatologically",
  "christology", "christological", "christologically",
  "mariology", "mariological",
  "trinitarian", "trinitarianism",
  "apophatic", "apophatically", "apophaticism",
  "cataphatic", "kataphatic",
  "uncreated", "uncreatedness",
  "deifying", "deify",
  "iconographer", "iconographers",
  "starets", "staretz", "startsy",
  "podvig", "podvizhniki",
  "myrrh", "myrrhbearer", "myrrhbearers", "myrrhbearing",
  "rubrics", "rubric",
  "sticheron",
  "festal", "menaia",
  // Common Russian / Greek / Slavonic names that recur
  "athanasius", "athanasian", "athanasians",
  "cyril", "cyrils", "cyrillic", "cyrilline",
  "basil",
  "gregory", "gregorys",
  "augustine", "augustinian", "augustinianism", "augustinians",
  "irenaeus",
  "tertullian",
  "origen", "origenist", "origenists", "origenism",
  "evagrius",
  "macarius",
  "antony", "anthony",
  "isaac",
  "ephrem", "ephraim",
  "dorotheos",
  "barsanuphius",
  "diadochos",
  "photiki",
  "nikodemos",
  "makarios",
  "symeon",
  "palamas", "palamism", "palamite", "palamites",
  "gregorios", "gregorian",
  "florovsky", "lossky", "schmemann", "meyendorff",
  "zizioulas", "yannaras", "ware", "behr",
  "popovich", "shevkunov",
  "kronstadt",
  "vladimir",
  "moscow",
  "russia", "russian", "russians",
  "constantinople",
  "byzantium", "byzantine",
  "alexandria", "alexandrian",
  "antioch", "antiochian", "antiochene",
  "ephesus", "ephesians",
  "ephesians",
  "thessalonica", "thessalonians",
  "philippi", "philippians",
  "athens", "athenian",
  "rome", "roman", "romans",
  "jerusalem",
  "bethlehem",
  "galilee", "galilean",
  "judea", "judean", "judaea",
  "samaria", "samaritan", "samaritans",
  "nazareth", "nazarene",
  // Common Christian-Greek terms
  "isaiah", "jeremiah", "ezekiel", "daniel",
  "elijah", "elisha",
  "abraham", "isaac", "jacob", "moses", "aaron",
  "matthew", "mark", "luke", "john",
  "peter", "paul", "james",
  "barnabas", "timothy", "titus", "philemon",
  "noah", "enoch",
  "david", "solomon",
  "saul",
  // Sayings of the Desert Fathers
  "abba", "amma", "ammas", "abbas",
  "anchorite",
];
for (const w of EXTRA_VOCAB) baseWords.add(w.toLowerCase());

// Re-derive plural / past-tense / -er / -ing forms for words we added,
// since the base dictionary may not have them.
const __derived: string[] = [];
for (const w of EXTRA_VOCAB) {
  if (w.endsWith("e")) {
    __derived.push(w + "d", w + "s", w.slice(0, -1) + "ing");
  } else if (w.endsWith("y")) {
    __derived.push(w.slice(0, -1) + "ies", w + "s");
  } else {
    __derived.push(w + "s", w + "ed", w + "ing");
  }
}
for (const w of __derived) baseWords.add(w.toLowerCase());

// ── Frequency-based proper-noun whitelist: scan the corpus once and
// any Capitalized token that occurs ≥3 times is treated as a proper noun
// going forward. Built lazily inside collectProposals.

// ── Tokenizer ──────────────────────────────────────────────────────────────

// Match runs of letters (and apostrophes) — treat as one token.
const TOKEN_RE = /[A-Za-z][A-Za-z']*[A-Za-z]|[A-Za-z]/g;

function* tokenize(text: string): Iterable<{ token: string; index: number }> {
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    yield { token: m[0], index: m.index };
  }
}

// ── Levenshtein with early termination at distance > 1 ─────────────────────

function levDist1(a: string, b: string): boolean {
  if (a === b) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  // Same length: count diffs, return true if exactly 1.
  if (a.length === b.length) {
    let diffs = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        diffs += 1;
        if (diffs > 1) return false;
      }
    }
    return diffs === 1;
  }
  // Different length by 1: one insertion or deletion.
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
    } else {
      skipped += 1;
      if (skipped > 1) return false;
      j += 1;
    }
  }
  return true;
}

// ── OCR confusion check ────────────────────────────────────────────────────

// Pairs of character classes commonly confused by OCR. The "fix" direction
// is from the first member to the second (e.g. 1→l, i→l, u→n).
const OCR_CHAR_CLASSES: Record<string, string> = {
  // digit-letter confusions
  "1": "l",
  "0": "o",
  "5": "s",
  // letter-letter confusions
  "i": "l", "l": "i",
  "u": "n", "n": "u",
  "o": "c", "c": "o",
  "h": "b", "b": "h",
  "e": "c", "c2": "e",
};

function diffIsOcrLikely(orig: string, fixed: string): boolean {
  if (orig.length === fixed.length) {
    // Single-char substitution
    let pos = -1;
    for (let i = 0; i < orig.length; i += 1) {
      if (orig[i] !== fixed[i]) {
        pos = i;
        break;
      }
    }
    if (pos < 0) return false;
    const o = orig[pos]!.toLowerCase();
    const f = fixed[pos]!.toLowerCase();
    return OCR_CHAR_CLASSES[o] === f;
  }
  // Insertion / deletion — only a few specific patterns allowed.
  const [short, long] = orig.length < fixed.length ? [orig, fixed] : [fixed, orig];
  // Find the insertion point.
  let i = 0;
  let j = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i += 1;
      j += 1;
    } else {
      // Insertion/deletion of long[j]
      const c = long[j]!.toLowerCase();
      // Common: OCR drops/adds whitespace-like or fragment chars
      // Don't allow arbitrary insertions — too risky.
      if (c === "i" || c === "l" || c === "j") {
        j += 1;
        // Bail if there's another mismatch
        if (i < short.length && short[i] !== long[j]) return false;
      } else {
        return false;
      }
    }
  }
  return true;
}

// ── Per-bundle processing ──────────────────────────────────────────────────

type Proposal = {
  original: string;
  candidate: string;
  count: number;
};

type Bundle = {
  entries?: Array<{ excerpt?: string; takeaway?: string; title?: string }>;
  chapters?: Array<{
    title?: string;
    summary?: string;
    sections?: Array<{ paragraphs?: Array<{ text?: string }> }>;
  }>;
};

function isProperNounContext(text: string, tokenStart: number, token: string): boolean {
  // Skip tokens that look like proper nouns: starts with uppercase AND
  // either previous non-space char is not a sentence-end OR token is in
  // a mid-sentence position with a leading capital.
  if (token.length === 0) return false;
  const first = token[0]!;
  if (first !== first.toUpperCase()) return false;
  // Find previous non-whitespace char
  let idx = tokenStart - 1;
  while (idx >= 0 && /\s/.test(text[idx]!)) idx -= 1;
  if (idx < 0) return true; // start of paragraph — could be either, treat as proper noun to be safe
  const prev = text[idx]!;
  // If previous char is sentence-end, this could be a normal sentence start.
  // But we still skip mid-sentence capitals (proper nouns).
  if (/[.!?]/.test(prev)) {
    // Sentence start — token may or may not be proper noun. To be safe,
    // also skip these.
    return true;
  }
  return true; // Any other capital in mid-sentence → proper noun. Skip.
}

function collectProposals(): Map<string, Proposal> {
  const proposals = new Map<string, Proposal>();

  const files = readdirSync(GENERATED_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );

  let scanned = 0;
  for (const file of files) {
    const path = join(GENERATED_DIR, file);
    const stat = statSync(path);
    if (!stat.isFile()) continue;
    const bundle: Bundle = JSON.parse(readFileSync(path, "utf8"));

    const visit = (text: string) => {
      for (const { token, index } of tokenize(text)) {
        scanned += 1;
        if (token.length < 4) continue;
        if (token.length > 24) continue;
        if (/[A-Z]/.test(token) && /[A-Z]/.test(token.slice(1))) continue; // mostly caps
        if (isProperNounContext(text, index, token)) continue;
        const lower = token.toLowerCase();
        if (baseWords.has(lower)) continue;
        if (isArchaicVerbForm(lower)) continue;
        if (isAllowedShortFragment(lower)) continue;
        // Also skip Latin/Greek transliterations that pass certain checks:
        // ends in -us, -um, -os, -on, -is, -ai, -oi (common Greek/Latin endings)
        // and the stem (minus 2 chars) is a non-English-looking sequence
        // (let it through as a foreign-language token).
        if (/^[a-z]{4,}(us|um|os|on|ai|oi)$/.test(lower)) continue;
        // Try edit-distance-1 candidates from dictionary.
        // Quick win: only consider same-length-or-±1 strings starting with
        // the same first letter (after applying common OCR substitutions).
        const fc = lower[0]!;
        const firstLetterCandidates = [fc];
        // If first letter is a known OCR variant, also try its fix
        const fix1 = OCR_CHAR_CLASSES[fc];
        if (fix1) firstLetterCandidates.push(fix1);
        let bestCandidate: string | null = null;
        let candidateCount = 0;
        for (const fl of firstLetterCandidates) {
          for (const dictWord of dictByFirstLetter.get(fl) ?? []) {
            if (Math.abs(dictWord.length - lower.length) > 1) continue;
            if (!levDist1(lower, dictWord)) continue;
            if (!diffIsOcrLikely(lower, dictWord)) continue;
            candidateCount += 1;
            bestCandidate = dictWord;
            if (candidateCount > 1) break;
          }
          if (candidateCount > 1) break;
        }
        if (candidateCount !== 1 || !bestCandidate) continue;
        const key = lower;
        const existing = proposals.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          proposals.set(key, { original: lower, candidate: bestCandidate, count: 1 });
        }
      }
    };

    if (Array.isArray(bundle.entries)) {
      for (const e of bundle.entries) {
        if (typeof e.excerpt === "string") visit(e.excerpt);
        if (typeof e.takeaway === "string") visit(e.takeaway);
      }
    }
    if (Array.isArray(bundle.chapters)) {
      for (const c of bundle.chapters) {
        if (typeof c.summary === "string") visit(c.summary);
        if (Array.isArray(c.sections)) {
          for (const s of c.sections) {
            if (!Array.isArray(s.paragraphs)) continue;
            for (const p of s.paragraphs) {
              if (typeof p.text === "string") visit(p.text);
            }
          }
        }
      }
    }
  }
  console.log(`[spell] tokens scanned: ${scanned}`);
  return proposals;
}

// Index dictionary by first letter for faster candidate lookup.
const dictByFirstLetter = new Map<string, string[]>();
for (const w of baseWords) {
  if (w.length === 0) continue;
  const fl = w[0]!;
  let bucket = dictByFirstLetter.get(fl);
  if (!bucket) {
    bucket = [];
    dictByFirstLetter.set(fl, bucket);
  }
  bucket.push(w);
}

// ── Apply phase ────────────────────────────────────────────────────────────

function applyProposals(applyMap: Map<string, string>): {
  bundles: number;
  paragraphsModified: number;
  totalReplacements: number;
} {
  const files = readdirSync(GENERATED_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );
  let bundles = 0;
  let paragraphsModified = 0;
  let totalReplacements = 0;

  // Build a single regex matching all originals as whole words.
  const originals = Array.from(applyMap.keys());
  if (originals.length === 0) {
    return { bundles: 0, paragraphsModified: 0, totalReplacements: 0 };
  }
  const escaped = originals.map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  function fix(text: string): { out: string; n: number } {
    let n = 0;
    const out = text.replace(re, (match) => {
      const lower = match.toLowerCase();
      const target = applyMap.get(lower);
      if (!target) return match;
      n += 1;
      // Preserve case: if first char of match is uppercase, capitalize target
      if (match[0] === match[0]!.toUpperCase()) {
        return target.charAt(0).toUpperCase() + target.slice(1);
      }
      return target;
    });
    return { out, n };
  }

  for (const file of files) {
    const path = join(GENERATED_DIR, file);
    const stat = statSync(path);
    if (!stat.isFile()) continue;
    const bundle: Bundle = JSON.parse(readFileSync(path, "utf8"));
    let bundleModified = false;
    let localReplacements = 0;

    if (Array.isArray(bundle.entries)) {
      for (const e of bundle.entries) {
        for (const key of ["excerpt", "takeaway", "title"] as const) {
          const v = e[key];
          if (typeof v !== "string") continue;
          const { out, n } = fix(v);
          if (n > 0) {
            e[key] = out;
            bundleModified = true;
            localReplacements += n;
          }
        }
      }
    }
    if (Array.isArray(bundle.chapters)) {
      for (const c of bundle.chapters) {
        for (const key of ["title", "summary"] as const) {
          const v = c[key];
          if (typeof v !== "string") continue;
          const { out, n } = fix(v);
          if (n > 0) {
            c[key] = out;
            bundleModified = true;
            localReplacements += n;
          }
        }
        if (Array.isArray(c.sections)) {
          for (const s of c.sections) {
            if (!Array.isArray(s.paragraphs)) continue;
            for (const p of s.paragraphs) {
              if (typeof p.text !== "string") continue;
              const { out, n } = fix(p.text);
              if (n > 0) {
                p.text = out;
                bundleModified = true;
                paragraphsModified += 1;
                localReplacements += n;
              }
            }
          }
        }
      }
    }
    if (bundleModified) {
      writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
      bundles += 1;
      totalReplacements += localReplacements;
    }
  }
  return { bundles, paragraphsModified, totalReplacements };
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const mode = process.argv[2] ?? "scan";
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = join(REPORTS_DIR, "spell-proposals.json");

  if (mode === "scan") {
    console.log(`[spell] dictionary size: ${baseWords.size}`);
    const proposals = collectProposals();
    // Sort by count desc
    const list = [...proposals.values()].sort((a, b) => b.count - a.count);
    writeFileSync(reportPath, `${JSON.stringify({ proposals: list }, null, 2)}\n`);
    console.log(`[spell] proposals: ${list.length} unique misspellings`);
    console.log(`[spell] top 30:`);
    for (const p of list.slice(0, 30)) {
      console.log(`  ${p.original.padEnd(20)} → ${p.candidate.padEnd(20)} (×${p.count})`);
    }
    console.log(`[spell] report: ${reportPath}`);
  } else if (mode === "apply") {
    if (!existsSync(reportPath)) {
      console.error(`[spell] no report at ${reportPath} — run scan first`);
      process.exit(1);
    }
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      proposals: Proposal[];
    };
    // Apply only proposals that occurred at least once (after manual prune).
    const applyMap = new Map<string, string>();
    for (const p of report.proposals) {
      if (p.count < 1) continue;
      applyMap.set(p.original, p.candidate);
    }
    console.log(`[spell] applying ${applyMap.size} fixes…`);
    const stats = applyProposals(applyMap);
    console.log(`[spell] bundles modified: ${stats.bundles}`);
    console.log(`[spell] paragraphs modified: ${stats.paragraphsModified}`);
    console.log(`[spell] total replacements: ${stats.totalReplacements}`);
  } else {
    console.error(`unknown mode: ${mode}`);
    process.exit(1);
  }
}

main();
