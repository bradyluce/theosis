import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
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

const PERSON_ID = "cyprian-of-carthage";

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
  // For multi-subpage works, how each sub-page should be labeled.
  // "epistle" → "Epistle N", "treatise" → "Treatise N"; both also extract the
  // subtitle from the first <p><strong> for the title.
  childKind?: "epistle" | "treatise";
};

const WORKS: WorkDef[] = [
  {
    naId: "0505",
    slug: "cyprian-life-and-passion",
    title: "The Life and Passion of Cyprian",
    shortTitle: "Life and Passion",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "c. 258",
    summary:
      "Contemporary hagiography of Cyprian by his deacon Pontius — the earliest surviving Christian biography. Recounts Cyprian's conversion, episcopal ministry, flight during the Decian persecution, return, and martyrdom under Valerian (Sept 14, 258).",
  },
  {
    naId: "0506",
    slug: "cyprian-epistles",
    title: "The Epistles of Cyprian",
    shortTitle: "Epistles",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 246–258",
    summary:
      "Cyprian's surviving correspondence — eighty-two letters covering his pastoral oversight of the Carthaginian church during the Decian persecution, the controversy over the lapsed, the rebaptism dispute with Pope Stephen, and the pastoral life of the mid-3rd-century North African Church.",
    childKind: "epistle",
  },
  {
    naId: "0507",
    slug: "cyprian-treatises",
    title: "The Treatises of Cyprian",
    shortTitle: "Treatises",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 250–258",
    summary:
      "Cyprian's pastoral and theological treatises. Includes the foundational ecclesiological text De Unitate Ecclesiae (On the Unity of the Church), expositions On the Lord's Prayer, On the Lapsed (on the question of post-persecution reconciliation), On Mortality (composed during the plague of 252), and a series of practical-moral treatises (works and almsgiving, patience, jealousy and envy, the Lord's Prayer, the dress of virgins).",
    childKind: "treatise",
  },
  {
    naId: "0508",
    slug: "cyprian-seventh-council-carthage",
    title: "The Seventh Council of Carthage",
    shortTitle: "Seventh Council of Carthage",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "256",
    summary:
      "Acts of the Seventh Council of Carthage (256), at which Cyprian and eighty-six other African bishops affirmed that baptisms performed by heretics are invalid — the position at the center of the rebaptism controversy with Pope Stephen of Rome. Each bishop's individual vote is preserved.",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Cyprian of Carthage",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd century",
    summary:
      "Caecilius Cyprianus (c. 200–258) — bishop of Carthage from 248, martyred under Valerian on September 14, 258. Foundational figure in Latin Christian ecclesiology. Articulated the principle extra ecclesiam nulla salus (\"outside the Church there is no salvation\") and his treatise On the Unity of the Church became central to all subsequent Catholic and Orthodox ecclesiology. Engaged in the rebaptism controversy with Pope Stephen of Rome, defending the African position that baptisms performed by heretics are invalid.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["latin-patristics", "ecclesiology"],
    featuredWorkIds: workIds,
    feastDayLabel: "August 31",
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
    label: `${def.title} — Ante-Nicene Fathers, Vol. 5 (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by Robert Ernest Wallis. From Ante-Nicene Fathers, Vol. 5, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

// Extract the bold subtitle from the first <p><strong> in the parsed sections
// (used for individual Epistle/Treatise recipient or topic).
function firstBoldSubtitle(
  sections: ReturnType<typeof parseNewAdventPage>["sections"],
): string | undefined {
  const firstPara = sections[0]?.paragraphs?.[0];
  if (!firstPara) return undefined;
  const text = firstPara.text.trim();
  // Heuristic: subtitle is short, no leading paragraph number, ends with period.
  if (text.length > 160) return undefined;
  if (/^(\d+|[IVXLCDM]+)\.\s/.test(text)) return undefined;
  return text.replace(/\.+$/, "").trim();
}

function buildChapter(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackTitle: string;
  fallbackLabel: string;
  childKind?: "epistle" | "treatise";
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  // For epistle/treatise sub-pages, parse the running number from <h1>
  // (e.g. "Epistle 5", "Treatise 11") and combine with the bold subtitle to
  // form a rich title.
  let label = args.fallbackLabel;
  let title = parsed.title || args.fallbackTitle;
  if (args.childKind) {
    const m = parsed.title.match(/^(Epistle|Treatise)\s+(\d+)/i);
    if (m) {
      const kind = m[1];
      const num = m[2];
      label = `${kind} ${num}`;
      const subtitle = firstBoldSubtitle(parsed.sections);
      title = subtitle ? `${kind} ${num}: ${subtitle}` : `${kind} ${num}`;
    }
  } else {
    const parenMatch = parsed.title.match(/\(([^)]+)\)/);
    if (parenMatch) label = parenMatch[1];
  }

  return {
    id: `${args.workId}-${args.fileId}`,
    workId: args.workId,
    order: args.order,
    label,
    title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

type ParseConfig = {
  rawDir: string;
};

export function parseCyprian(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[cyprian] Missing provenance for ${def.naId}`);
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
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir: config.rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: `${def.shortTitle} ${idx + 1}`,
            fallbackTitle: `${def.title} ${idx + 1}`,
            childKind: def.childKind,
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
