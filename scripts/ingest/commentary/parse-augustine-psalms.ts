import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "@theosis/core";
import {
  buildExcerptFromSections,
  parseNewAdventPage,
} from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "augustine";
const WORK_ID = "augustine-psalms";
const WORK_SLUG = "augustine-psalms";
const SOURCE_ID = "augustine-psalms-source";
const BOOK_SLUG = "psalms";

type ParseConfig = {
  rawDir: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

// ── Title parsing ────────────────────────────────────────────────────────────

function parsePsalmNumber(title: string): number | null {
  const m = title.match(/Exposition\s+on\s+Psalm\s+(\d+)/i);
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

// ── Per-subpage parsing ──────────────────────────────────────────────────────

type ParsedPsalm = {
  lxxPsalm: number;
  chapter: WorkChapter;
  excerpt: string;
};

function parseSubpage(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  subpageId: string;
  order: number;
}): ParsedPsalm | null {
  const filePath = join(args.rawDir, `${args.subpageId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const lxxPsalm = parsePsalmNumber(parsed.title);
  if (lxxPsalm === null) {
    console.warn(`[psalms] Could not parse psalm number from "${parsed.title}"`);
    return null;
  }

  const chapter: WorkChapter = {
    id: `${args.workId}-${args.subpageId}`,
    workId: args.workId,
    order: args.order,
    label: `Psalm ${lxxPsalm}`,
    title: parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };

  const excerpt = buildExcerptFromSections(parsed.sections);

  return { lxxPsalm, chapter, excerpt };
}

// ── Bundle builders ──────────────────────────────────────────────────────────

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
    title: "Expositions on the Psalms",
    shortTitle: "Expositions on the Psalms",
    workType: "commentary",
    lengthLabel: "long",
    eraLabel: "c. 392–418",
    summary:
      "Augustine's verse-by-verse expositions of all 150 Psalms (the Enarrationes in Psalmos) — the longest patristic commentary in Latin Christianity, composed over more than two decades as sermons and dictated commentaries. Numbering follows the LXX/Vulgate Psalter; readers on MT-numbered translations see entries shifted to the matching MT psalm.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Expositions on the Psalms — NPNF First Series, Vol. 8 (Schaff ed., 1888)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1801.htm",
    note: "Translated by A. Cleveland Coxe. From Nicene and Post-Nicene Fathers, First Series, Vol. 8, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1888). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function parseAugustinePsalms(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1801.json");
  if (!existsSync(provPath)) {
    throw new Error(`Expositions on the Psalms provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];

  prov.subpages.forEach((subpageId, idx) => {
    const parsed = parseSubpage({
      workId: WORK_ID,
      sourceId: SOURCE_ID,
      rawDir: config.rawDir,
      subpageId,
      order: idx + 1,
    });
    if (!parsed) return;

    chapters.push(parsed.chapter);

    const lxxStr = String(parsed.lxxPsalm).padStart(3, "0");

    // One chapter-level entry per LXX psalm. The commentary loader applies
    // the LXX→MT shift on read for MT-numbered translation readers, so
    // kjva/rsv users still see Augustine's exposition on the matching MT
    // psalm (LXX 50 surfaces on MT 51 Miserere, LXX 9 surfaces on both MT 9
    // and MT 10, etc.).
    entries.push({
      id: `augustine-psalms-${lxxStr}`,
      relation: "chapter",
      targetChapterId: `${BOOK_SLUG}.${parsed.lxxPsalm}`,
      topicSlugs: [],
      personId: PERSON_ID,
      workId: WORK_ID,
      title: `Exposition on Psalm ${parsed.lxxPsalm}`,
      excerpt: parsed.excerpt,
      takeaway: "",
      sourceId: SOURCE_ID,
      rank: 80,
      tags: ["augustine", "patristic", "exposition", "psalms"],
      psalterScheme: "LXX",
    });
  });

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries,
    chapters,
  };
}
