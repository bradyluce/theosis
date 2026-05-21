import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkType,
} from "../../../src/domain/content/types";
import { parseNewAdventPage } from "./new-advent-html";

export type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "augustine";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

export type AugustineTreatiseConfig = {
  // Four-digit New Advent work id (e.g. "1302" for the Enchiridion).
  naId: string;
  slug: string;        // "augustine-enchiridion"
  title: string;       // Display title for the library card.
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;    // "c. 421"
  summary: string;     // 1-3 sentence editorial summary.
  // NPNF series + volume metadata for the source record.
  npnfSeries: "First" | "Second";
  npnfVolume: number;
  npnfYear: number;
  translator: string;
};

function buildPerson(workIds: string[]): Person {
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
    featuredWorkIds: workIds,
    feastDayLabel: "June 15",
  };
}

function buildWork(cfg: AugustineTreatiseConfig): Work {
  return {
    id: cfg.slug,
    slug: cfg.slug,
    personId: PERSON_ID,
    title: cfg.title,
    shortTitle: cfg.shortTitle,
    workType: cfg.workType,
    lengthLabel: cfg.lengthLabel,
    eraLabel: cfg.eraLabel,
    summary: cfg.summary,
    topicSlugs: [],
    sourceId: `${cfg.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(cfg: AugustineTreatiseConfig): SourceRecord {
  return {
    id: `${cfg.slug}-source`,
    label: `${cfg.title} — NPNF ${cfg.npnfSeries} Series, Vol. ${cfg.npnfVolume} (Schaff ed., ${cfg.npnfYear})`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${cfg.naId}.htm`,
    note: `Translated by ${cfg.translator}. From Nicene and Post-Nicene Fathers, ${cfg.npnfSeries} Series, Vol. ${cfg.npnfVolume}, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., ${cfg.npnfYear}). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

function buildChapter(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackTitle: string;
  fallbackLabel: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  // Subpages like "On the Trinity (Book I)" → label "Book I".
  // Self-contained pages like "The Handbook on Faith, Hope and Love" → label
  // falls back to the work's short title (no parenthetical to extract).
  const parenMatch = parsed.title.match(/\(([^)]+)\)/);
  const label = parenMatch ? parenMatch[1] : args.fallbackLabel;

  return {
    id: `${args.workId}-${args.fileId}`,
    workId: args.workId,
    order: args.order,
    label,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

// Build a CommentaryBundleV2 for a single Augustine library-reading treatise.
// Handles both self-contained works (provenance.subpages.length === 0 → parse
// the NNNN.html itself) and multi-subpage works (parse each subpage as a
// WorkChapter). No verse-keyed entries are emitted; these are library texts
// rather than commentary.
export function buildAugustineTreatiseBundle(args: {
  rawDir: string;
  config: AugustineTreatiseConfig;
}): CommentaryBundleV2 {
  const { rawDir, config } = args;
  const provPath = join(rawDir, `provenance_${config.naId}.json`);
  if (!existsSync(provPath)) {
    throw new Error(
      `[${config.slug}] Provenance file not found: ${provPath}`,
    );
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];

  if (prov.subpages.length === 0) {
    // Self-contained: the NNNN.html file is the whole work. Internal <h2>
    // headings become sections on the single WorkChapter.
    chapters.push(
      buildChapter({
        workId: config.slug,
        sourceId: `${config.slug}-source`,
        rawDir,
        fileId: config.naId,
        order: 1,
        fallbackLabel: config.shortTitle,
        fallbackTitle: config.title,
      }),
    );
  } else {
    prov.subpages.forEach((subpageId, idx) => {
      chapters.push(
        buildChapter({
          workId: config.slug,
          sourceId: `${config.slug}-source`,
          rawDir,
          fileId: subpageId,
          order: idx + 1,
          fallbackLabel: `${config.shortTitle} ${idx + 1}`,
          fallbackTitle: `${config.title} ${idx + 1}`,
        }),
      );
    });
  }

  return {
    version: "2",
    people: [buildPerson([config.slug])],
    works: [buildWork(config)],
    sources: [buildSource(config)],
    entries: [],
    chapters,
  };
}
