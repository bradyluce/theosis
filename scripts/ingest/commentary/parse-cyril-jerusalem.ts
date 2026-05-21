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
import { resolveBookSlug } from "./shared";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "cyril-of-jerusalem";
const WORK_ID = "cyril-jerusalem-catecheses";
const WORK_SLUG = "cyril-jerusalem-catecheses";
const SOURCE_ID = "cyril-jerusalem-catecheses-source";

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

// Sub-page IDs are 3101NN: 00 = Procatechesis, 01-18 = pre-baptismal lectures,
// 19-23 = mystagogical lectures (also called Cat. Myst. 1-5).
function decodeSubpage(subpageId: string): {
  lectureNum: number;
  phase: "procatechesis" | "pre-baptismal" | "mystagogical";
  mystagogicalNum?: number;
} | null {
  const m = subpageId.match(/^3101(\d{2})$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (n === 0) return { lectureNum: 0, phase: "procatechesis" };
  if (n >= 1 && n <= 18) return { lectureNum: n, phase: "pre-baptismal" };
  if (n >= 19 && n <= 23) {
    return {
      lectureNum: n,
      phase: "mystagogical",
      mystagogicalNum: n - 18,
    };
  }
  return null;
}

// Each lecture (except the Procatechesis) opens with:
//   <p><strong>{subtitle}</strong></p>
//   <p><a href="../bible/{book}{chap:03}.htm[#verse{N}]">{Verse}</a>.</p>
//   <p>{pericope text}</p>
//   <p>1. ...</p>  ← body begins
// Scan the raw HTML region from </h1> to <p>1. to extract subtitle + head-verse.
type LectureEpigraph = {
  subtitle?: string;
  anchor?: {
    bookCode: string;
    chapter: number;
    verse?: number;
  };
};

function extractEpigraph(html: string): LectureEpigraph {
  const h1End = html.indexOf("</h1>");
  if (h1End === -1) return {};
  const bodyStart = html.indexOf("<p>1.", h1End);
  const sliceEnd =
    bodyStart === -1 ? Math.min(html.length, h1End + 6000) : bodyStart;
  const region = html.slice(h1End, sliceEnd);

  // Subtitle: first <p><strong>{text}</strong></p> that isn't gumroad.
  const subtitleRe = /<p>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/i;
  let subtitle: string | undefined;
  const subtitleMatch = region.match(subtitleRe);
  if (subtitleMatch) {
    const inner = subtitleMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.:]+$/, "");
    if (inner && !/gumroad/i.test(inner) && !/Please help support/i.test(inner)) {
      subtitle = inner;
    }
  }

  // Head-verse anchor: the first ../bible/ link in the region.
  const bibleRe = /href="\.\.\/bible\/([a-z0-9]{3})(\d{3})\.htm(?:#verse(\d+))?"/i;
  const bibleMatch = region.match(bibleRe);
  const anchor = bibleMatch
    ? {
        bookCode: bibleMatch[1].toLowerCase(),
        chapter: Number.parseInt(bibleMatch[2], 10),
        verse: bibleMatch[3] ? Number.parseInt(bibleMatch[3], 10) : undefined,
      }
    : undefined;

  return { subtitle, anchor };
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Cyril of Jerusalem",
    honorific: "St.",
    kind: "father",
    eraLabel: "4th century",
    summary:
      "Bishop of Jerusalem (c. 350–386), Doctor of the Church, exiled three times during the Arian controversies. His Catechetical Lectures preserve the earliest detailed witness to Christian liturgical practice — the pre-baptismal renunciation, the triple-immersion baptism, chrismation, and the Eucharistic Liturgy.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "March 18",
  };
}

function buildWork(): Work {
  return {
    id: WORK_ID,
    slug: WORK_SLUG,
    personId: PERSON_ID,
    title: "Catechetical Lectures",
    shortTitle: "Catechetical Lectures",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 350",
    summary:
      "The complete catechetical-liturgical cycle: a Procatechesis (pre-Lenten introduction), eighteen pre-baptismal lectures delivered to catechumens during Great Lent, and five Mystagogical Lectures preached during Bright Week to the newly-baptized, explaining the sacraments they had just received (Baptism, Chrismation, and the Eucharist). The foundational text of the Christian catechumenate.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Catechetical Lectures — NPNF Second Series, Vol. 7 (Schaff & Wace eds., 1894)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/3101.htm",
    note: "Translated by Edwin Hamilton Gifford. From Nicene and Post-Nicene Fathers, Second Series, Vol. 7, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1894). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC. Note: Mystagogical Lectures 19–23 are sometimes attributed to Cyril's successor John II of Jerusalem; NPNF treats them as Cyrilline by convention.",
    isSeeded: false,
  };
}

export function parseCyrilJerusalem(config: ParseConfig): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_3101.json");
  if (!existsSync(provPath)) {
    throw new Error(`Cyril Catechetical Lectures provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];

  prov.subpages.forEach((subpageId, idx) => {
    const decoded = decodeSubpage(subpageId);
    if (!decoded) {
      console.warn(`[cyril] Could not decode sub-page id: ${subpageId}`);
      return;
    }
    const filePath = join(config.rawDir, `${subpageId}.html`);
    const html = readFileSync(filePath, "utf8");
    const parsed = parseNewAdventPage(html, filePath);
    const epigraph = extractEpigraph(html);

    let label: string;
    let title: string;
    if (decoded.phase === "procatechesis") {
      label = "Procatechesis";
      title = "Procatechesis (Prologue)";
    } else if (decoded.phase === "mystagogical") {
      label = `Mystagogical ${decoded.mystagogicalNum}`;
      const subtitleSuffix = epigraph.subtitle
        ? `: ${epigraph.subtitle}`
        : "";
      title = `Mystagogical Lecture ${decoded.mystagogicalNum} (NPNF Lecture ${decoded.lectureNum})${subtitleSuffix}`;
    } else {
      label = `Lecture ${decoded.lectureNum}`;
      const subtitleSuffix = epigraph.subtitle
        ? `: ${epigraph.subtitle}`
        : "";
      title = `Catechetical Lecture ${decoded.lectureNum}${subtitleSuffix}`;
    }

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

    // Head-verse commentary entry: only emit for lectures with a specific
    // verse anchor (not whole-book references like 1pe000.htm used by the
    // Mystagogical Lectures).
    if (epigraph.anchor && epigraph.anchor.verse !== undefined) {
      const slug = resolveBookSlug(epigraph.anchor.bookCode);
      if (slug) {
        const excerpt = buildExcerptFromSections(parsed.sections);
        const lectureLabel =
          decoded.phase === "mystagogical"
            ? `Mystagogical Lecture ${decoded.mystagogicalNum}`
            : `Catechetical Lecture ${decoded.lectureNum}`;
        const titleStem = epigraph.subtitle
          ? `${lectureLabel}: ${epigraph.subtitle}`
          : lectureLabel;
        const targetVerseId = `${config.verseTranslationPrefix}:${slug}.${epigraph.anchor.chapter}.${epigraph.anchor.verse}`;
        entries.push({
          id: `cyril-cat-${String(decoded.lectureNum).padStart(2, "0")}-${slug}-${epigraph.anchor.chapter}-${epigraph.anchor.verse}`,
          relation: "verse",
          targetVerseId,
          topicSlugs: [],
          personId: PERSON_ID,
          workId: WORK_ID,
          title: titleStem,
          excerpt,
          takeaway: "",
          sourceId: SOURCE_ID,
          rank: 80,
          tags: ["cyril-jerusalem", "patristic", "catechesis", slug],
        });
      }
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
