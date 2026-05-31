import type { BibleChapter, BibleVerse } from "@theosis/core";
import type { CanonEntry } from "../../src/lib/content/book-canon";
import { getCanonBySlug, normalizeCanonAlias } from "../../src/lib/content/book-canon";
import { createVerseId } from "../../src/lib/content/reference";

export type ParsedTranslationData = {
  chapters: BibleChapter[];
  verses: BibleVerse[];
};

type VerseOptions = {
  paragraphStart?: boolean;
  emphasisLabel?: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ", ensp: " ", emsp: " ", thinsp: " ", shy: "",
  // Ligatures + accented letters that leaked undecoded into rendered text.
  oelig: "œ", OElig: "Œ", aelig: "æ", AElig: "Æ", szlig: "ß",
  iuml: "ï", euml: "ë", uuml: "ü", ouml: "ö", auml: "ä", yuml: "ÿ",
  Iuml: "Ï", Euml: "Ë", Uuml: "Ü", Ouml: "Ö", Auml: "Ä",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", aacute: "á",
  ocirc: "ô", ograve: "ò", oacute: "ó", icirc: "î", igrave: "ì", iacute: "í",
  ucirc: "û", ugrave: "ù", uacute: "ú", ccedil: "ç", ntilde: "ñ", atilde: "ã", otilde: "õ",
  Eacute: "É", Egrave: "È", Ecirc: "Ê", Agrave: "À", Acirc: "Â",
  Ocirc: "Ô", Ccedil: "Ç", Ntilde: "Ñ",
  sect: "§", para: "¶", deg: "°", micro: "µ", pound: "£", cent: "¢", euro: "€",
  copy: "©", reg: "®", trade: "™", dagger: "†", Dagger: "‡",
  mdash: "—", ndash: "–", hellip: "…", horbar: "―",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", sbquo: "‚", bdquo: "„",
  laquo: "«", raquo: "»", lsaquo: "‹", rsaquo: "›",
  middot: "·", bull: "•", prime: "′", Prime: "″",
  frac12: "½", frac14: "¼", frac34: "¾", times: "×", divide: "÷", plusmn: "±",
};

const BYZANTINE_TRANSLITERATION: Record<string, string> = {
  a: "α",
  b: "β",
  c: "χ",
  d: "δ",
  e: "ε",
  f: "φ",
  g: "γ",
  h: "η",
  i: "ι",
  k: "κ",
  l: "λ",
  m: "μ",
  n: "ν",
  o: "ο",
  p: "π",
  q: "ψ",
  r: "ρ",
  s: "σ",
  t: "τ",
  u: "υ",
  v: "ς",
  w: "ω",
  x: "ξ",
  y: "θ",
  z: "ζ",
};

const UAN_TRANSLITERATION: Record<string, string> = {
  ...BYZANTINE_TRANSLITERATION,
  q: "θ",
  y: "ψ",
};

function sortByCanonicalOrder<T extends { bookSlug: string; chapterNumber: number }>(
  left: T,
  right: T,
) {
  const leftBook = getCanonBySlug(left.bookSlug);
  const rightBook = getCanonBySlug(right.bookSlug);
  const leftOrder = leftBook?.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = rightBook?.order ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  if (left.chapterNumber !== right.chapterNumber) {
    return left.chapterNumber - right.chapterNumber;
  }

  const leftVerseNumber = "verseNumber" in left
    ? (left as Record<"verseNumber", number>).verseNumber
    : 0;
  const rightVerseNumber = "verseNumber" in right
    ? (right as Record<"verseNumber", number>).verseNumber
    : 0;

  return leftVerseNumber - rightVerseNumber;
}

function buildChapterId(translationId: string, bookSlug: string, chapterNumber: number) {
  return `${translationId}:${bookSlug}.${chapterNumber}`;
}

export function createTranslationCollector(translationId: string, translationLabel: string) {
  const chapterMap = new Map<string, BibleChapter>();
  const verseMap = new Map<string, BibleVerse>();

  function addChapter(entry: CanonEntry, chapterNumber: number, summary?: string) {
    const chapterId = buildChapterId(translationId, entry.slug, chapterNumber);

    if (chapterMap.has(chapterId)) {
      return;
    }

    chapterMap.set(chapterId, {
      id: chapterId,
      translationId,
      bookSlug: entry.slug,
      chapterNumber,
      referenceLabel: `${entry.name} ${chapterNumber}`,
      summary: summary ?? `Source text for ${entry.name} ${chapterNumber} in ${translationLabel}.`,
    });
  }

  function addVerse(
    entry: CanonEntry,
    chapterNumber: number,
    verseNumber: number,
    text: string,
    options: VerseOptions = {},
  ) {
    const cleanedText = cleanVerseText(text);

    if (!cleanedText) {
      return;
    }

    addChapter(entry, chapterNumber);

    const verseId = createVerseId(translationId, entry.slug, chapterNumber, verseNumber);

    verseMap.set(verseId, {
      id: verseId,
      translationId,
      bookSlug: entry.slug,
      chapterNumber,
      verseNumber,
      referenceLabel: `${entry.name} ${chapterNumber}:${verseNumber}`,
      text: cleanedText,
      paragraphStart: options.paragraphStart ?? verseNumber === 1,
      emphasisLabel: options.emphasisLabel,
    });
  }

  function finalize(): ParsedTranslationData {
    return {
      chapters: Array.from(chapterMap.values()).sort(sortByCanonicalOrder),
      verses: Array.from(verseMap.values()).sort(sortByCanonicalOrder),
    };
  }

  return {
    addChapter,
    addVerse,
    finalize,
  };
}

export function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (_, entity) => NAMED_ENTITIES[entity] ?? `&${entity};`);
}

export function cleanVerseText(value: string) {
  return decodeEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    // Stray spaces around apostrophes/quotes left when inline tags (e.g. WEB's
    // USFX <wj> words-of-Jesus markup) are stripped to spaces \u2014 "God \u2019s" /
    // "Don\u2019 t" / "\u201c Lord" / "word \u201d". Only fires when a space is actually present.
    .replace(/(\w)(?:\s+['\u2019]\s*|['\u2019]\s+)(s|t|ll|ve|re|d|m)\b/g, "$1\u2019$2")
    .replace(/([\u201c\u2018])\s+(?=\S)/g, "$1")
    .replace(/\s+([\u201d])/g, "$1")
    .trim();
}

export function normalizeHeading(value: string) {
  return normalizeCanonAlias(value);
}

export function stripXmlVerseMarkup(fragment: string) {
  const paragraphStart = /<milestone\b[^>]*type=['"]x-p['"][^>]*\/?>/i.test(fragment);
  const text = fragment
    .replace(/<note\b[\s\S]*?<\/note>/gi, " ")
    .replace(/<milestone\b[^>]*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return {
    text: cleanVerseText(text),
    paragraphStart,
  };
}

export function transliterateAsciiGreek(value: string, variant: "byz" | "uan") {
  const map = variant === "byz" ? BYZANTINE_TRANSLITERATION : UAN_TRANSLITERATION;

  const transliterated = value.replace(/[A-Za-z]/g, (character) => {
    const lower = character.toLowerCase();
    return map[lower] ?? character;
  });

  return transliterated.replace(/σ(?=($|[\s,.;:!?·]))/g, "ς");
}

export function stripInlineFootnoteMarkers(value: string) {
  return value
    .replace(/[*†‡§¶‖#]+/g, "")
    .replace(/\b([a-z])(?=[,.;:!?])/g, "$1");
}
