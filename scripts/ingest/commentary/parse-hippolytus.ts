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

const PERSON_ID = "hippolytus-of-rome";

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
  labelFromSubpage?: (subpageId: string, fallback: string) => string;
};

// Refutation of All Heresies sub-pages are 0501NN where NN is the book number
// (gapped: Books 1, 4–10 are preserved; Books 2 and 3 are lost in the only
// surviving Greek manuscript). Decode the trailing 2 digits as the Book number.
function refutationBookLabel(subpageId: string, fallback: string): string {
  const m = subpageId.match(/^0501(\d{2})$/);
  if (!m) return fallback;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? `Book ${n}` : fallback;
}

const WORKS: WorkDef[] = [
  {
    naId: "0501",
    slug: "hippolytus-refutation-heresies",
    title: "The Refutation of All Heresies",
    shortTitle: "Refutation of All Heresies",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 220–230",
    summary:
      "Hippolytus's major work, a ten-book exposé of Gnostic and other heretical systems — by far the fullest surviving 3rd-century catalog of pre-Nicene heresies, preserving substantial verbatim quotations from the Gnostic teachers themselves. Books 1, 4 through 10 survive (Books 2 and 3 are lost). Often known as the Philosophumena.",
    labelFromSubpage: refutationBookLabel,
  },
  {
    naId: "0502",
    slug: "hippolytus-exegetical-fragments",
    title: "Exegetical Fragments",
    shortTitle: "Exegetical Fragments",
    workType: "commentary",
    lengthLabel: "medium",
    eraLabel: "early 3rd century",
    summary:
      "Surviving fragments of Hippolytus's biblical commentaries on Genesis, Exodus, Numbers, Psalms, Proverbs, Ecclesiastes, the Song of Songs, Daniel, and other Old and New Testament books.",
  },
  {
    naId: "0503",
    slug: "hippolytus-against-jews",
    title: "Expository Treatise Against the Jews",
    shortTitle: "Against the Jews",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 3rd century",
    summary:
      "Brief anti-Jewish polemical treatise arguing from Old Testament prophecy that Jesus is the Messiah. Like other patristic adversus Iudaeos works, requires careful editorial framing in modern reception.",
  },
  {
    naId: "0504",
    slug: "hippolytus-end-of-world",
    title: "Treatise on Christ and Antichrist (On the End of the World)",
    shortTitle: "On the End of the World",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain",
    summary:
      "Pseudonymous eschatological treatise attributed to Hippolytus but generally regarded as later in composition. Treats the second coming and the end of the age.",
  },
  {
    naId: "0516",
    slug: "hippolytus-antichrist",
    title: "Treatise on Christ and Antichrist",
    shortTitle: "On Christ and Antichrist",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 200",
    summary:
      "Hippolytus's classic treatment of the figure of the Antichrist, working through Old Testament prophecies (especially Daniel) and Pauline eschatology. The earliest extended Christian work on this subject.",
  },
  {
    naId: "0520",
    slug: "hippolytus-against-plato",
    title: "Against Plato on the Cause of the Universe",
    shortTitle: "Against Plato",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "early 3rd century",
    summary:
      "Short philosophical treatise against Platonic cosmology, defending creation ex nihilo against the eternity of matter.",
  },
  {
    naId: "0521",
    slug: "hippolytus-against-noetus",
    title: "Against the Heresy of One Noetus",
    shortTitle: "Against Noetus",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 200–220",
    summary:
      "Refutation of the modalist monarchian Noetus of Smyrna, defending the distinct hypostatic existence of the Son alongside the Father. An important early Greek anti-modalist text.",
  },
  {
    naId: "0523",
    slug: "hippolytus-holy-theophany",
    title: "Discourse on the Holy Theophany",
    shortTitle: "On the Holy Theophany",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "early 3rd century",
    summary:
      "Homily for the Feast of the Theophany (Baptism of Christ), expounding the theological meaning of Christ's baptism in the Jordan and its bearing on the baptismal liturgy.",
  },
  {
    naId: "0524",
    slug: "hippolytus-apostles-disciples",
    title: "On the Seventy Apostles",
    shortTitle: "The Apostles and the Disciples",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "uncertain",
    summary:
      "Pseudonymous list-text catalog of the Twelve Apostles and the Seventy Disciples, with brief notes on each one's later mission and traditional place of death.",
  },
];

function buildPerson(workIds: string[]): Person {
  return {
    id: PERSON_ID,
    slug: PERSON_ID,
    name: "Hippolytus of Rome",
    honorific: "St.",
    kind: "father",
    eraLabel: "2nd–3rd century",
    summary:
      "Hippolytus of Rome (c. 170–235) — the most important Greek-writing theologian in the Roman church of the early 3rd century. A presbyter and theological opponent of Popes Zephyrinus and Callistus over the latter's perceived modalism and laxity, Hippolytus became the first anti-pope, but was reconciled with the Church under Pope Pontian; the two were exiled together to the Sardinian mines under Maximinus Thrax and died there, regarded jointly as martyrs.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["greek-patristics"],
    featuredWorkIds: workIds,
    feastDayLabel: "January 30",
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
    note: `Translated by J.H. MacMahon. From Ante-Nicene Fathers, Vol. 5, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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
    args.labelOverride ?? (parenMatch ? parenMatch[1] : args.fallbackLabel);
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

export function parseHippolytus(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const workIds: string[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[hippolytus] Missing provenance for ${def.naId}`);
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
