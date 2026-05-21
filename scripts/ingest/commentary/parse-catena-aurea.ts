import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
} from "@theosis/core";

export type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
};

type CatenaParseConfig = {
  corpusDir: string;
  verseTranslationPrefix: string;
};

const WORK_ID = "catena-aurea-matthew";
const SOURCE_ID = "catena-aurea-source";
const AQUINAS_ID = "thomas-aquinas";

// ── Author registry ──────────────────────────────────────────────────────────

type AuthorInfo = {
  personId: string;
  displayName: string;
  honorific: string;
  eraLabel: string;
  summary: string;
  traditions: string[];
  rank: number;
};

const AUTHORS: [string[], AuthorInfo][] = [
  [
    ["chrys", "chrysostom"],
    {
      personId: "john-chrysostom",
      displayName: "John Chrysostom",
      honorific: "St.",
      eraLabel: "4th–5th century",
      summary:
        "Archbishop of Constantinople, renowned for his preaching and extensive biblical homilies.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 85,
    },
  ],
  [
    ["pseudo-chrys", "pseudo-chrysostom"],
    {
      personId: "pseudo-chrysostom",
      displayName: "Pseudo-Chrysostom",
      honorific: "",
      eraLabel: "patristic era",
      summary: "Anonymous author whose work was attributed to Chrysostom.",
      traditions: ["Eastern Orthodox"],
      rank: 55,
    },
  ],
  [
    ["aug", "augustine"],
    {
      personId: "augustine",
      displayName: "Augustine of Hippo",
      honorific: "St.",
      eraLabel: "4th–5th century",
      summary:
        "Bishop of Hippo and Doctor of the Church, author of Confessions and City of God.",
      traditions: ["Roman Catholic", "Western Christianity"],
      rank: 85,
    },
  ],
  [
    ["jerome"],
    {
      personId: "jerome",
      displayName: "Jerome",
      honorific: "St.",
      eraLabel: "4th–5th century",
      summary: "Biblical scholar and Doctor of the Church, translator of the Vulgate.",
      traditions: ["Roman Catholic"],
      rank: 85,
    },
  ],
  [
    ["ambrose"],
    {
      personId: "ambrose-of-milan",
      displayName: "Ambrose of Milan",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Bishop of Milan, Doctor of the Church, and teacher of Augustine.",
      traditions: ["Roman Catholic"],
      rank: 80,
    },
  ],
  [
    ["hilary"],
    {
      personId: "hilary-poitiers",
      displayName: "Hilary of Poitiers",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Bishop of Poitiers, known as the 'Athanasius of the West' for his defense of Nicene orthodoxy.",
      traditions: ["Roman Catholic"],
      rank: 75,
    },
  ],
  [
    ["bede"],
    {
      personId: "bede",
      displayName: "Bede the Venerable",
      honorific: "St.",
      eraLabel: "7th–8th century",
      summary: "English monk, biblical commentator, and Father of English History.",
      traditions: ["Roman Catholic"],
      rank: 75,
    },
  ],
  [
    ["rabanus", "raban"],
    {
      personId: "rabanus-maurus",
      displayName: "Rabanus Maurus",
      honorific: "",
      eraLabel: "9th century",
      summary: "Frankish theologian and Archbishop of Mainz, known as the 'Teacher of Germany.'",
      traditions: ["Roman Catholic"],
      rank: 65,
    },
  ],
  [
    ["remig", "remigius"],
    {
      personId: "remigius-auxerre",
      displayName: "Remigius of Auxerre",
      honorific: "",
      eraLabel: "9th century",
      summary: "Carolingian theologian and biblical commentator.",
      traditions: ["Roman Catholic"],
      rank: 65,
    },
  ],
  [
    ["greg", "gregory"],
    {
      personId: "gregory-the-great",
      displayName: "Gregory the Great",
      honorific: "St.",
      eraLabel: "6th century",
      summary: "Pope and Doctor of the Church, author of Moralia in Job and Pastoral Rule.",
      traditions: ["Roman Catholic"],
      rank: 80,
    },
  ],
  [
    ["gloss"],
    {
      personId: "gloss-ordinaria",
      displayName: "Gloss Ordinaria",
      honorific: "",
      eraLabel: "medieval",
      summary: "The standard medieval marginal and interlinear commentary on Scripture.",
      traditions: ["Roman Catholic"],
      rank: 55,
    },
  ],
  [
    ["leo"],
    {
      personId: "leo-the-great",
      displayName: "Leo the Great",
      honorific: "St.",
      eraLabel: "5th century",
      summary: "Pope and Doctor of the Church, defender of Chalcedonian Christology.",
      traditions: ["Roman Catholic"],
      rank: 80,
    },
  ],
  [
    ["isidore"],
    {
      personId: "isidore-seville",
      displayName: "Isidore of Seville",
      honorific: "St.",
      eraLabel: "6th–7th century",
      summary: "Archbishop of Seville, encyclopedist and Doctor of the Church.",
      traditions: ["Roman Catholic"],
      rank: 65,
    },
  ],
  [
    ["cyril"],
    {
      personId: "cyril-of-alexandria",
      displayName: "Cyril of Alexandria",
      honorific: "St.",
      eraLabel: "4th–5th century",
      summary:
        "Patriarch of Alexandria and Doctor of the Church, champion of Theotokos at Ephesus.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 80,
    },
  ],
  [
    ["pseudo-athanasius"],
    {
      personId: "pseudo-athanasius",
      displayName: "Pseudo-Athanasius",
      honorific: "",
      eraLabel: "patristic era",
      summary: "Anonymous author whose work was attributed to Athanasius of Alexandria.",
      traditions: ["Eastern Orthodox"],
      rank: 55,
    },
  ],
  [
    ["theodotus"],
    {
      personId: "theodotus-ancyra",
      displayName: "Theodotus of Ancyra",
      honorific: "",
      eraLabel: "5th century",
      summary: "Bishop of Ancyra, opponent of Nestorianism.",
      traditions: ["Eastern Orthodox"],
      rank: 60,
    },
  ],
  [
    ["anselm"],
    {
      personId: "anselm-canterbury",
      displayName: "Anselm of Canterbury",
      honorific: "St.",
      eraLabel: "11th century",
      summary: "Archbishop of Canterbury and Father of Scholasticism, author of Cur Deus Homo.",
      traditions: ["Roman Catholic"],
      rank: 75,
    },
  ],
  [
    ["origen"],
    {
      personId: "origen",
      displayName: "Origen",
      honorific: "",
      eraLabel: "3rd century",
      summary:
        "Alexandrian biblical scholar and theologian, prolific author of Scripture commentaries and homilies.",
      traditions: ["Eastern Christianity"],
      rank: 70,
    },
  ],
  [
    ["lactantius"],
    {
      personId: "lactantius",
      displayName: "Lactantius",
      honorific: "",
      eraLabel: "3rd–4th century",
      summary: "Early Christian apologist, called the 'Christian Cicero.'",
      traditions: ["Roman Catholic"],
      rank: 60,
    },
  ],
  [
    ["chrysol", "chrysologus"],
    {
      personId: "peter-chrysologus",
      displayName: "Peter Chrysologus",
      honorific: "St.",
      eraLabel: "5th century",
      summary: "Archbishop of Ravenna and Doctor of the Church, known for his brief homilies.",
      traditions: ["Roman Catholic"],
      rank: 70,
    },
  ],
  [
    ["pseudo-jerome"],
    {
      personId: "pseudo-jerome",
      displayName: "Pseudo-Jerome",
      honorific: "",
      eraLabel: "patristic era",
      summary: "Anonymous author whose work was attributed to Jerome.",
      traditions: ["Roman Catholic"],
      rank: 55,
    },
  ],
  [
    ["basil"],
    {
      personId: "basil-the-great",
      displayName: "Basil the Great",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Archbishop of Caesarea and Doctor of the Church, one of the three Cappadocian Fathers.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 80,
    },
  ],
  [
    ["theophyl", "theophylact"],
    {
      personId: "theophylact-of-ohrid",
      displayName: "Theophylact of Ohrid",
      honorific: "",
      eraLabel: "11th–12th century",
      summary:
        "Archbishop of Ohrid, author of detailed commentaries on the New Testament.",
      traditions: ["Eastern Orthodox"],
      rank: 70,
    },
  ],
  [
    ["euthymius"],
    {
      personId: "euthymius-zigabenus",
      displayName: "Euthymius Zigabenus",
      honorific: "",
      eraLabel: "11th–12th century",
      summary: "Byzantine monk and biblical commentator.",
      traditions: ["Eastern Orthodox"],
      rank: 65,
    },
  ],
  [
    ["dion", "dionysius"],
    {
      personId: "pseudo-dionysius",
      displayName: "Pseudo-Dionysius",
      honorific: "",
      eraLabel: "5th–6th century",
      summary:
        "Anonymous mystical theologian whose writings profoundly influenced Eastern and Western Christianity.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 65,
    },
  ],
];

const AUTHOR_LOOKUP = new Map<string, AuthorInfo>();
for (const [keys, info] of AUTHORS) {
  for (const key of keys) {
    AUTHOR_LOOKUP.set(key, info);
  }
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveAuthor(rawAttrib: string): AuthorInfo | null {
  const authorPart = rawAttrib.split(",")[0].trim();
  const key = normalizeKey(authorPart);

  if (AUTHOR_LOOKUP.has(key)) return AUTHOR_LOOKUP.get(key)!;

  for (const [mapKey, info] of AUTHOR_LOOKUP) {
    if (key.startsWith(mapKey) || (mapKey.length >= 4 && key.includes(mapKey))) {
      return info;
    }
  }

  return null;
}

// ── Text preprocessing ────────────────────────────────────────────────────────

function preprocessText(raw: string): string {
  let text = raw;
  // Strip provenance header lines
  text = text.replace(/^#[^\n]*\n/gm, "");
  // Strip CCEL bible links: [[Book N:N](url)] → Book N:N
  text = text.replace(/\[\[([^\]]+)\]\([^)]+\)\]/g, "$1");
  // Strip [Ver. N.](url) anchors in chapter 1, normalize to "N. "
  text = text.replace(/\[Ver\.\s*(\d+)\.\]\([^)]+\)\s*/g, "$1. ");
  // Strip [ed. note: ...] blocks (may span multiple lines)
  text = text.replace(/\[ed\. note[\s\S]*?\]/g, "");
  // Strip standalone page number lines (integer only)
  text = text.replace(/^\d+\s*$/gm, "");
  // Normalize runs of blank lines
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function cleanCommentaryText(text: string): string {
  // Remove residual markdown link syntax
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

function truncateToWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > max * 0.8 ? `${cut.slice(0, lastSpace)}…` : `${cut}…`;
}

const MAX_EXCERPT = 600;

// ── Block parsing ─────────────────────────────────────────────────────────────

const VERSE_LINE_RE = /^(\d+)\.\s+\S/;

function extractVerseNumbers(block: string): number[] {
  const verses: number[] = [];
  for (const line of block.split("\n")) {
    const match = line.trim().match(/^(\d+)\.\s+/);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (n >= 1 && n <= 100) verses.push(n);
    }
  }
  return [...new Set(verses)];
}

function parseAttribution(
  para: string,
): { rawAttrib: string; text: string } | null {
  // Skip continuation lines
  if (/^(Or,|For,|And,|But,|["“])/.test(para)) return null;
  if (/^[a-z]/.test(para)) return null;

  const colonIdx = para.indexOf(": ");
  if (colonIdx === -1 || colonIdx > 80) return null;

  const rawAttrib = para.slice(0, colonIdx).trim();
  if (!/^[A-Z]/.test(rawAttrib) || rawAttrib.includes("\n")) return null;

  const text = cleanCommentaryText(para.slice(colonIdx + 2).trim());
  if (!text) return null;

  return { rawAttrib, text };
}

type ParsedComment = {
  authorInfo: AuthorInfo;
  text: string;
};

type ParsedSection = {
  chapterNum: number;
  verseNumbers: number[];
  comments: ParsedComment[];
};

function parseChapterFile(
  chapterNum: number,
  corpusDir: string,
): ParsedSection[] {
  const filePath = join(
    corpusDir,
    `chapter_${String(chapterNum).padStart(2, "0")}.txt`,
  );
  const raw = readFileSync(filePath, "utf8");
  const text = preprocessText(raw);

  const rawBlocks = text.split(/\n---\n/);
  const sections: ParsedSection[] = [];
  let currentVerses: number[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const paragraphs = trimmed
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const hasVerseLines = paragraphs.some((p) => VERSE_LINE_RE.test(p));

    if (hasVerseLines) {
      const verses = extractVerseNumbers(block);
      if (verses.length > 0) currentVerses = verses;
      continue;
    }

    if (currentVerses.length === 0) continue;

    // Commentary block — parse author paragraphs
    const comments: ParsedComment[] = [];
    let lastAuthorInfo: AuthorInfo | null = null;
    let lastTexts: string[] = [];

    function flush() {
      if (lastAuthorInfo && lastTexts.length > 0) {
        const merged = lastTexts.join(" ").replace(/\s+/g, " ").trim();
        if (merged.length >= 30) {
          comments.push({ authorInfo: lastAuthorInfo, text: merged });
        }
      }
      lastTexts = [];
    }

    for (const para of paragraphs) {
      const attrib = parseAttribution(para);
      if (attrib) {
        flush();
        const authorInfo = resolveAuthor(attrib.rawAttrib);
        if (!authorInfo) {
          lastAuthorInfo = null;
          continue;
        }
        lastAuthorInfo = authorInfo;
        lastTexts = [attrib.text];
      } else if (lastAuthorInfo) {
        lastTexts.push(para);
      }
    }
    flush();

    if (comments.length > 0) {
      sections.push({ chapterNum, verseNumbers: [...currentVerses], comments });
    }
  }

  return sections;
}

// ── Bundle builder ────────────────────────────────────────────────────────────

function buildAquinasPerson(): Person {
  return {
    id: AQUINAS_ID,
    slug: "thomas-aquinas",
    name: "Thomas Aquinas",
    honorific: "St.",
    kind: "theologian",
    eraLabel: "13th century",
    summary:
      "Dominican friar and Doctor of the Church, compiler of the Catena Aurea and author of the Summa Theologiae.",
    traditions: ["Roman Catholic"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: "catena-aurea-matthew",
    personId: AQUINAS_ID,
    title: "Catena Aurea on Matthew",
    shortTitle: "Catena Aurea (Matt.)",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "1264",
    summary:
      "A verse-by-verse chain commentary on the Gospel of Matthew compiled by Thomas Aquinas, drawing on commentary from roughly eighty Greek and Latin Church Fathers.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "Catena Aurea on Matthew — Parker/Rivington, London, 1842",
    collection: "CCEL (Christian Classics Ethereal Library)",
    sourceType: "web-collection",
    url: "https://www.ccel.org/ccel/aquinas/catena1/",
    note: "Public domain translation by John Henry Parker, 1842. Compiled by Thomas Aquinas, c. 1264.",
    isSeeded: false,
  };
}

function buildFatherPerson(info: AuthorInfo): Person {
  return {
    id: info.personId,
    slug: info.personId,
    name: info.displayName,
    honorific: info.honorific || undefined,
    kind: "father",
    eraLabel: info.eraLabel,
    summary: info.summary,
    traditions: info.traditions,
    topicSlugs: [],
    featuredWorkIds: [],
  };
}

export function parseCatenaAurea(config: CatenaParseConfig): CommentaryBundleV2 {
  const allSections: ParsedSection[] = [];

  for (let ch = 1; ch <= 28; ch++) {
    const sections = parseChapterFile(ch, config.corpusDir);
    allSections.push(...sections);
  }

  const entries: CommentaryEntry[] = [];
  const seenPersonIds = new Set<string>();
  let counter = 0;

  for (const section of allSections) {
    const { chapterNum, verseNumbers, comments } = section;
    const firstVerse = verseNumbers[0];
    const lastVerse = verseNumbers[verseNumbers.length - 1];
    const verseRangeLabel =
      firstVerse === lastVerse ? `${firstVerse}` : `${firstVerse}–${lastVerse}`;

    for (const comment of comments) {
      const { authorInfo, text } = comment;
      const excerpt = truncateToWordBoundary(text, MAX_EXCERPT);

      counter += 1;
      const baseId = `catena-matt-${counter.toString().padStart(4, "0")}`;

      // Emit one entry per verse in the range so every verse in the section
      // gets a commentary dot and clicking any of them surfaces this comment.
      for (const verseNum of verseNumbers) {
        const targetVerseId = `${config.verseTranslationPrefix}:matthew.${chapterNum}.${verseNum}`;
        entries.push({
          id: verseNumbers.length === 1 ? baseId : `${baseId}-v${verseNum}`,
          relation: "verse",
          targetVerseId,
          topicSlugs: [],
          personId: authorInfo.personId,
          workId: WORK_ID,
          title: `On Matt ${chapterNum}:${verseRangeLabel}`,
          excerpt,
          takeaway: "",
          sourceId: SOURCE_ID,
          rank: authorInfo.rank,
          tags: ["catena-aurea", "patristic", "matthew"],
        });
      }

      seenPersonIds.add(authorInfo.personId);
    }
  }

  // Build people array: Aquinas (compiler) + all cited Fathers
  const fatherMap = new Map<string, AuthorInfo>();
  for (const [, info] of AUTHORS) {
    fatherMap.set(info.personId, info);
  }

  const people: Person[] = [buildAquinasPerson()];
  for (const personId of seenPersonIds) {
    const info = fatherMap.get(personId);
    if (info) people.push(buildFatherPerson(info));
  }

  return {
    version: "2",
    people,
    works: [buildWork()],
    sources: [buildSource()],
    entries,
  };
}
