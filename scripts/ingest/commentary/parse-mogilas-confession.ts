import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterParagraph,
  WorkChapterSection,
} from "@theosis/core";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "peter-mogila";
const WORK_ID = "mogila-orthodox-confession";
const WORK_SLUG = "mogila-orthodox-confession";
const SOURCE_ID = "mogila-orthodox-confession-source";

// Top-level structural markers in the PDF extraction. The extracted.txt
// preserves the printed-page heading conventions; we split on the canonical
// PART headings and the FOOTNOTES delimiters.
const PART_MARKERS: Array<{ start: string; end: string; order: number; label: string; title: string }> = [
  {
    order: 1,
    label: "Part I",
    title: "On Faith (the Symbol of Faith and the Articles)",
    start: "PART ONE",
    end: "FOOTNOTES FOR PART I",
  },
  {
    order: 2,
    label: "Part II",
    title: "On Hope (the Lord's Prayer and the Beatitudes)",
    start: "PART TWO",
    end: "FOOTNOTES FOR PART II",
  },
  {
    order: 3,
    label: "Part III",
    title: "On Love (the Virtues, the Commandments, and the Vices)",
    start: "PART THREE",
    end: "FOOTNOTES FOR PART III",
  },
];

function cleanLineBreaks(text: string): string {
  return text
    .replace(/­/g, "") // soft hyphens
    .replace(/-\s*\n\s*/g, "") // word-broken hyphenation
    .replace(/\s+/g, " ")
    .trim();
}

// Slice extracted.txt between markers, page-form-feeds removed.
function slicePart(fullText: string, startMarker: string, endMarker: string): string {
  const startIdx = fullText.indexOf(startMarker);
  if (startIdx < 0) throw new Error(`marker not found: ${startMarker}`);
  const endIdx = fullText.indexOf(endMarker, startIdx);
  if (endIdx < 0) throw new Error(`end marker not found: ${endMarker} (after ${startMarker})`);
  // Skip past the start-marker line itself.
  const afterStart = fullText.indexOf("\n", startIdx);
  return fullText
    .slice(afterStart >= 0 ? afterStart + 1 : startIdx, endIdx)
    .replace(/\f/g, "") // page form-feeds
    .trim();
}

// Each Q. n. ... R. ... pair becomes one paragraph. Multi-paragraph responses
// are kept as a single paragraph (we don't have reliable internal paragraph
// breaks from the PDF, which uses geometric line breaks rather than HTML <p>).
type QAPair = { qNumber: number; text: string };

function parseQAPairs(partBody: string): QAPair[] {
  // Split on every "Q. NN." that begins a new pair. The split keeps the matched
  // marker via a capture group; we reassemble.
  const tokens = partBody.split(/(?=Q\.\s+\d+\.)/);
  const pairs: QAPair[] = [];
  for (const tok of tokens) {
    const head = tok.match(/^Q\.\s+(\d+)\.\s+/);
    if (!head) continue;
    const qNumber = Number(head[1]);
    const body = cleanLineBreaks(tok);
    pairs.push({ qNumber, text: body });
  }
  return pairs;
}

// Optional editorial/footnote tail per part. We capture it as one trailing
// section with heading "Footnotes & Editorial Notes" — the source mixes
// scriptural references, Greek/Latin manuscript notes, and editor's notes.
function parseFootnotesSection(fullText: string, partIndex: number): WorkChapterSection | undefined {
  const startMarker = PART_MARKERS[partIndex]!.end;
  const startIdx = fullText.indexOf(startMarker);
  if (startIdx < 0) return undefined;
  const nextPart = PART_MARKERS[partIndex + 1];
  const endIdx = nextPart ? fullText.indexOf(nextPart.start, startIdx) : fullText.length;
  const body = fullText
    .slice(startIdx, endIdx >= 0 ? endIdx : fullText.length)
    .replace(/\f/g, "")
    .trim();
  if (!body) return undefined;
  // Drop the literal heading line, then collapse the rest into one paragraph.
  const lines = body.split(/\r?\n/);
  const tail = lines.slice(1).join("\n");
  const cleaned = cleanLineBreaks(tail);
  if (!cleaned) return undefined;
  return {
    heading: "Footnotes & Editorial Notes",
    paragraphs: [{ text: cleaned }],
  };
}

function buildChapter(args: {
  fullText: string;
  partIndex: number;
}): WorkChapter {
  const marker = PART_MARKERS[args.partIndex]!;
  const body = slicePart(args.fullText, marker.start, marker.end);
  const pairs = parseQAPairs(body);
  if (pairs.length === 0) {
    throw new Error(`No Q&A pairs found in ${marker.label}`);
  }
  const paragraphs: WorkChapterParagraph[] = pairs.map((p) => ({
    number: p.qNumber,
    text: p.text,
  }));
  const sections: WorkChapterSection[] = [
    {
      heading: undefined,
      paragraphs,
    },
  ];
  const footnotes = parseFootnotesSection(args.fullText, args.partIndex);
  if (footnotes) sections.push(footnotes);
  return {
    id: `${WORK_ID}-part-${marker.order}`,
    workId: WORK_ID,
    order: marker.order,
    label: marker.label,
    title: marker.title,
    summary: undefined,
    sections,
    sourceId: SOURCE_ID,
  };
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: "peter-mogila",
    name: "Peter Mogila",
    honorific: "St.",
    kind: "father",
    eraLabel: "17th century",
    summary:
      "Metropolitan of Kiev and Galicia (1633–1647) whose Confession of Faith was approved by the Council of Jassy (1642) and ratified by all four Eastern Patriarchs as a normative reply to Protestant and Roman Catholic catechisms entering Ukrainian and Russian Orthodox lands.",
    traditions: ["Eastern Orthodox"],
    topicSlugs: ["catechesis", "byzantine-tradition", "trinitarian-theology"],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "December 31",
    iconId: "icon-peter-mogila",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "The Orthodox Confession of Faith",
    shortTitle: "Orthodox Confession",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "1638–1642",
    summary:
      "A three-part catechetical confession structured around the three theological virtues — Faith (the Symbol and articles), Hope (the Lord's Prayer and the Beatitudes), and Love (the virtues, commandments, and vices) — set in 252 question-and-answer pairs. Approved at the Council of Jassy in 1642 and confirmed by the Eastern Patriarchs as a normative Orthodox catechism for the Slavic lands during the Counter-Reformation.",
    topicSlugs: ["catechesis", "trinitarian-theology", "sacraments", "commandments", "virtues"],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Orthodox Confession of Faith — English translation of the Mogila Catechism (modern edition)",
    collection: "Theosis library acquisitions",
    sourceType: "pdf",
    url: "",
    note:
      "Translated from the Latin/Greek of the 1638/1642 confession. Edition transcribed from a PDF in the Theosis acquisitions corpus; the original 17th-century confession is public domain. See content/raw/library/mogilas-orthodox-confession/PROVENANCE.json for the editorial provenance record.",
    isSeeded: false,
  };
}

export type ParseMogilaConfig = {
  rawDir: string;
};

export function parseMogilaConfession(config: ParseMogilaConfig): CommentaryBundleV2 {
  const fullText = readFileSync(join(config.rawDir, "extracted.txt"), "utf8");
  const chapters: WorkChapter[] = PART_MARKERS.map((_marker, idx) =>
    buildChapter({ fullText, partIndex: idx }),
  );
  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
