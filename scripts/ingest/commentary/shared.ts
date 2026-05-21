import { getCanonByAlias, normalizeCanonAlias } from "../../../src/lib/content/book-canon";

// Common Orthodox/biblical abbreviations encountered in PDF extractions.
// Keys are normalized (lowercase, no punctuation). Values are book slugs.
const EXTRA_ALIASES: Record<string, string> = {
  // OT
  "gn": "genesis",
  "ex": "exodus",
  "exo": "exodus",
  "lev": "leviticus",
  "lv": "leviticus",
  "num": "numbers",
  "nm": "numbers",
  "deut": "deuteronomy",
  "dt": "deuteronomy",
  "jos": "joshua",
  "josh": "joshua",
  "jdg": "judges",
  "judg": "judges",
  "rth": "ruth",
  "ru": "ruth",
  "1 sam": "first-samuel",
  "1sam": "first-samuel",
  "i sam": "first-samuel",
  "2 sam": "second-samuel",
  "2sam": "second-samuel",
  "ii sam": "second-samuel",
  "1 kgs": "first-kings",
  "1 kings": "first-kings",
  "i kings": "first-kings",
  "2 kgs": "second-kings",
  "2 kings": "second-kings",
  "ii kings": "second-kings",
  "1 chr": "first-chronicles",
  "i chr": "first-chronicles",
  "2 chr": "second-chronicles",
  "ii chr": "second-chronicles",
  "neh": "nehemiah",
  "est": "esther",
  "jb": "job",
  "ps": "psalms",
  "psa": "psalms",
  "psalm": "psalms",
  "pr": "proverbs",
  "prov": "proverbs",
  "prv": "proverbs",
  "ecc": "ecclesiastes",
  "eccl": "ecclesiastes",
  "qoh": "ecclesiastes",
  "sg": "song-of-solomon",
  "song": "song-of-solomon",
  "cant": "song-of-solomon",
  "isa": "isaiah",
  "is": "isaiah",
  "jer": "jeremiah",
  "lam": "lamentations",
  "ezek": "ezekiel",
  "ezk": "ezekiel",
  "ez": "ezekiel",
  "dan": "daniel",
  "dn": "daniel",
  "hos": "hosea",
  "joel": "joel",
  "jl": "joel",
  "am": "amos",
  "amos": "amos",
  "obad": "obadiah",
  "ob": "obadiah",
  "jon": "jonah",
  "mic": "micah",
  "nah": "nahum",
  "hab": "habakkuk",
  "zep": "zephaniah",
  "zeph": "zephaniah",
  "hag": "haggai",
  "zec": "zechariah",
  "zech": "zechariah",
  "mal": "malachi",
  // Deuterocanon
  "wis": "wisdom",
  "wisd": "wisdom",
  "sir": "sirach",
  "ecclus": "sirach",
  "bar": "baruch",
  "1 macc": "first-maccabees",
  "1 mac": "first-maccabees",
  "i macc": "first-maccabees",
  "2 macc": "second-maccabees",
  "ii macc": "second-maccabees",
  "tob": "tobit",
  "jdt": "judith",
  // NT
  "mt": "matthew",
  "mat": "matthew",
  "matt": "matthew",
  "mk": "mark",
  "mr": "mark",
  "mar": "mark",
  "lk": "luke",
  "lu": "luke",
  "luk": "luke",
  "jn": "john",
  "jhn": "john",
  "joh": "john",
  "ac": "acts",
  "act": "acts",
  "acts": "acts",
  "rom": "romans",
  "ro": "romans",
  "1 cor": "first-corinthians",
  "1cor": "first-corinthians",
  "1co": "first-corinthians",
  "i cor": "first-corinthians",
  "2 cor": "second-corinthians",
  "2cor": "second-corinthians",
  "2co": "second-corinthians",
  "ii cor": "second-corinthians",
  "gal": "galatians",
  "ga": "galatians",
  "eph": "ephesians",
  "phil": "philippians",
  "php": "philippians",
  "col": "colossians",
  "1 thess": "first-thessalonians",
  "i thess": "first-thessalonians",
  "1 th": "first-thessalonians",
  "2 thess": "second-thessalonians",
  "ii thess": "second-thessalonians",
  "2 th": "second-thessalonians",
  "1 tim": "first-timothy",
  "i tim": "first-timothy",
  "1 ti": "first-timothy",
  "2 tim": "second-timothy",
  "ii tim": "second-timothy",
  "2 ti": "second-timothy",
  "tit": "titus",
  "ti": "titus",
  "phlm": "philemon",
  "phm": "philemon",
  "heb": "hebrews",
  "jas": "james",
  "jm": "james",
  "1 pet": "first-peter",
  "1 pe": "first-peter",
  "i pet": "first-peter",
  "2 pet": "second-peter",
  "2 pe": "second-peter",
  "ii pet": "second-peter",
  "1 jn": "first-john",
  "1 jo": "first-john",
  "1jo": "first-john",
  "i jn": "first-john",
  "2 jn": "second-john",
  "2 jo": "second-john",
  "2jo": "second-john",
  "ii jn": "second-john",
  "3 jn": "third-john",
  "3 jo": "third-john",
  "3jo": "third-john",
  "iii jn": "third-john",
  "jud": "jude",
  "rev": "revelation",
  "re": "revelation",
  "apoc": "revelation",
};

export function resolveBookSlug(rawBook: string): string | undefined {
  const normalized = normalizeCanonAlias(rawBook);
  const direct = getCanonByAlias(normalized);
  if (direct) return direct.slug;
  const fromExtras = EXTRA_ALIASES[normalized];
  return fromExtras;
}

// Squashes PDF-extraction artifacts inside number/citation patterns.
// Examples: "1 : 2 7" → "1:27", "5 :23" → "5:23", "3 : 8-30" → "3:8-30".
export function collapseCitationSpaces(text: string): string {
  return text
    // collapse spaces around colons inside numeric refs
    .replace(/(\d)\s*:\s*(\d)/g, "$1:$2")
    // collapse spaces inside multi-digit numbers that flank a colon or hyphen
    .replace(/(\d):(\d)\s+(\d)(?=\D|$)/g, "$1:$2$3")
    .replace(/(\d):(\d{2})\s+(\d)(?=\D|$)/g, "$1:$2$3")
    .replace(/(\d)\s*-\s*(\d)/g, "$1-$2")
    .replace(/(\d)-(\d)\s+(\d)(?=\D|$)/g, "$1-$2$3");
}

// Normalize whitespace, dehyphenate line breaks, strip control chars.
export function cleanFlowText(text: string): string {
  return text
    .replace(/­/g, "") // soft hyphens
    .replace(/-\s*\n\s*/g, "") // hyphenated line breaks
    .replace(/\s+/g, " ")
    .trim();
}

// A modest excerpt — at most one sentence boundary on either side of the cite.
// Caps the result length to avoid pulling large blocks of text.
export function extractExcerpt(
  fullText: string,
  matchStart: number,
  matchEnd: number,
  maxLength = 280,
): string {
  // Find the sentence boundary before the match
  let start = matchStart;
  for (let i = matchStart - 1; i >= 0 && matchStart - i < maxLength; i -= 1) {
    const ch = fullText[i];
    if (ch === "." || ch === "!" || ch === "?") {
      start = i + 1;
      break;
    }
    if (i === 0) start = 0;
  }
  // Find the sentence boundary after the match
  let end = matchEnd;
  for (let i = matchEnd; i < fullText.length && i - matchEnd < maxLength; i += 1) {
    const ch = fullText[i];
    if (ch === "." || ch === "!" || ch === "?") {
      end = i + 1;
      break;
    }
    if (i === fullText.length - 1) end = fullText.length;
  }
  let snippet = cleanFlowText(fullText.slice(start, end));
  if (snippet.length > maxLength) {
    snippet = snippet.slice(0, maxLength - 1).trimEnd() + "…";
  }
  return snippet;
}
