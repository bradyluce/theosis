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

const PERSON_ID = "methodius-of-olympus";

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
    naId: "0623",
    slug: "methodius-banquet-ten-virgins",
    title: "The Banquet of the Ten Virgins",
    shortTitle: "Banquet of the Ten Virgins",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 300",
    summary:
      "Methodius's masterwork — a Platonic-style symposium dialogue celebrating Christian virginity. Ten virgins, gathered at the banquet of Arete (Virtue), each deliver a discourse in praise of chastity. The most influential Greek patristic text on Christian virginity alongside Gregory of Nyssa's On Virginity.",
  },
  {
    naId: "0624",
    slug: "methodius-free-will",
    title: "Concerning Free Will",
    shortTitle: "Concerning Free Will",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "early 4th century",
    summary:
      "Anti-Gnostic dialogue defending human free will and creation ex nihilo against the Valentinian and Marcionite teaching that evil arises from a co-eternal evil principle.",
  },
  {
    naId: "0625",
    slug: "methodius-on-resurrection",
    title: "From the Discourse on the Resurrection",
    shortTitle: "On the Resurrection",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "early 4th century",
    summary:
      "Important early anti-Origenist treatise on the resurrection body, disputing Origen's spiritualizing reading of the resurrection in favor of the identity of the risen body with the body that died. A foundational source for the later Origenist controversies.",
  },
  {
    naId: "0626",
    slug: "methodius-fragments",
    title: "Fragments",
    shortTitle: "Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Surviving fragments from Methodius's lost works on Job, the Origin of the Creatures, life, and other subjects.",
  },
  {
    naId: "0627",
    slug: "methodius-simeon-and-anna",
    title: "Oration Concerning Simeon and Anna",
    shortTitle: "On Simeon and Anna",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Sermon on Luke 2 — the Presentation of the Lord in the Temple. Expounds the typology of Simeon and Anna receiving the infant Christ.",
  },
  {
    naId: "0628",
    slug: "methodius-on-psalms",
    title: "Oration on the Psalms",
    shortTitle: "On the Psalms",
    workType: "commentary",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Brief homiletic exposition of selected Psalms.",
  },
  {
    naId: "0629",
    slug: "methodius-cross-and-passion",
    title: "Three Fragments on the Cross and Passion",
    shortTitle: "On the Cross and Passion",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 4th century",
    summary:
      "Three short surviving fragments meditating on the saving work of Christ's Cross and Passion.",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Methodius of Olympus",
    honorific: "St.",
    kind: "father",
    eraLabel: "3rd–4th century",
    summary:
      "Methodius of Olympus (d. c. 311) — bishop of Olympus in Lycia, martyred under Maximinus II. The earliest sustained critic of Origenist eschatology and a defender of the bodily resurrection. His Banquet of the Ten Virgins is among the most influential Greek patristic celebrations of Christian virginity. Pre-figures the later Origenist controversies that culminated in the Second Council of Constantinople (553).",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-patristics", "anti-origenism"],
    featuredWorkIds: workIds,
    feastDayLabel: "June 20",
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
    label: `${def.title} — Ante-Nicene Fathers, Vol. 6 (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `From Ante-Nicene Fathers, Vol. 6, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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
  // Banquet sub-pages have <h1>Banquet of the Ten Virgins (Discourse N)</h1>
  // — the parenthetical is the natural label.
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

type ParseConfig = {
  rawDir: string;
};

export function parseMethodius(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[methodius] Missing provenance for ${def.naId}`);
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
