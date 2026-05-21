import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "../../../src/domain/content/types";
import {
  buildExcerptFromSections,
  parseNewAdventPage,
} from "./new-advent-html";
import { resolveBookSlug } from "./shared";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "augustine";
const WORK_ID = "augustine-sermons-nt";
const WORK_SLUG = "augustine-sermons-nt";
const SOURCE_ID = "augustine-sermons-nt-source";

type ParseConfig = {
  rawDir: string;
  verseTranslationPrefix: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
};

// Each sermon's third or fourth <p> after <h1> carries the topic and a Bible
// link of the form ../bible/{book}{chapter:03}.htm#verse{verse} that
// identifies the pericope being expounded. Extract every such link from the
// region preceding the first numbered paragraph (`<p>1.`).
type BibleAnchor = {
  bookCode: string;     // new-advent 3-letter code (e.g. "mat", "luk", "1co")
  chapter: number;
  verse?: number;
};

function extractPericopeAnchors(html: string): BibleAnchor[] {
  // Slice the region from <h1> through to the first numbered paragraph (or
  // through a fallback length so we don't scan the whole sermon).
  const h1End = html.indexOf("</h1>");
  if (h1End === -1) return [];
  const numberedParaIdx = html.indexOf("<p>1.", h1End);
  const sliceEnd =
    numberedParaIdx === -1
      ? Math.min(html.length, h1End + 4000)
      : numberedParaIdx;
  const region = html.slice(h1End, sliceEnd);

  const anchors: BibleAnchor[] = [];
  const re = /href="\.\.\/bible\/([a-z0-9]{3})(\d{3})\.htm(?:#verse(\d+))?"/gi;
  for (const match of region.matchAll(re)) {
    const bookCode = match[1].toLowerCase();
    const chapter = Number.parseInt(match[2], 10);
    const verse = match[3] ? Number.parseInt(match[3], 10) : undefined;
    if (Number.isFinite(chapter)) {
      anchors.push({ bookCode, chapter, verse });
    }
  }
  return anchors;
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
    title: "Sermons on Selected Lessons of the New Testament",
    shortTitle: "Sermons on the NT",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 393–430",
    summary:
      "Ninety-seven sermons preached by Augustine on Gospel and Epistle lessons. Each sermon opens with a specific pericope — most commonly from Matthew, Luke, John, Romans, or 1 Corinthians — and unfolds Augustine's pastoral exposition for the congregation at Hippo or Carthage.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Sermons on Selected Lessons of the New Testament — NPNF First Series, Vol. 6 (Schaff ed., 1888)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/1603.htm",
    note: "Translated by R.G. MacMullen. From Nicene and Post-Nicene Fathers, First Series, Vol. 6, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., 1888). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseAugustineSermonsNT(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_1603.json");
  if (!existsSync(provPath)) {
    throw new Error(`Sermons on the NT provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];
  const dedupePerSermon = new Set<string>();

  prov.subpages.forEach((subpageId, idx) => {
    const filePath = join(config.rawDir, `${subpageId}.html`);
    if (!existsSync(filePath)) {
      console.warn(`[sermons-nt] Missing sub-page file: ${filePath}`);
      return;
    }
    const html = readFileSync(filePath, "utf8");
    const parsed = parseNewAdventPage(html, filePath);

    // Parse sermon number from h1 (e.g. "Sermon 5 on the New Testament").
    const sermonMatch = parsed.title.match(/Sermon\s+(\d+)/i);
    const sermonNum = sermonMatch ? Number.parseInt(sermonMatch[1], 10) : idx + 1;
    const sermonNumStr = String(sermonNum).padStart(2, "0");

    const anchors = extractPericopeAnchors(html);

    // Build a short pericope label like "Matt 5:22" / "Luke 9:57" / "Matt 5"
    // from the first resolved anchor. Used as a parenthetical in the chapter
    // title and as the CommentaryEntry title prefix.
    let pericopeLabel: string | undefined;
    for (const anchor of anchors) {
      const slug = resolveBookSlug(anchor.bookCode);
      if (!slug) continue;
      const verse = anchor.verse ? `:${anchor.verse}` : "";
      const bookShort = slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      pericopeLabel = `${bookShort} ${anchor.chapter}${verse}`;
      break;
    }

    const titleSuffix = pericopeLabel ? ` (${pericopeLabel})` : "";
    chapters.push({
      id: `${WORK_ID}-${subpageId}`,
      workId: WORK_ID,
      order: idx + 1,
      label: `Sermon ${sermonNum}`,
      title: `Sermon ${sermonNum} on the New Testament${titleSuffix}`,
      summary: parsed.summary,
      sections: parsed.sections,
      sourceId: SOURCE_ID,
    });

    const excerpt = buildExcerptFromSections(parsed.sections);

    // Emit one verse-keyed entry per unique (book, chapter, verse) anchor.
    // Some sermons cite multiple lessons (e.g. parallel Gospel passages); we
    // emit an entry per anchor so the verse-level reader can surface the
    // sermon from any of them.
    for (const anchor of anchors) {
      const slug = resolveBookSlug(anchor.bookCode);
      if (!slug) continue;
      if (!anchor.verse) continue;
      const key = `${slug}.${anchor.chapter}.${anchor.verse}`;
      const dedupeKey = `${subpageId}::${key}`;
      if (dedupePerSermon.has(dedupeKey)) continue;
      dedupePerSermon.add(dedupeKey);

      const targetVerseId = `${config.verseTranslationPrefix}:${slug}.${anchor.chapter}.${anchor.verse}`;
      entries.push({
        id: `augustine-sermon-nt-${sermonNumStr}-${slug}-${anchor.chapter}-${anchor.verse}`,
        relation: "verse",
        targetVerseId,
        topicSlugs: [],
        personId: PERSON_ID,
        workId: WORK_ID,
        title: `Sermon ${sermonNum} on the NT`,
        excerpt,
        takeaway: "",
        sourceId: SOURCE_ID,
        rank: 75,
        tags: ["augustine", "patristic", "sermon", slug],
      });
    }
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
