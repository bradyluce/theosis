import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
} from "../../../src/domain/content/types";
import { parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "gregory-of-nazianzus";
const WORK_ID = "gregory-nazianzen-letters";
const WORK_SLUG = "gregory-nazianzen-letters";
const SOURCE_ID = "gregory-nazianzen-letters-source";

type ParseConfig = {
  rawDir: string;
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
};

const DIVISION_LABELS: Record<string, string> = {
  "3103a": "Division I — Apollinarian Controversy",
  "3103b": "Division II — Correspondence with Basil",
  "3103c": "Division III — Miscellaneous",
};

function romanToInt(roman: string): number | null {
  const values: Record<string, number> = {
    I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
  };
  let total = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i -= 1) {
    const v = values[roman[i].toUpperCase()];
    if (v === undefined) return null;
    if (v >= prev) total += v;
    else total -= v;
    prev = v;
  }
  return total > 0 ? total : null;
}

// Letter heading patterns vary across the three Divisions. Try the most
// specific patterns first.
function parseLetterHeading(heading: string): {
  letterNum?: number;
  isIntroduction: boolean;
} {
  if (/^Introduction\b/i.test(heading)) {
    return { isIntroduction: true };
  }
  // "Epistle 125. To Olympius." — Div II/III modern format
  let m = heading.match(/Epistle\s+(\d+)\b/i);
  if (m) {
    return { letterNum: Number.parseInt(m[1], 10), isIntroduction: false };
  }
  // "To Nectarius, Bishop of Constantinople. (Ep. CCII.)" — Div I older format
  m = heading.match(/\(Ep\.\s+([IVXLCDM]+)\.?\)/i);
  if (m) {
    return { letterNum: romanToInt(m[1]) ?? undefined, isIntroduction: false };
  }
  // "1. Letters to His Brother Cæsarius" — Div III group headings (sequential)
  m = heading.match(/^(\d+)\.\s+/);
  if (m) {
    return { letterNum: Number.parseInt(m[1], 10), isIntroduction: false };
  }
  return { isIntroduction: false };
}

function buildPerson(): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Gregory of Nazianzus",
    honorific: "St.",
    kind: "father",
    eraLabel: "4th century",
    summary:
      "Archbishop of Constantinople (briefly, 381); one of the Three Cappadocian Fathers and one of only three saints in the Orthodox tradition called 'the Theologian.' Lifelong friend of St. Basil; architect of Trinitarian orthodoxy at the Council of Constantinople.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: [],
    featuredWorkIds: [WORK_ID],
    feastDayLabel: "January 25",
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
    lengthLabel: "medium",
    eraLabel: "c. 370s–389",
    summary:
      "Selected correspondence of Gregory of Nazianzus, organized in three Divisions by topic: the Apollinarian Controversy (with the famous Letter 101 to Cledonius — 'What was not assumed is not healed'); the lifelong correspondence with St. Basil the Great; and miscellaneous pastoral and familial letters.",
    topicSlugs: [],
    sourceId: SOURCE_ID,
    verseRefs: [],
  };
}

function buildSource(): SourceRecord {
  return {
    id: SOURCE_ID,
    label:
      "Letters — NPNF Second Series, Vol. 7 (Schaff & Wace eds., 1894)",
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: "https://www.newadvent.org/fathers/3103.htm",
    note: "Translated by Charles Gordon Browne and James Edward Swallow. From Nicene and Post-Nicene Fathers, Second Series, Vol. 7, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1894). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.",
    isSeeded: false,
  };
}

export function parseGregoryNazianzenLetters(
  config: ParseConfig,
): CommentaryBundleV2 {
  const provPath = join(config.rawDir, "provenance_3103.json");
  if (!existsSync(provPath)) {
    throw new Error(`Letters provenance not found: ${provPath}`);
  }
  const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

  const chapters: WorkChapter[] = [];
  let globalOrder = 0;

  for (const subpageId of prov.subpages) {
    const filePath = join(config.rawDir, `${subpageId}.html`);
    if (!existsSync(filePath)) {
      console.warn(`[gregory-nazianzen-letters] Missing: ${filePath}`);
      continue;
    }
    const html = readFileSync(filePath, "utf8");
    const parsed = parseNewAdventPage(html, filePath);
    const divisionLabel =
      DIVISION_LABELS[subpageId] ?? `Division (${subpageId})`;

    // Each section in the parsed output corresponds to one <h2> letter (or the
    // Division Introduction). Emit one WorkChapter per letter.
    parsed.sections.forEach((section) => {
      if (!section.heading) {
        // Pre-Introduction paragraphs (rare; treat as division intro).
        if (section.paragraphs.length === 0) return;
        globalOrder += 1;
        chapters.push({
          id: `${WORK_ID}-${subpageId}-pre`,
          workId: WORK_ID,
          order: globalOrder,
          label: divisionLabel,
          title: `${divisionLabel} (Preamble)`,
          sections: [{ paragraphs: section.paragraphs }],
          sourceId: SOURCE_ID,
        });
        return;
      }

      const parsedHeading = parseLetterHeading(section.heading);
      globalOrder += 1;

      const label = parsedHeading.isIntroduction
        ? `${divisionLabel} — Introduction`
        : parsedHeading.letterNum !== undefined
          ? `Letter ${parsedHeading.letterNum}`
          : section.heading;

      const title = section.heading;

      const idSlug = parsedHeading.isIntroduction
        ? `${subpageId}-intro`
        : parsedHeading.letterNum !== undefined
          ? `${subpageId}-ep${parsedHeading.letterNum}`
          : `${subpageId}-${globalOrder}`;

      chapters.push({
        id: `${WORK_ID}-${idSlug}`,
        workId: WORK_ID,
        order: globalOrder,
        label,
        title,
        sections: [{ paragraphs: section.paragraphs }],
        sourceId: SOURCE_ID,
      });
    });
  }

  return {
    version: "2",
    people: [buildPerson()],
    works: [buildWork()],
    sources: [buildSource()],
    entries: [],
    chapters,
  };
}
