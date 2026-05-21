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

const PERSON_ID = "justin-martyr";

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
};

const WORKS: WorkDef[] = [
  {
    naId: "0126",
    slug: "justin-first-apology",
    title: "The First Apology",
    shortTitle: "First Apology",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 155",
    summary:
      "Justin's defense of Christianity addressed to Emperor Antoninus Pius. Refutes the slanders against Christians and explains Christian doctrine and practice. Chapters 61–67 preserve the earliest detailed external description of Christian baptism and the Eucharist — invaluable for liturgical history.",
    translator: "Marcus Dods and George Reith",
  },
  {
    naId: "0127",
    slug: "justin-second-apology",
    title: "The Second Apology",
    shortTitle: "Second Apology",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 161",
    summary:
      "Shorter follow-up appeal, written after the martyrdom of Ptolemaeus and his companions in Rome, addressed to the Roman Senate.",
    translator: "Marcus Dods and George Reith",
  },
  {
    naId: "0128",
    slug: "justin-dialogue-trypho",
    title: "Dialogue with Trypho",
    shortTitle: "Dialogue with Trypho",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 155–160",
    summary:
      "Justin's long dialogue with a learned Jew named Trypho on the Christian reading of the Hebrew Scriptures. Argues from Old Testament prophecy that Jesus is the Messiah and Logos, and that the Law of Moses gives way to a new covenant. The foundational early Christian-Jewish dialogue text.",
    translator: "Marcus Dods and George Reith",
  },
  {
    naId: "0129",
    slug: "justin-hortatory-address-greeks",
    title: "Hortatory Address to the Greeks",
    shortTitle: "Hortatory Address to the Greeks",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "uncertain (attributed)",
    summary:
      "Apologetic address calling pagans to abandon Greek polytheism in favor of the truth of the Hebrew prophets. Authorship is sometimes disputed.",
    translator: "Marcus Dods",
  },
  {
    naId: "0130",
    slug: "justin-sole-government-of-god",
    title: "On the Sole Government of God",
    shortTitle: "On the Sole Government of God",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain (attributed)",
    summary:
      "Apologetic argument for monotheism, drawing on testimony from Greek poets and philosophers themselves. Authorship sometimes disputed.",
    translator: "George Reith",
  },
  {
    naId: "0131",
    slug: "justin-fragments-resurrection",
    title: "Fragments of the Lost Work on the Resurrection",
    shortTitle: "Fragments on the Resurrection",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain (attributed)",
    summary:
      "Surviving fragments from a lost treatise defending the bodily resurrection against Gnostic and philosophical denials.",
    translator: "M. Dods",
  },
  {
    naId: "0132",
    slug: "justin-other-fragments",
    title: "Other Fragments from the Lost Writings of Justin",
    shortTitle: "Other Fragments",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain",
    summary:
      "Miscellaneous fragments preserved in later patristic citations.",
    translator: "M. Dods",
  },
  {
    naId: "0133",
    slug: "justin-martyrdom",
    title: "The Martyrdom of the Holy Martyrs Justin and Others",
    shortTitle: "Martyrdom of Justin",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "c. 165",
    summary:
      "Acts of Justin's martyrdom together with six companions in Rome under the prefect Rusticus during the reign of Marcus Aurelius. One of the most reliable surviving authentic martyr-acts.",
    translator: "M. Dods",
  },
  {
    naId: "0135",
    slug: "justin-discourse-greeks",
    title: "Discourse to the Greeks",
    shortTitle: "Discourse to the Greeks",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain (attributed)",
    summary:
      "Brief apologetic discourse criticizing Greek religious mythology and philosophy and commending Christian truth.",
    translator: "M. Dods",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Justin Martyr",
    honorific: "St.",
    kind: "father",
    eraLabel: "2nd century",
    summary:
      "Justin Martyr (c. 100–165) — born in Samaria of Greek-pagan parents, converted to Christianity after a long philosophical search through Stoicism, Aristotelianism, Pythagoreanism, and Platonism. Taught publicly in Rome and wrote the most important Christian apologetic works of the 2nd century. Articulated the doctrine of the Logos spermatikos — God's reason scattered as seeds among all peoples, with Christ as the full Logos. Martyred in Rome under Marcus Aurelius (c. 165). The first major Christian thinker to engage seriously with Greek philosophy.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["apologetics", "logos-theology"],
    featuredWorkIds: workIds,
    feastDayLabel: "June 1",
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
    label: `${def.title} — Ante-Nicene Fathers, Vol. 1 (Roberts/Donaldson/Coxe eds., 1885)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translator}. From Ante-Nicene Fathers, Vol. 1, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1885). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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

export function parseJustinMartyr(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[justin-martyr] Missing provenance for ${def.naId}`);
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
