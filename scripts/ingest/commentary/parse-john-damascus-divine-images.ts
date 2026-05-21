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
  WorkType,
} from "../../../src/domain/content/types";
import { decodeEntities } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

// John of Damascus already in src/lib/content/seed/library.ts.
const PERSON_ID = "john-of-damascus";

// All 6 works share the same source attribution.
const SOURCE_ID = "john-damascus-allies-1898-source";
const SOURCE_RECORD: SourceRecord = {
  id: SOURCE_ID,
  label:
    "St. John Damascene on Holy Images, followed by Three Sermons on the Assumption — Allies (1898, Thomas Baker, London)",
  collection: "Project Gutenberg eBook #49917",
  sourceType: "web-collection",
  url: "https://www.gutenberg.org/cache/epub/49917/pg49917-images.html",
  note: "Translated by Mary H. Allies. From St. John Damascene on Holy Images, followed by Three Sermons on the Assumption (London: Thomas Baker, 1898). Source: Migne PG 94:1232–1420 (Apologiai) and PG 96:699–762 (Sermons). Translation public domain (pre-1930 US, copyright expired). HTML transcription by Project Gutenberg volunteers, freely redistributable under PG license.",
  isSeeded: false,
};

// ── Cleaning helpers ───────────────────────────────────────────────────────

function cleanParagraphHtml(raw: string): { text: string; html: string } {
  let body = raw;

  // Strip Project Gutenberg page-number anchors.
  body = body.replace(
    /<span\s+class="pageno[^"]*"[^>]*><\/span>/gi,
    "",
  );
  // Strip footnote-reference anchors and their inner sup numbers.
  body = body.replace(
    /<a\s+class="footnote-reference[^"]*"[^>]*>\s*<sup>[^<]*<\/sup>\s*<\/a>/gi,
    "",
  );
  // Strip standalone <sup>N</sup> footnote callouts.
  body = body.replace(/<sup>[^<]*<\/sup>/gi, "");
  // Strip anchor wrappers that have no useful inner content (e.g., id-only).
  body = body.replace(/<a\s+id="[^"]*"\s*><\/a>/gi, "");
  // Normalize italics variants to <em>.
  body = body.replace(/<i>/gi, "<em>").replace(/<\/i>/gi, "</em>");
  body = body.replace(/<em\s+class="italics"\s*>/gi, "<em>");
  // Collapse whitespace.
  body = body.replace(/\s+/g, " ").trim();

  const text = decodeEntities(body.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  return { text, html: body };
}

function extractHeadingText(rawHtml: string): string {
  // Pull the visible spans out of an h2/h3 — drop pageno anchors, footnote
  // references, and br markers.
  let s = rawHtml;
  s = s.replace(/<span\s+class="pageno[^"]*"[^>]*><\/span>/gi, "");
  s = s.replace(
    /<a\s+class="footnote-reference[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    "",
  );
  s = s.replace(/<br\s*\/?>/gi, " ");
  s = decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return s;
}

// ── Section detection ─────────────────────────────────────────────────────

type SectionBoundary = {
  start: number;
  end: number;
  heading: string;
};

function findH2Boundaries(html: string): SectionBoundary[] {
  const regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches: { offset: number; heading: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    matches.push({
      offset: m.index,
      heading: extractHeadingText(m[1]),
    });
  }
  // Convert to start/end ranges between consecutive h2s.
  const boundaries: SectionBoundary[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].offset;
    const end = i + 1 < matches.length ? matches[i + 1].offset : html.length;
    boundaries.push({ start, end, heading: matches[i].heading });
  }
  return boundaries;
}

// ── Body parsing ───────────────────────────────────────────────────────────

function parseSection(html: string): WorkChapterSection[] {
  // Walk the HTML extracting <h3>...</h3> as section headings and <p>...</p>
  // as paragraphs. h3 markers within Part III divide it into points; Parts
  // I, II and the Sermons typically have no h3s, so the result is one big
  // section with all paragraphs.
  const sections: WorkChapterSection[] = [];
  let current: WorkChapterSection = { paragraphs: [] };
  const flush = () => {
    if (current.heading || current.paragraphs.length > 0) {
      sections.push(current);
    }
  };

  const tokenRegex = /<(h3|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    if (tag === "h3") {
      flush();
      current = { heading: extractHeadingText(m[2]), paragraphs: [] };
      continue;
    }
    // tag === "p"
    const cleaned = cleanParagraphHtml(m[2]);
    if (!cleaned.text) continue;
    const paragraph: WorkChapterParagraph = { text: cleaned.text };
    if (/<(em|q|strong|blockquote)\b/i.test(cleaned.html)) {
      paragraph.html = cleaned.html;
    }
    current.paragraphs.push(paragraph);
  }
  flush();
  return sections;
}

// ── Work definitions ──────────────────────────────────────────────────────

type WorkDef = {
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  // Substring used to identify the h2 section heading in the source HTML.
  headingMatch: RegExp;
};

const WORKS: WorkDef[] = [
  {
    slug: "john-damascus-divine-images-1",
    title: "First Apologia Against Those Who Decry Holy Images",
    shortTitle: "On the Divine Images I",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 726–730",
    summary:
      "John's first defense of the veneration of icons against the iconoclasm of Emperor Leo III — the longest of the three treatises, grounded in the Incarnation and the Old Testament precedents of God-commanded religious imagery. Closes with a florilegium of patristic witnesses to image-veneration.",
    headingMatch: /^PART I\b/i,
  },
  {
    slug: "john-damascus-divine-images-2",
    title: "Second Apologia Against Those Who Decry Holy Images",
    shortTitle: "On the Divine Images II",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 730",
    summary:
      "The second treatise — a tighter response to specific iconoclast arguments, with a second patristic florilegium. Written after the first round of imperial measures against icons.",
    headingMatch: /^PART II\b/i,
  },
  {
    slug: "john-damascus-divine-images-3",
    title: "Third Apologia Against Those Who Decry Holy Images",
    shortTitle: "On the Divine Images III",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 730s",
    summary:
      "The most systematic of the three. John defines what an image is, distinguishes the kinds of images and the kinds of veneration (proskynesis vs latreia), and rounds out with the largest of the three florilegia. The intellectual backbone of the Sunday of Orthodoxy.",
    headingMatch: /^PART III\b/i,
  },
  {
    slug: "john-damascus-dormition-sermon-1",
    title: "First Sermon on the Dormition of the Theotokos",
    shortTitle: "On the Dormition I",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "8th century",
    summary:
      "John's first sermon on the Dormition (kοίμησις) of Mary — dogmatic-narrative in shape, telling the event of the Theotokos's repose.",
    headingMatch: /^SERMON I\b\.?\s+ON THE ASSUMPTION/i,
  },
  {
    slug: "john-damascus-dormition-sermon-2",
    title: "Second Sermon on the Dormition of the Theotokos",
    shortTitle: "On the Dormition II",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "8th century",
    summary:
      "The longest of the three Dormition sermons — sustained Mariological reflection on the meaning of the Theotokos's death and assumption.",
    headingMatch: /^SERMON II\b\.?\s+ON THE ASSUMPTION/i,
  },
  {
    slug: "john-damascus-dormition-sermon-3",
    title: "Third Sermon on the Dormition of the Theotokos",
    shortTitle: "On the Dormition III",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "8th century",
    summary:
      "Festal exhortation on the Dormition — a shorter, more pastoral homily for the August 15 feast.",
    headingMatch: /^SERMON III\b\.?\s+ON THE ASSUMPTION/i,
  },
];

function buildWork(def: WorkDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: PERSON_ID,
    title: def.title,
    shortTitle: def.shortTitle,
    workType: def.workType,
    lengthLabel: def.lengthLabel,
    eraLabel: def.eraLabel,
    summary: def.summary,
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

// ── Entry point ────────────────────────────────────────────────────────────

type ParseConfig = {
  rawDir: string;
};

export function parseJohnDamascusDivineImages(
  config: ParseConfig,
): CommentaryBundleV2 {
  const filePath = join(config.rawDir, "pg49917-images.html");
  const html = readFileSync(filePath, "utf8");
  const boundaries = findH2Boundaries(html);

  const works: Work[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const boundary = boundaries.find((b) => def.headingMatch.test(b.heading));
    if (!boundary) {
      throw new Error(
        `[john-damascus-divine-images] Could not locate section for ${def.slug} (looked for ${def.headingMatch}).`,
      );
    }
    const slice = html.slice(boundary.start, boundary.end);
    const sections = parseSection(slice);
    if (sections.length === 0) {
      throw new Error(
        `[john-damascus-divine-images] No content parsed for ${def.slug}.`,
      );
    }

    works.push(buildWork(def));
    chapters.push({
      id: `${def.slug}-1`,
      workId: def.slug,
      order: 1,
      label: def.shortTitle,
      title: def.title,
      sections,
      sourceId: SOURCE_ID,
    });
  }

  // All 6 works share the same source record — emit it once.
  return {
    version: "2",
    people: [],
    works,
    sources: [SOURCE_RECORD],
    entries: [],
    chapters,
  };
}
