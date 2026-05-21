import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterSection,
  WorkType,
} from "@theosis/core";
import { parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

// Ephraim is already in seed/library.ts as "ephraim-the-syrian".
const PERSON_ID = "ephraim-the-syrian";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

type WorkDef = {
  naId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
};

const WORKS: WorkDef[] = [
  {
    naId: "3702",
    slug: "ephraim-nisibene-hymns",
    title: "The Nisibene Hymns",
    shortTitle: "Nisibene Hymns",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 350",
    summary:
      "Hymns composed during the Persian sieges of Nisibis under Shapur II — Ephraim's poetic theology of providence, the city's deliverance, and the church under threat.",
  },
  {
    naId: "3703",
    slug: "ephraim-hymns-on-the-nativity",
    title: "Hymns on the Nativity of Christ in the Flesh",
    shortTitle: "Hymns on the Nativity",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "4th century",
    summary:
      "Christmas hymns saturated with biblical typology — Ephraim weaves Old Testament figures (Adam, Moses, the prophets) into the celebration of the Word made flesh.",
  },
  {
    naId: "3704",
    slug: "ephraim-hymns-on-the-epiphany",
    title: "Hymns for the Feast of the Epiphany",
    shortTitle: "Hymns on the Epiphany",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "4th century",
    summary:
      "Hymns for the Feast of the Theophany — the baptism of Christ in the Jordan, the descent of the Spirit, and the meaning of Christian baptism.",
  },
  {
    naId: "3705",
    slug: "ephraim-the-pearl",
    title: "The Pearl: Seven Hymns on the Faith",
    shortTitle: "The Pearl",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "4th century",
    summary:
      "Seven hymns meditating on the pearl as the figure of Christ — among Ephraim's most beloved theological poems, drawing the Christological mystery out of the natural image of the pearl forming in the deep.",
  },
  {
    naId: "3706",
    slug: "ephraim-on-our-lord",
    title: "On Our Lord",
    shortTitle: "On Our Lord",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "4th century",
    summary:
      "Christological prose-poetry — Ephraim's sustained reflection on the person of Christ, his work, and the typology by which the Old Testament prefigures him.",
  },
  {
    naId: "3707",
    slug: "ephraim-on-admonition-and-repentance",
    title: "Hymns on Admonition and Repentance",
    shortTitle: "On Admonition and Repentance",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "4th century",
    summary:
      "Penitential hymns — pastoral exhortations to repentance and amendment of life, central to the Syriac ascetic tradition that shaped later Orthodox spirituality.",
  },
  {
    naId: "3708",
    slug: "ephraim-on-the-sinful-woman",
    title: "Homily on the Sinful Woman",
    shortTitle: "On the Sinful Woman",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "4th century",
    summary:
      "A poetic homily on Luke 7:36–50 — the woman who anointed Jesus's feet, read as the archetype of repentance and the love that flows from forgiveness.",
  },
];

const ANF_NOTE =
  "Translated by J.B. Morris. From Nicene and Post-Nicene Fathers, Second Series, Vol. 13, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1898). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.";

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
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: WorkDef): SourceRecord {
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — NPNF Second Series, Vol. 13 (Schaff & Wace eds., 1898)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: ANF_NOTE,
    isSeeded: false,
  };
}

// For the Nisibene Hymns subpages (3702a-3702f), each file packages several
// numbered <h2>Hymn N.</h2> hymns. Build a "Hymns N-M" label from the first
// and last hymn-number headings in the parsed sections.
function nisibeneRangeLabel(
  sections: WorkChapterSection[],
  subpageId: string,
): string {
  const hymnNumbers: number[] = [];
  for (const section of sections) {
    const match = (section.heading ?? "").match(/^Hymn\s+(\d+)/i);
    if (match) hymnNumbers.push(Number(match[1]));
  }
  if (hymnNumbers.length === 0) {
    // Fall back to "Part A" / "Part B" / ... based on the alphabetic suffix.
    const suffix = subpageId.slice("3702".length).toUpperCase();
    return suffix ? `Part ${suffix}` : "Part";
  }
  const lo = Math.min(...hymnNumbers);
  const hi = Math.max(...hymnNumbers);
  return lo === hi ? `Hymn ${lo}` : `Hymns ${lo}–${hi}`;
}

function makeChapter(args: {
  def: WorkDef;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackLabel: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  let label: string;
  if (args.def.naId === "3702") {
    label = nisibeneRangeLabel(parsed.sections, args.fileId);
  } else {
    label = args.def.shortTitle;
  }
  return {
    id: `${args.def.slug}-${args.fileId}`,
    workId: args.def.slug,
    order: args.order,
    label,
    title: parsed.title || args.def.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${args.def.slug}-source`,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseEphraimSyrian(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Ephraim provenance file missing: ${provPath}`);
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    const subpages = prov.subpages.length > 0 ? prov.subpages : [def.naId];
    subpages.forEach((fileId, idx) => {
      chapters.push(
        makeChapter({
          def,
          rawDir: config.rawDir,
          fileId,
          order: idx + 1,
          fallbackLabel: def.shortTitle,
        }),
      );
    });
  }

  return {
    version: "2",
    people: [],
    works,
    sources,
    entries: [],
    chapters,
  };
}
