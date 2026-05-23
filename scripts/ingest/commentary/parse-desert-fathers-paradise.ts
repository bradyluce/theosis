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

const PERSON_ID = "desert-fathers";
const WORK_SLUG = "desert-fathers-paradise";
const SOURCE_ID = `${WORK_SLUG}-source`;

const SOURCE_RECORD: SourceRecord = {
  id: SOURCE_ID,
  label:
    "The Paradise of the Holy Fathers — Wallis Budge (1907, Chatto & Windus)",
  collection: "archive.org (Wallis Budge 1907 DjVu OCR)",
  sourceType: "web-collection",
  url: "https://archive.org/details/theparadiseorgar01unkwuoft",
  note: "Translated from Syriac by Sir Ernest Alfred Wallis Budge, Keeper of the Assyrian & Egyptian Antiquities at the British Museum. The Paradise, or Garden of the Holy Fathers (London: Chatto & Windus, 1907), two volumes. The Syriac source is Anan-Isho of Beth Abhe's 7th-century compilation, itself drawn from earlier Greek and Coptic originals. Three-layer translation chain — passages may have drifted at each stage; modern scholars supplement with Benedicta Ward's Greek-tradition translation (1975, copyrighted, not used here). Translation public domain (pre-1930 US, copyright expired). Source text is the Internet Archive DjVu OCR of the original print volumes; OCR artifacts are visible throughout. Contains: Athanasius's Life of Antony (Syriac variant), Palladius's Lausiac History, the Rule of Pachomius, Jerome's hermit-Lives, and the Apophthegmata Patrum (Sayings of the Desert Fathers).",
  isSeeded: false,
};

// ── OCR cleanup ───────────────────────────────────────────────────────────

function isLikelyJunkLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return true;
  // Bare page numbers or short Roman numerals.
  if (/^[ivxlcdm0-9]{1,5}\.?$/i.test(t)) return true;
  // Single letters or short two-character fragments (running heads).
  if (t.length <= 4 && /^[a-z]{1,3}\.?$/i.test(t)) return true;
  // Repeated running-head fragments: "THE PARADISE", "PALLADIUS", "THE HOLY FATHERS", etc.
  if (
    /^(THE\s+PARADISE|THE\s+HOLY\s+FATHERS|THE\s+ANCHORITES|PALLADIUS|JEROME|SAYINGS|COUNSELS|HISTORY\s+OF\s+THE\s+FATHERS)\.?$/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function textBlockToParagraphs(block: string): WorkChapterParagraph[] {
  const lines = block.split(/\r?\n/);
  const paragraphs: WorkChapterParagraph[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (text.length > 0) paragraphs.push({ text });
    buffer = [];
  };
  for (const raw of lines) {
    if (isLikelyJunkLine(raw)) {
      flush();
      continue;
    }
    if (raw.trim().length === 0) {
      flush();
    } else {
      buffer.push(raw.trim());
    }
  }
  flush();
  return paragraphs;
}

// ── Volume parsing ────────────────────────────────────────────────────────

type SectionAnchor = {
  heading: string;
  bodyStart: number;
};

function findSectionAnchors(
  text: string,
  anchors: { heading: string; pattern: RegExp }[],
): SectionAnchor[] {
  const out: SectionAnchor[] = [];
  for (const a of anchors) {
    const m = text.match(a.pattern);
    if (m && m.index !== undefined) {
      // Skip past the matched header line into the body that follows.
      const headerEnd = m.index + m[0].length;
      let bodyStart = headerEnd;
      while (bodyStart < text.length && text[bodyStart] === "\n") bodyStart += 1;
      out.push({ heading: a.heading, bodyStart });
    }
  }
  // Stable sort by offset.
  return out.sort((a, b) => a.bodyStart - b.bodyStart);
}

function sliceSections(
  text: string,
  anchors: SectionAnchor[],
): WorkChapterSection[] {
  if (anchors.length === 0) {
    return [{ paragraphs: textBlockToParagraphs(text) }];
  }
  const sections: WorkChapterSection[] = [];
  for (let i = 0; i < anchors.length; i += 1) {
    const start = anchors[i].bodyStart;
    const end = i + 1 < anchors.length ? anchors[i + 1].bodyStart : text.length;
    const block = text.slice(start, end);
    sections.push({
      heading: anchors[i].heading,
      paragraphs: textBlockToParagraphs(block),
    });
  }
  return sections;
}

// Major-section anchors per the plan's §4 inventory. These are the most
// reliable uppercase headers in the OCR; finer-grained per-saying anchors
// are left to a Phase 3 refinement.
const VOLUME_1_ANCHORS: { heading: string; pattern: RegExp }[] = [
  // The "preface" running head is lowercase in OCR; the Life of Antony body
  // begins with "THE  ANCHORITES" header at line 40 of vol 1.
  {
    heading: "Life of St. Antony (Athanasius)",
    pattern: /^THE\s+ANCHORITES\s*$/m,
  },
  // Palladius's letter-preface to Lausus opens the Lausiac History.
  {
    heading: "The Lausiac History (Palladius of Helenopolis)",
    pattern: /^PALLADIUS\s+the\s+Bishop\s+to\s+LAUSUS/m,
  },
  // The Pachomian section opens with the "blessed man Pachomius built an
  // oratory" narrative at line ~20161 in the OCR.
  {
    heading: "The Rule and Histories of Pachomius",
    pattern: /^THE\s+blessed\s+man\s+Pachomius/m,
  },
];

const VOLUME_2_ANCHORS: { heading: string; pattern: RegExp }[] = [
  {
    heading: "The Sayings of the Desert Fathers (Apophthegmata Patrum)",
    pattern: /^THE\s+SAYINGS\s+OF\s+THE/m,
  },
  {
    heading: "Questions and Answers of the Ascetic Brethren",
    pattern: /^QUESTIONS\s+(?:&|AND)\s+ANSWERS\s+OF/m,
  },
];

// ── Build the bundle ──────────────────────────────────────────────────────

function buildWork(): Work {
  return {
    id: WORK_SLUG,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "The Paradise of the Holy Fathers",
    shortTitle: "Paradise of the Holy Fathers",
    workType: "life",
    lengthLabel: "long",
    eraLabel: "3rd–5th century (compiled 7th c.)",
    summary:
      "Wallis Budge's 1907 translation of Anan-Isho of Beth Abhe's seventh-century Syriac compilation — Athanasius's Life of Antony, Palladius's Lausiac History, the Rule of Pachomius, Jerome's hermit-Lives, and the Apophthegmata Patrum (Sayings of the Desert Fathers). The largest single corpus of monastic spirituality available in public-domain English; foundational reading for the Eastern Orthodox monastic and hesychast tradition.",
    topicSlugs: ["monasticism"],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseDesertFathersParadise(
  config: ParseConfig,
): CommentaryBundleV2 {
  const vol1 = readFileSync(
    join(config.rawDir, "paradise_holy_fathers_vol1_djvu.txt"),
    "utf8",
  );
  const vol2 = readFileSync(
    join(config.rawDir, "paradise_holy_fathers_vol2_djvu.txt"),
    "utf8",
  );

  // Volume 1 — drop Wallis Budge's 200-page editorial introduction by
  // anchoring on the first "THE ANCHORITES" header (start of the Life of
  // Antony body). Everything before that is preface and would be confusing
  // to surface as "Desert Father" text.
  const vol1Anchors = findSectionAnchors(vol1, VOLUME_1_ANCHORS);
  const vol1Body =
    vol1Anchors.length > 0
      ? vol1.slice(vol1Anchors[0].bodyStart)
      : vol1;
  const vol1Sections = sliceSections(vol1Body, vol1Anchors.map((a, i) => ({
    ...a,
    // Re-anchor offsets to vol1Body's frame.
    bodyStart: i === 0 ? 0 : a.bodyStart - vol1Anchors[0].bodyStart,
  })));

  const vol2Anchors = findSectionAnchors(vol2, VOLUME_2_ANCHORS);
  const vol2Body =
    vol2Anchors.length > 0
      ? vol2.slice(vol2Anchors[0].bodyStart)
      : vol2;
  const vol2Sections = sliceSections(vol2Body, vol2Anchors.map((a, i) => ({
    ...a,
    bodyStart: i === 0 ? 0 : a.bodyStart - vol2Anchors[0].bodyStart,
  })));

  const chapters: WorkChapter[] = [
    {
      id: `${WORK_SLUG}-vol-1`,
      workId: WORK_SLUG,
      order: 1,
      label: "Volume I",
      title: "The Paradise of the Holy Fathers, Volume I",
      sections: vol1Sections,
      sourceId: SOURCE_ID,
    },
    {
      id: `${WORK_SLUG}-vol-2`,
      workId: WORK_SLUG,
      order: 2,
      label: "Volume II",
      title: "The Paradise of the Holy Fathers, Volume II",
      sections: vol2Sections,
      sourceId: SOURCE_ID,
    },
  ];

  return {
    version: "2",
    people: [],
    works: [buildWork()],
    sources: [SOURCE_RECORD],
    entries: [],
    chapters,
  };
}
