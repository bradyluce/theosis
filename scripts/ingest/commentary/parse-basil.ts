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

// Basil is already in src/lib/content/seed/library.ts as "basil-the-great".
// Reuse the seed person id; emitting a duplicate Person here would be ignored
// by the commentary-loader merge (seed wins on id collision).
const PERSON_ID = "basil-the-great";

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

// Editorial summaries grounded in NPNF Series II Vol. 8 introductions and the
// ranking from docs/basil-raw-content-integration-plan.md §11. Slugs are
// namespaced under "basil-…" to keep them distinct from the existing seed
// work "hexaemeron" (anthology-derived stub).
const WORKS: WorkDef[] = [
  {
    naId: "3201",
    slug: "basil-hexaemeron",
    title: "Nine Homilies of the Hexaemeron",
    shortTitle: "Hexaemeron",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 370",
    summary:
      "Nine Lenten homilies preached at Caesarea expounding Genesis 1:1–26 — the foundational patristic creation commentary, paired with his brother Gregory of Nyssa's On the Making of Man which takes up Genesis 1:26–27 where Basil's death left off.",
  },
  {
    naId: "3202",
    slug: "basil-letters",
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 357–378",
    summary:
      "Three hundred twenty-five letters spanning Basil's bishopric — pastoral correspondence, doctrinal arguments, and the canonical epistles to Amphilochius that became the basis of Orthodox canon law.",
  },
  {
    naId: "3203",
    slug: "basil-on-the-holy-spirit",
    title: "On the Holy Spirit (De Spiritu Sancto)",
    shortTitle: "On the Holy Spirit",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 375",
    summary:
      "Thirty chapters addressed to Amphilochius of Iconium on the doxological honor of the Holy Spirit — the foundational Orthodox pneumatology, defending the Spirit's full divinity from the doxology and from the Trinitarian baptismal formula.",
  },
];

const SHARED_TRANSLATOR = "Blomfield Jackson";
const NPNF_NOTE_PREFIX = `Translated by ${SHARED_TRANSLATOR}. From Nicene and Post-Nicene Fathers, Second Series, Vol. 8, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1895). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`;

// Hexaemeron homily → Genesis 1 verse range. Drawn from
// docs/basil-raw-content-integration-plan.md §10.1, where each homily's head
// verse is encoded in the opening <p><strong>...</strong></p> epigraph.
type GenesisRange = { verseStart: number; verseEnd: number };
const HEXAEMERON_VERSE_RANGES: Record<string, GenesisRange> = {
  "32011": { verseStart: 1, verseEnd: 1 },
  "32012": { verseStart: 2, verseEnd: 2 },
  "32013": { verseStart: 3, verseEnd: 5 },
  "32014": { verseStart: 6, verseEnd: 8 },
  "32015": { verseStart: 9, verseEnd: 13 },
  "32016": { verseStart: 14, verseEnd: 19 },
  "32017": { verseStart: 20, verseEnd: 23 },
  "32018": { verseStart: 20, verseEnd: 25 },
  "32019": { verseStart: 24, verseEnd: 26 },
};

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
    label: `${def.title} — NPNF Second Series, Vol. 8 (Schaff & Wace eds., 1895)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: NPNF_NOTE_PREFIX,
    isSeeded: false,
  };
}

function makeChapter(args: {
  def: WorkDef;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackLabel: string;
  fallbackTitle: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  // "Hexaemeron (Homily 1)" → "Homily 1". "Letter 38" → "Letter 38".
  // "De Spiritu Sancto" → "De Spiritu Sancto".
  const parenMatch = parsed.title.match(/\(([^)]+)\)/);
  const label = parenMatch ? parenMatch[1] : parsed.title || args.fallbackLabel;

  return {
    id: `${args.def.slug}-${args.fileId}`,
    workId: args.def.slug,
    order: args.order,
    label,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${args.def.slug}-source`,
  };
}

// Emit one CommentaryEntry per verse in the homily's Genesis range, so that
// every covered verse shows the Hexaemeron homily in its reader drawer. The
// commentary-loader dedupes by base id (strips -v## suffix) before showing
// entries on the work page, so each homily still appears once on that page.
function buildHexaemeronEntries(
  workSlug: string,
  homilyFileId: string,
  excerpt: string,
  verseTranslationPrefix: string,
): CommentaryEntry[] {
  const range = HEXAEMERON_VERSE_RANGES[homilyFileId];
  if (!range) return [];

  const homilyNum = Number(homilyFileId.slice(-1)); // e.g. "32016" → 6
  const baseId = `basil-hexaemeron-${String(homilyNum).padStart(2, "0")}`;
  const rangeLabel =
    range.verseStart === range.verseEnd
      ? `${range.verseStart}`
      : `${range.verseStart}–${range.verseEnd}`;
  const title = `On Genesis 1:${rangeLabel}`;

  const entries: CommentaryEntry[] = [];
  for (let v = range.verseStart; v <= range.verseEnd; v += 1) {
    entries.push({
      id: `${baseId}-v${v}`,
      relation: "verse",
      targetVerseId: `${verseTranslationPrefix}:genesis.1.${v}`,
      topicSlugs: ["creation"],
      personId: PERSON_ID,
      workId: workSlug,
      title,
      excerpt,
      takeaway: "",
      sourceId: `${workSlug}-source`,
      rank: 88,
      tags: ["basil", "patristic", "hexaemeron", "creation"],
    });
  }
  return entries;
}

type ParseConfig = {
  rawDir: string;
  verseTranslationPrefix: string;
};

export function parseBasil(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Basil provenance file missing: ${provPath}`);
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    let workChapters: WorkChapter[];
    if (prov.subpages.length === 0) {
      // 3203 De Spiritu Sancto — the NNNN.html file IS the body. Its 30
      // <h2>Chapter N</h2> headings become sections via parseNewAdventPage.
      workChapters = [
        makeChapter({
          def,
          rawDir: config.rawDir,
          fileId: def.naId,
          order: 1,
          fallbackLabel: def.shortTitle,
          fallbackTitle: def.title,
        }),
      ];
    } else {
      // 3201 Hexaemeron (9 homilies) or 3202 Letters (325 sub-pages).
      workChapters = prov.subpages.map((subpageId, idx) =>
        makeChapter({
          def,
          rawDir: config.rawDir,
          fileId: subpageId,
          order: idx + 1,
          fallbackLabel: `${def.shortTitle} ${idx + 1}`,
          fallbackTitle: `${def.title} ${idx + 1}`,
        }),
      );
    }
    chapters.push(...workChapters);

    // Hexaemeron is verse-by-verse on Genesis 1. Emit head-verse-linked
    // commentary entries so the Bible reader surfaces each homily on every
    // Genesis 1 verse it covers (Homily 1 → Gen 1:1, Homily 3 → Gen 1:3-5,
    // etc.). This is the strongest single Bible-linking outcome of the
    // Basil acquisition.
    if (def.naId === "3201") {
      for (const ch of workChapters) {
        const fileId = ch.id.slice(`${def.slug}-`.length);
        const excerpt = buildExcerptFromSections(ch.sections);
        entries.push(
          ...buildHexaemeronEntries(
            def.slug,
            fileId,
            excerpt,
            config.verseTranslationPrefix,
          ),
        );
      }
    }
  }

  return {
    version: "2",
    people: [],
    works,
    sources,
    entries,
    chapters,
  };
}
