import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import { decodeEntities, parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "augustine";
const WORK_ID = "augustine-letters";
const WORK_SLUG = "augustine-letters";
const SOURCE_ID = "augustine-letters-source";

type ParseConfig = {
  rawDir: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
};

type LetterMeta = {
  letterNum: number;
  year?: string;       // raw year string from TOC, e.g. "386" or "c. 410"
  description: string; // raw TOC description, e.g. "From Augustine to Hermogenianus"
};

// Parse the 1102 index TOC to harvest per-letter recipient + date metadata.
// Each TOC entry looks like:
//   <a href="../fathers/1102001.htm"><strong>Letter 1</strong></a> (386) From Augustine to Hermogenianus
// followed by <br> or paragraph break. Entries can also be wrapped in <p>...</p>
// blocks grouped by date range — we don't care about the grouping, just the
// per-letter metadata.
function parseTocMetadata(html: string): Map<string, LetterMeta> {
  const tocByNum = new Map<string, LetterMeta>();

  // Match links to letter sub-pages with the surrounding text. The TOC uses
  // <br>-separated entries inside <p> blocks, so each "line" extends until
  // the next <br>, <a>, <p>, or block tag.
  const linkRe =
    /<a\s+href="\.\.\/fathers\/(1102\d+)\.htm"[^>]*>\s*<strong>\s*Letter\s+(\d+)\s*<\/strong>\s*<\/a>([^<]*)/gi;

  for (const match of html.matchAll(linkRe)) {
    const subpageId = match[1];
    const letterNum = Number.parseInt(match[2], 10);
    const tail = decodeEntities(match[3]).trim();

    // Parse "(386) From Augustine to Hermogenianus" or
    // "(c. 410) From Augustine to ..."
    let year: string | undefined;
    let description = tail;
    const yearMatch = tail.match(/^\(([^)]+)\)\s*(.*)$/);
    if (yearMatch) {
      year = yearMatch[1].trim();
      description = yearMatch[2].trim();
    }

    tocByNum.set(subpageId, { letterNum, year, description });
  }

  return tocByNum;
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: "augustine",
    name: "Augustine of Hippo",
    honorific: "St.",
    kind: "father",
    eraLabel: "4th–5th century",
    summary:
      "Bishop of Hippo and Doctor of the Church, author of Confessions and City of God.",
    traditions: ["Eastern Orthodox", "Roman Catholic", "Western Christianity"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "June 15",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 386–429",
    summary:
      "The surviving correspondence of Augustine of Hippo — biographical, doctrinal, pastoral, and polemical. Includes early philosophical exchanges with Nebridius, controversies with Jerome over the Septuagint and Galatians, anti-Donatist and anti-Pelagian dispatches, and pastoral letters to bishops, monks, widows, and emperors. Letters here follow the NPNF selection ordered by canonical number.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label: "Letters — NPNF First Series, Vol. 1 (Schaff ed., 1887)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1102.htm",
    note: "Translated by J.G. Cunningham. From Nicene and Post-Nicene Fathers, First Series, Vol. 1, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1887). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseAugustineLetters(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1102.json");
  if (!existsSync(provPath)) {
    throw new Error(`Letters provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const indexPath = join(config.rawDir, "1102.html");
  const indexHtml = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
  const tocByNum = parseTocMetadata(indexHtml);

  const chapters: WorkChapter[] = [];

  prov.subpages.forEach((subpageId, idx) => {
    const filePath = join(config.rawDir, `${subpageId}.html`);
    if (!existsSync(filePath)) {
      console.warn(`[letters] Missing sub-page file: ${filePath}`);
      return;
    }
    const html = readFileSync(filePath, "utf8");
    const parsed = parseNewAdventPage(html, filePath);
    const meta = tocByNum.get(subpageId);

    // Letter number — prefer TOC source, fall back to h1 parsing.
    let letterNum = meta?.letterNum;
    if (letterNum === undefined) {
      const m = parsed.title.match(/Letter\s+(\d+)/i);
      if (m) letterNum = Number.parseInt(m[1], 10);
    }
    if (letterNum === undefined) {
      console.warn(
        `[letters] Could not determine letter number for ${subpageId} ("${parsed.title}")`,
      );
      return;
    }

    const label = `Letter ${letterNum}`;
    const yearPart = meta?.year ? ` (A.D. ${meta.year})` : "";
    const descriptionPart = meta?.description ? `: ${meta.description}` : "";
    const title = `Letter ${letterNum}${descriptionPart}${yearPart}`.trim();

    chapters.push({
      id: `${WORK_ID}-${subpageId}`,
      workId: WORK_ID,
      order: idx + 1,
      label,
      title,
      summary: parsed.summary,
      sections: parsed.sections,
      sourceId: SOURCE_ID,
    });
  });

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
