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

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const PERSON_ID = "clement-of-alexandria";

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
  translator: string;
  // Custom label decoder for sub-pages (book-number embedded in id).
  labelFromSubpage?: (subpageId: string, fallback: string) => string;
};

// Sub-page id 0210NN → Stromata Book N (zero-padded). Likewise 0209N for the
// 3-book Instructor.
function bookLabelFromSuffix(subpageId: string, fallback: string): string {
  const m = subpageId.match(/^0210(\d{1,2})$/);
  if (m) return `Book ${Number.parseInt(m[1], 10)}`;
  const m2 = subpageId.match(/^0209(\d)$/);
  if (m2) return `Book ${Number.parseInt(m2[1], 10)}`;
  return fallback;
}

const WORKS: WorkDef[] = [
  {
    naId: "0207",
    slug: "clement-rich-man",
    title: "Who is the Rich Man That Shall Be Saved?",
    shortTitle: "Who is the Rich Man",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "c. 200",
    summary:
      "Clement's exegetical homily on Mark 10:17–31 (the rich young ruler). Reads Christ's command to sell all not as a literal-economic demand but as an interior detachment from wealth — wealth itself is morally neutral, the heart's attachment to wealth is the obstacle to salvation.",
    translator: "William Wilson",
  },
  {
    naId: "0208",
    slug: "clement-exhortation-heathen",
    title: "Exhortation to the Heathen (Protrepticus)",
    shortTitle: "Exhortation to the Heathen",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 195",
    summary:
      "First volume of Clement's trilogy. A protreptic (call to conversion) addressed to pagans, urging them to abandon the empty cult of the Greek gods for the worship of the true God revealed in Christ the Logos.",
    translator: "William Wilson",
  },
  {
    naId: "0209",
    slug: "clement-instructor",
    title: "The Instructor (Paedagogus)",
    shortTitle: "The Instructor",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 198",
    summary:
      "Second volume of Clement's trilogy. Three books in which Christ the Paedagogus (Tutor) guides the newly converted Christian through the practical disciplines of moral life — diet, dress, conduct at table and in the bath, marriage, the use of wealth, the proper care of the body.",
    translator: "William Wilson",
    labelFromSubpage: bookLabelFromSuffix,
  },
  {
    naId: "0210",
    slug: "clement-stromata",
    title: "The Stromata (Miscellanies)",
    shortTitle: "Stromata",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 200–210",
    summary:
      "Third and largest volume of Clement's trilogy — eight books of theological miscellany engaging Greek philosophy, Jewish exegesis, Gnostic teaching, and Christian doctrine. The Stromata develops Clement's vision of the true Christian gnostikos: the believer whose love of God matures into contemplative knowledge through the right use of philosophy.",
    translator: "William Wilson",
    labelFromSubpage: bookLabelFromSuffix,
  },
  {
    naId: "0211",
    slug: "clement-fragments",
    title: "Fragments of Clement of Alexandria",
    shortTitle: "Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late 2nd – early 3rd century",
    summary:
      "Surviving fragments of Clement's lost works (Hypotyposeis, Excerpts from Theodotus, Eclogae Propheticae, and others) preserved in later patristic citations.",
    translator: "William Wilson",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Clement of Alexandria",
    honorific: "St.",
    kind: "father",
    eraLabel: "2nd–3rd century",
    summary:
      "Titus Flavius Clemens (c. 150–c. 215) — first major teacher at the Catechetical School of Alexandria and teacher of Origen. Founded the Alexandrian theological tradition of integrating Greek philosophy with Christian revelation. Venerated as a saint in the Eastern Orthodox tradition (Nov 23); removed from the Roman Martyrology by Pope Benedict XIV in 1748 due to scholastic doubts about some of his speculative theological positions, though his Christian witness has remained widely honored.",
    traditions: ["Eastern Orthodox", "Greek Patristics"],
    topicSlugs: ["alexandrian-school"],
    featuredWorkIds: workIds,
    feastDayLabel: "November 23",
  };
}

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
    label: `${def.title} — Ante-Nicene Fathers, Vol. 2 (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translator}. From Ante-Nicene Fathers, Vol. 2, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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
  labelOverride?: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const parenMatch = parsed.title.match(/\(([^)]+)\)/);
  const label =
    args.labelOverride ??
    (parenMatch ? parenMatch[1] : args.fallbackLabel);
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

type ParseConfig = {
  rawDir: string;
};

export function parseClementAlexandria(
  config: ParseConfig,
): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[clement-alexandria] Missing provenance for ${def.naId}`);
      continue;
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;
    works.push(buildWork(def));
    sources.push(buildSource(def));
    workIds.push(def.slug);

    if (prov.subpages.length === 0) {
      chapters.push(
        buildChapter({
          workId: def.slug,
          sourceId: `${def.slug}-source`,
          rawDir: config.rawDir,
          fileId: def.naId,
          order: 1,
          fallbackLabel: def.shortTitle,
          fallbackTitle: def.title,
        }),
      );
    } else {
      prov.subpages.forEach((subpageId, idx) => {
        const labelOverride = def.labelFromSubpage
          ? def.labelFromSubpage(subpageId, `${def.shortTitle} ${idx + 1}`)
          : undefined;
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: `${def.shortTitle} ${idx + 1}`,
            fallbackTitle: `${def.title} ${idx + 1}`,
            labelOverride,
          }),
        );
      });
    }
  }

  return {
    version: "2",
    people: [buildPerson(workIds)],
    works,
    sources,
    entries: [],
    chapters,
  };
}
