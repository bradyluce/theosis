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
  authorFolder: string;
  personId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  translators: string;
};

const NPNF_NOTE = (translators: string) =>
  `Translated by ${translators}. From Nicene and Post-Nicene Fathers, Second Series, Vol. 11, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1894). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`;

const WORKS: WorkDef[] = [
  // ── John Cassian ──────────────────────────────────────────────────────────
  {
    naId: "3507",
    authorFolder: "john-cassian",
    personId: "john-cassian",
    slug: "cassian-institutes",
    title: "Institutes of the Cœnobia (De Institutis Coenobiorum)",
    shortTitle: "Institutes",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 420",
    summary:
      "Twelve books on monastic life — the first four on practical observance (clothing, daily prayer, the canonical hours, novitiate), the last eight on the cure of the eight principal vices. The foundational rule-book of Western cenobitic monasticism; recommended by St. Benedict and read in Orthodox monasteries.",
    translators: "Edgar C.S. Gibson",
  },
  {
    naId: "3508",
    authorFolder: "john-cassian",
    personId: "john-cassian",
    slug: "cassian-conferences",
    title: "Conferences (Collationes)",
    shortTitle: "Conferences",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 420–429",
    summary:
      "Twenty-four conversations with the great Egyptian Desert Fathers — the most influential monastic text after the Rule of St. Benedict. Cassian's account of pure prayer in Conferences 9 and 10 became foundational for the hesychast tradition; his treatment of grace in Conference 13 lit the long Augustinian dispute in the West.",
    translators: "Edgar C.S. Gibson",
  },
  {
    naId: "3509",
    authorFolder: "john-cassian",
    personId: "john-cassian",
    slug: "cassian-on-the-incarnation",
    title: "On the Incarnation of the Lord (Against Nestorius)",
    shortTitle: "On the Incarnation",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 430",
    summary:
      "Seven books written at the request of Pope Leo, then archdeacon — Cassian's anti-Nestorian Christology, the late fruit of his Eastern formation now wielded in defense of Cyrilline orthodoxy in Latin.",
    translators: "Edgar C.S. Gibson",
  },

  // ── Sulpitius Severus ─────────────────────────────────────────────────────
  {
    naId: "3501",
    authorFolder: "sulpitius-severus",
    personId: "sulpitius-severus",
    slug: "sulpitius-life-of-saint-martin",
    title: "On the Life of St. Martin",
    shortTitle: "Life of St. Martin",
    workType: "life",
    lengthLabel: "medium",
    eraLabel: "c. 396",
    summary:
      "The foundational Western hagiography — Sulpitius's biography of his master Martin of Tours, the soldier turned monk turned bishop. The pattern from which the Latin saint's life as a literary genre takes its shape.",
    translators: "Alexander Roberts",
  },
  {
    naId: "3502",
    authorFolder: "sulpitius-severus",
    personId: "sulpitius-severus",
    slug: "sulpitius-letters",
    title: "Letters (Genuine)",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 397–c. 400",
    summary:
      "Three undisputed letters that survive — pastoral and biographical correspondence around the death and miracles of St. Martin.",
    translators: "Alexander Roberts",
  },
  {
    naId: "3503",
    authorFolder: "sulpitius-severus",
    personId: "sulpitius-severus",
    slug: "sulpitius-dialogues",
    title: "Dialogues",
    shortTitle: "Dialogues",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 403",
    summary:
      "Three dialogues continuing the Life of Martin and incorporating tales of the Egyptian desert — a sequel that crystallized the Western image of the monastic East.",
    translators: "Alexander Roberts",
  },
  {
    naId: "3504",
    authorFolder: "sulpitius-severus",
    personId: "sulpitius-severus",
    slug: "sulpitius-letters-dubious",
    title: "Letters (Dubious)",
    shortTitle: "Letters (Dubious)",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 4th–5th century",
    summary:
      "Letters attributed to Sulpitius but whose authenticity is contested by modern scholarship — preserved in NPNF for the sake of completeness.",
    translators: "Alexander Roberts",
  },
  {
    naId: "3505",
    authorFolder: "sulpitius-severus",
    personId: "sulpitius-severus",
    slug: "sulpitius-sacred-history",
    title: "Sacred History",
    shortTitle: "Sacred History",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 403",
    summary:
      "Two-book universal history from creation to Sulpitius's own time — a popular Christian chronicle in the genre of Eusebius's Chronicle, written for a Gaulish lay readership.",
    translators: "Alexander Roberts",
  },
];

function buildWork(def: WorkDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: def.personId,
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
    label: `${def.title} — NPNF Second Series, Vol. 11 (Schaff & Wace eds., 1894)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: NPNF_NOTE(def.translators),
    isSeeded: false,
  };
}

function deriveLabel(parsedTitle: string, def: WorkDef): string {
  // Common multi-subpage section prefixes.
  const conferenceMatch = parsedTitle.match(/^(Conference\s+[IVX\d]+)/i);
  if (conferenceMatch) return conferenceMatch[1];
  const letterMatch = parsedTitle.match(/^(Letter\s+\d+)/i);
  if (letterMatch) return letterMatch[1];
  const bookMatch = parsedTitle.match(/Book\s+([IVX\d]+)/i);
  if (bookMatch) return `Book ${bookMatch[1]}`;
  const dialogueMatch = parsedTitle.match(/Dialogue\s+([IVX\d]+)/i);
  if (dialogueMatch) return `Dialogue ${dialogueMatch[1]}`;
  const paren = parsedTitle.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  return parsedTitle || def.shortTitle;
}

function makeChapter(args: {
  def: WorkDef;
  rawRoot: string;
  fileId: string;
  order: number;
}): WorkChapter {
  const filePath = join(args.rawRoot, args.def.authorFolder, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  const label = deriveLabel(parsed.title, args.def);
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
  fathersRoot: string;
};

export function parseMonasticTradition(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const provPath = join(
      config.fathersRoot,
      def.authorFolder,
      `provenance_${def.naId}.json`,
    );
    if (!existsSync(provPath)) {
      throw new Error(
        `Monastic-tradition provenance file missing: ${provPath}`,
      );
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    const subpages = prov.subpages.length > 0 ? prov.subpages : [def.naId];
    subpages.forEach((fileId, idx) => {
      chapters.push(
        makeChapter({
          def,
          rawRoot: config.fathersRoot,
          fileId,
          order: idx + 1,
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
