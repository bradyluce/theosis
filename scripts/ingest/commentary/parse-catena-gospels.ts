import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
} from "../../../src/domain/content/types";
import type { CommentaryBundleV2 } from "./parse-catena-aurea";

// ── Gospel config ─────────────────────────────────────────────────────────────

type GospelSpec = {
  bookSlug: string;
  chapterCount: number;
  workId: string;
  workTitle: string;
  workShortTitle: string;
  workSlug: string;
  sourceId: string;
  sourceLabel: string;
  sourceUrl: string;
  entryPrefix: string;
  eraLabel: string;
};

const GOSPEL_SPECS: Record<string, GospelSpec> = {
  mark: {
    bookSlug: "mark",
    chapterCount: 16,
    workId: "catena-aurea-mark",
    workTitle: "Catena Aurea on Mark",
    workShortTitle: "Catena Aurea (Mk.)",
    workSlug: "catena-aurea-mark",
    sourceId: "catena-aurea-mark-source",
    sourceLabel: "Catena Aurea on Mark — Parker/Rivington, London, 1842",
    sourceUrl: "https://www.ecatholic2000.com/catena/untitled-41.shtml",
    entryPrefix: "catena-mark",
    eraLabel: "1265",
  },
  luke: {
    bookSlug: "luke",
    chapterCount: 24,
    workId: "catena-aurea-luke",
    workTitle: "Catena Aurea on Luke",
    workShortTitle: "Catena Aurea (Lk.)",
    workSlug: "catena-aurea-luke",
    sourceId: "catena-aurea-luke-source",
    sourceLabel: "Catena Aurea on Luke — Parker/Rivington, London, 1842",
    sourceUrl: "https://www.ecatholic2000.com/catena/untitled-62.shtml",
    entryPrefix: "catena-luke",
    eraLabel: "1265",
  },
  john: {
    bookSlug: "john",
    chapterCount: 21,
    workId: "catena-aurea-john",
    workTitle: "Catena Aurea on John",
    workShortTitle: "Catena Aurea (Jn.)",
    workSlug: "catena-aurea-john",
    sourceId: "catena-aurea-john-source",
    sourceLabel: "Catena Aurea on John — Parker/Rivington, London, 1842",
    sourceUrl: "https://www.ecatholic2000.com/catena/untitled-89.shtml",
    entryPrefix: "catena-john",
    eraLabel: "1265",
  },
};

// ── Author registry ───────────────────────────────────────────────────────────

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
      personId: "chrysostom",
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
    ["pseudo-aug", "pseudo-augustine"],
    {
      personId: "pseudo-augustine",
      displayName: "Pseudo-Augustine",
      honorific: "",
      eraLabel: "patristic era",
      summary: "Anonymous author whose work was attributed to Augustine.",
      traditions: ["Roman Catholic"],
      rank: 55,
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
    ["ambrose"],
    {
      personId: "ambrose",
      displayName: "Ambrose of Milan",
      honorific: "St.",
      eraLabel: "4th century",
      summary: "Bishop of Milan, Doctor of the Church, and teacher of Augustine.",
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
      summary:
        "Frankish theologian and Archbishop of Mainz, known as the 'Teacher of Germany.'",
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
      personId: "gregory-great",
      displayName: "Gregory the Great",
      honorific: "St.",
      eraLabel: "6th century",
      summary:
        "Pope and Doctor of the Church, author of Moralia in Job and Pastoral Rule.",
      traditions: ["Roman Catholic"],
      rank: 80,
    },
  ],
  [
    ["gregory-nazianzen", "gregory-nazianzus", "gregory-of-nazianzus", "nazianzus", "nazianzen"],
    {
      personId: "gregory-nazianzus",
      displayName: "Gregory of Nazianzus",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Archbishop of Constantinople and Doctor of the Church, one of the three Cappadocian Fathers.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 82,
    },
  ],
  [
    ["gregory-of-nyssa", "gregory-nyssa", "nyssa"],
    {
      personId: "gregory-nyssa",
      displayName: "Gregory of Nyssa",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Bishop of Nyssa and one of the three Cappadocian Fathers, known for his mystical theology.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
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
      personId: "leo-great",
      displayName: "Leo the Great",
      honorific: "St.",
      eraLabel: "5th century",
      summary:
        "Pope and Doctor of the Church, defender of Chalcedonian Christology.",
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
    ["isidore-of-pelusium", "isidore-of-peleusium", "isidore-pelusiota"],
    {
      personId: "isidore-pelusium",
      displayName: "Isidore of Pelusium",
      honorific: "St.",
      eraLabel: "4th–5th century",
      summary:
        "Egyptian ascetic and prolific letter-writer, noted for allegorical biblical interpretation.",
      traditions: ["Eastern Orthodox"],
      rank: 65,
    },
  ],
  [
    ["cyril", "cyril-of-alexandria"],
    {
      personId: "cyril-alexandria",
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
    ["cyril-of-jerusalem", "cyril-jerusalem"],
    {
      personId: "cyril-jerusalem",
      displayName: "Cyril of Jerusalem",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Bishop of Jerusalem, known for his Catechetical Lectures explaining the Christian faith.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 75,
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
    ["athanasius"],
    {
      personId: "athanasius",
      displayName: "Athanasius of Alexandria",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Patriarch of Alexandria and champion of Nicene orthodoxy, defender of the full divinity of Christ.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 85,
    },
  ],
  [
    ["anselm"],
    {
      personId: "anselm-canterbury",
      displayName: "Anselm of Canterbury",
      honorific: "St.",
      eraLabel: "11th century",
      summary:
        "Archbishop of Canterbury and Father of Scholasticism, author of Cur Deus Homo.",
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
    ["basil"],
    {
      personId: "basil-great",
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
      personId: "theophylact-ohrid",
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
    ["eusebius"],
    {
      personId: "eusebius-caesarea",
      displayName: "Eusebius of Caesarea",
      honorific: "",
      eraLabel: "3rd–4th century",
      summary:
        "Bishop of Caesarea and the 'Father of Church History,' author of the Ecclesiastical History.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 75,
    },
  ],
  [
    ["alcuin"],
    {
      personId: "alcuin",
      displayName: "Alcuin of York",
      honorific: "",
      eraLabel: "8th century",
      summary:
        "English scholar and theologian, key figure in the Carolingian Renaissance.",
      traditions: ["Roman Catholic"],
      rank: 65,
    },
  ],
  [
    ["titus-bostrensis", "titus"],
    {
      personId: "titus-bostra",
      displayName: "Titus of Bostra",
      honorific: "",
      eraLabel: "4th century",
      summary:
        "Bishop of Bostra, known for his work against the Manichaeans and his commentary on Luke.",
      traditions: ["Eastern Christianity"],
      rank: 65,
    },
  ],
  [
    ["damascene", "john-of-damascus", "john-damascene"],
    {
      personId: "john-damascene",
      displayName: "John of Damascus",
      honorific: "St.",
      eraLabel: "7th–8th century",
      summary:
        "Syrian monk and Doctor of the Church, synthesizer of Orthodox theology and champion of holy icons.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 80,
    },
  ],
  [
    ["maximus"],
    {
      personId: "maximus-confessor",
      displayName: "Maximus the Confessor",
      honorific: "St.",
      eraLabel: "6th–7th century",
      summary:
        "Byzantine theologian and ascetic, defender of the two wills of Christ.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 78,
    },
  ],
  [
    ["clement", "clement-of-alexandria", "clement-of-alexendria"],
    {
      personId: "clement-alexandria",
      displayName: "Clement of Alexandria",
      honorific: "",
      eraLabel: "2nd–3rd century",
      summary:
        "Alexandrian theologian who sought to reconcile Greek philosophy with Christian faith.",
      traditions: ["Eastern Christianity"],
      rank: 70,
    },
  ],
  [
    ["cyprian"],
    {
      personId: "cyprian",
      displayName: "Cyprian of Carthage",
      honorific: "St.",
      eraLabel: "3rd century",
      summary:
        "Bishop of Carthage and martyr, author of On the Unity of the Church.",
      traditions: ["Roman Catholic"],
      rank: 75,
    },
  ],
  [
    ["epiphanius"],
    {
      personId: "epiphanius-salamis",
      displayName: "Epiphanius of Salamis",
      honorific: "St.",
      eraLabel: "4th century",
      summary:
        "Bishop of Salamis and heresiologist, author of the Panarion.",
      traditions: ["Eastern Orthodox", "Roman Catholic"],
      rank: 70,
    },
  ],
  [
    ["didymus"],
    {
      personId: "didymus-blind",
      displayName: "Didymus the Blind",
      honorific: "",
      eraLabel: "4th century",
      summary:
        "Head of the Catechetical School of Alexandria, prolific biblical commentator.",
      traditions: ["Eastern Christianity"],
      rank: 65,
    },
  ],
  [
    ["haymo"],
    {
      personId: "haymo-auxerre",
      displayName: "Haymo of Auxerre",
      honorific: "",
      eraLabel: "9th century",
      summary: "Carolingian monk and biblical commentator.",
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
      summary:
        "Archbishop of Ravenna and Doctor of the Church, known for his brief homilies.",
      traditions: ["Roman Catholic"],
      rank: 70,
    },
  ],
  [
    ["dion", "dionysius", "dionysius-of-alexandria"],
    {
      personId: "dionysius-alexandria",
      displayName: "Dionysius of Alexandria",
      honorific: "St.",
      eraLabel: "3rd century",
      summary:
        "Bishop of Alexandria and student of Origen, prolific theologian and pastor.",
      traditions: ["Eastern Orthodox"],
      rank: 68,
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

function resolveAuthorAllCaps(rawName: string): AuthorInfo | null {
  const key = normalizeKey(rawName.trim());

  if (AUTHOR_LOOKUP.has(key)) return AUTHOR_LOOKUP.get(key)!;

  // Prefix or substring match
  for (const [mapKey, info] of AUTHOR_LOOKUP) {
    if (key === mapKey) return info;
    if (key.startsWith(mapKey) || (mapKey.length >= 4 && key.startsWith(mapKey))) {
      return info;
    }
    if (mapKey.startsWith(key) && key.length >= 4) return info;
  }

  return null;
}

// ── Text utilities ────────────────────────────────────────────────────────────

function truncateToWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > max * 0.8 ? `${cut.slice(0, lastSpace)}…` : `${cut}…`;
}

const MAX_EXCERPT = 600;

// ── Format-independent types and shared helpers ───────────────────────────────

type ParsedComment = {
  authorInfo: AuthorInfo;
  text: string;
};

type ParsedSection = {
  chapterNum: number;
  verseStart: number;
  comments: ParsedComment[];
};

function stripECatholicHeaders(raw: string): string {
  let text = raw;
  // Strip lines starting with # (Mark ch01 format)
  text = text.replace(/^#[^\n]*\n/gm, "");
  // Strip provenance lines before first --- separator (Luke/John and most Mark)
  const sepIdx = text.indexOf("\n---\n");
  if (sepIdx !== -1) text = text.slice(sepIdx + 5);
  // Strip CHAP. N prefix. Chapter N appears twice: once as "CHAP. N" and once as the
  // start of the verse ref, e.g. "CHAP. 11:1" = "CHAP. 1" + "1:1". Use backreference
  // (\1) so we strip exactly the chapter-number portion, leaving the verse ref intact.
  text = text.replace(/^CHAP\.\s*(\d{1,2})(?=\1:)/m, "");
  return text.trim();
}

function cleanCommentaryText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[.,;:\s]+/, "") // leading punctuation left by author-marker split
    .replace(/^\([^)]{0,120}\)\s*/, "") // leading "(citation) "
    .replace(/^[.,;:\s]+/, "") // any residual punctuation after citation
    .trim();
}

function makeVerseRefRe(chapterNum: number): RegExp {
  // Matches "N:M" not preceded by "(" (inline citation) or a digit (continuation of a number)
  return new RegExp(`(?<![\\(\\d])${chapterNum}:(\\d+)`, "g");
}

function findFirstVerseRef(segment: string, re: RegExp): number | null {
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  let found: number | null = null;
  while ((match = re.exec(segment)) !== null) {
    const before = segment.slice(Math.max(0, match.index - 1), match.index);
    if (before !== "(") found = Number.parseInt(match[1], 10);
  }
  return found;
}

function splitAtFirstVerseRef(
  segment: string,
  re: RegExp,
): { before: string; verseNum: number | null } {
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(segment)) !== null) {
    const before = segment.slice(Math.max(0, match.index - 1), match.index);
    if (before !== "(") {
      return { before: segment.slice(0, match.index), verseNum: Number.parseInt(match[1], 10) };
    }
  }
  return { before: segment, verseNum: null };
}

function makeComment(authorName: string, rawText: string): ParsedComment | null {
  const author = resolveAuthorAllCaps(authorName.trim());
  if (!author) return null;
  const cleaned = cleanCommentaryText(rawText);
  if (cleaned.length < 40) return null;
  return { authorInfo: author, text: truncateToWordBoundary(cleaned, MAX_EXCERPT) };
}

// ── Inline format parser (bold **AUTHOR** or bare AUTHOR. markers on one long line) ──

function parseInlineFormat(text: string, chapterNum: number): ParsedSection[] {
  const hasBoldMarkers = text.includes("**");
  const parts = hasBoldMarkers
    ? text.split(/\*\*([A-Z][A-Z .'-]*[A-Z])\*\*/)
    : text.split(/([A-Z][A-Z\s\-\.]*[A-Z])\. /);

  const verseRefRe = makeVerseRefRe(chapterNum);
  const sections: ParsedSection[] = [];
  let currentVerse: number | null = findFirstVerseRef(parts[0], verseRefRe);
  let pendingComments: ParsedComment[] = [];

  function flushSection() {
    if (pendingComments.length > 0 && currentVerse !== null) {
      sections.push({ chapterNum, verseStart: currentVerse, comments: pendingComments });
    }
    pendingComments = [];
  }

  for (let i = 1; i < parts.length; i += 2) {
    const authorName = parts[i];
    const rawCommentary = parts[i + 1] ?? "";
    const { before: commentBefore, verseNum: nextVerse } = splitAtFirstVerseRef(
      rawCommentary,
      verseRefRe,
    );
    if (currentVerse !== null) {
      const comment = makeComment(authorName, commentBefore);
      if (comment) pendingComments.push(comment);
    }
    if (nextVerse !== null) {
      flushSection();
      currentVerse = nextVerse;
    }
  }

  flushSection();
  return sections;
}

// ── Block format parser (commentary as separate blank-line-delimited paragraphs) ──

function parseBlockFormat(text: string, chapterNum: number): ParsedSection[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const sections: ParsedSection[] = [];
  let currentVerse: number | null = null;
  let pendingComments: ParsedComment[] = [];

  function flushSection() {
    if (pendingComments.length > 0 && currentVerse !== null) {
      sections.push({ chapterNum, verseStart: currentVerse, comments: pendingComments });
    }
    pendingComments = [];
  }

  for (const para of paragraphs) {
    const firstLine = para.split("\n")[0].trim();

    // Verse section header line: "N:M" or "N:M–P" where N must equal chapterNum
    const verseLine = firstLine.match(/^(\d+):(\d+)/);
    if (verseLine && Number.parseInt(verseLine[1], 10) === chapterNum) {
      flushSection();
      currentVerse = Number.parseInt(verseLine[2], 10);
      continue;
    }

    if (currentVerse === null) continue;

    // Commentary paragraph: starts with ALL_CAPS author name (≥4 chars) followed by ". "
    const authorLine = para.match(/^([A-Z][A-Z\s\-\.]{2,}[A-Z])\. ([\s\S]*)/);
    if (authorLine) {
      const comment = makeComment(authorLine[1], authorLine[2]);
      if (comment) pendingComments.push(comment);
    }
    // Numbered verse-text lines ("1. And again…") are skipped implicitly
  }

  flushSection();
  return sections;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function parseECatholicChapter(filePath: string, chapterNum: number): ParsedSection[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf8");
  const text = stripECatholicHeaders(raw);
  // Block format: commentary entries start on their own lines (no ** markers)
  const isBlock = !text.includes("**") && /^[A-Z]{3,}(?:[\s-][A-Z]+)*\. /m.test(text);
  return isBlock ? parseBlockFormat(text, chapterNum) : parseInlineFormat(text, chapterNum);
}

// ── Bundle builder ────────────────────────────────────────────────────────────

const AQUINAS_ID = "thomas-aquinas";

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
    featuredWorkIds: [],
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

function buildWork(spec: GospelSpec): Work {
  return {
    id: spec.workId,
    slug: spec.workSlug,
    personId: AQUINAS_ID,
    title: spec.workTitle,
    shortTitle: spec.workShortTitle,
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: spec.eraLabel,
    summary: `A verse-by-verse chain commentary on the Gospel of ${spec.bookSlug.charAt(0).toUpperCase() + spec.bookSlug.slice(1)} compiled by Thomas Aquinas, drawing on Greek and Latin Church Fathers.`,
    topicSlugs: [],
    sourceId: spec.sourceId,
    verseRefs: [],
  };
}

function buildSource(spec: GospelSpec): SourceRecord {
  return {
    id: spec.sourceId,
    label: spec.sourceLabel,
    collection: "eCatholic2000",
    sourceType: "web-collection",
    url: spec.sourceUrl,
    note: "Public domain translation by John Henry Parker, 1842. Compiled by Thomas Aquinas, c. 1264–65.",
    isSeeded: false,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export type GospelParseConfig = {
  gospel: "mark" | "luke" | "john";
  rawDir: string;
  verseTranslationPrefix: string;
};

export function parseCatenaGospel(config: GospelParseConfig): CommentaryBundleV2 {
  const spec = GOSPEL_SPECS[config.gospel];
  const allSections: ParsedSection[] = [];

  for (let ch = 1; ch <= spec.chapterCount; ch++) {
    const fileName = `${config.gospel}_ch${String(ch).padStart(2, "0")}.txt`;
    const filePath = join(config.rawDir, fileName);
    const sections = parseECatholicChapter(filePath, ch);
    allSections.push(...sections);
  }

  const entries: CommentaryEntry[] = [];
  const seenPersonIds = new Set<string>();
  let counter = 0;

  for (const section of allSections) {
    const { chapterNum, verseStart, comments } = section;
    const targetVerseId = `${config.verseTranslationPrefix}:${spec.bookSlug}.${chapterNum}.${verseStart}`;

    for (const comment of comments) {
      const { authorInfo, text } = comment;
      counter += 1;
      entries.push({
        id: `${spec.entryPrefix}-${counter.toString().padStart(4, "0")}`,
        relation: "verse",
        targetVerseId,
        topicSlugs: [],
        personId: authorInfo.personId,
        workId: spec.workId,
        title: `On ${spec.bookSlug.charAt(0).toUpperCase() + spec.bookSlug.slice(1)} ${chapterNum}:${verseStart}`,
        excerpt: text,
        takeaway: "",
        sourceId: spec.sourceId,
        rank: authorInfo.rank,
        tags: ["catena-aurea", "patristic", spec.bookSlug],
      });
      seenPersonIds.add(authorInfo.personId);
    }
  }

  // Build people: Aquinas + all cited Fathers
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
    works: [buildWork(spec)],
    sources: [buildSource(spec)],
    entries,
  };
}
