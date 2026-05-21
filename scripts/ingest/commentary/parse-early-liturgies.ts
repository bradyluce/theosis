import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
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

type LiturgyDef = {
  naId: string;
  // Subfolder inside content/raw/liturgy/.
  subdir: string;
  slug: string;
  title: string;
  shortTitle: string;
  // Apostle id this liturgy is traditionally attributed to. All three already
  // exist in src/lib/content/seed/library.ts (apostles-addai-and-mari was
  // added alongside this parser).
  personId: string;
  eraLabel: string;
  summary: string;
};

const LITURGIES: LiturgyDef[] = [
  {
    naId: "0717",
    subdir: "liturgy-of-james",
    slug: "liturgy-of-saint-james",
    title: "The Divine Liturgy of St. James",
    shortTitle: "Liturgy of St. James",
    personId: "apostle-james-brother-of-lord",
    eraLabel: "4th–5th century compilation",
    summary:
      "The ancestor of most Eastern eucharistic liturgies — traditionally attributed to James the Brother of the Lord, the first bishop of Jerusalem. Still served by the Syriac Orthodox Church and, in the Greek Orthodox tradition, on St. James's feast day (October 23).",
  },
  {
    naId: "0718",
    subdir: "liturgy-of-mark",
    slug: "liturgy-of-saint-mark",
    title: "The Divine Liturgy of St. Mark",
    shortTitle: "Liturgy of St. Mark",
    personId: "apostle-mark",
    eraLabel: "4th–5th century compilation",
    summary:
      "The Alexandrian eucharistic liturgy attributed to St. Mark — preserved in living use by the Coptic Orthodox Church (as the Liturgy of St. Cyril). Notable for its long intercessions for the Nile, the harvests, and the Christian people of Egypt.",
  },
  {
    naId: "0719",
    subdir: "liturgy-of-apostles",
    slug: "liturgy-of-the-blessed-apostles",
    title: "The Divine Liturgy of the Blessed Apostles (Addai and Mari)",
    shortTitle: "Liturgy of the Blessed Apostles",
    personId: "apostles-addai-and-mari",
    eraLabel: "3rd century (East Syriac)",
    summary:
      "The East Syriac anaphora of Saints Addai and Mari — possibly the oldest extant Christian eucharistic prayer. Still served by the Assyrian Church of the East and the Chaldean Catholic Church. The original form famously contains no explicit Words of Institution; the Catholic Church affirmed its sacramental validity in 2001.",
  },
];

const ANF_VOL_7_NOTE =
  "Translated by James Donaldson. From Ante-Nicene Fathers, Vol. 7, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.";

function buildWork(def: LiturgyDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: def.personId,
    title: def.title,
    shortTitle: def.shortTitle,
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: def.eraLabel,
    summary: def.summary,
    topicSlugs: [],
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: LiturgyDef): SourceRecord {
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — ANF Vol. 7 (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: ANF_VOL_7_NOTE,
    isSeeded: false,
  };
}

function makeChapter(def: LiturgyDef, rawRoot: string): WorkChapter {
  const filePath = join(rawRoot, def.subdir, `${def.naId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);
  return {
    id: `${def.slug}-${def.naId}`,
    workId: def.slug,
    order: 1,
    label: def.shortTitle,
    title: parsed.title || def.title,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${def.slug}-source`,
  };
}

type ParseConfig = {
  // content/raw/liturgy — each liturgy lives in its own subfolder underneath.
  rawRoot: string;
};

export function parseEarlyLiturgies(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of LITURGIES) {
    const provPath = join(
      config.rawRoot,
      def.subdir,
      `provenance_${def.naId}.json`,
    );
    if (!existsSync(provPath)) {
      throw new Error(`Early liturgy provenance file missing: ${provPath}`);
    }
    JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));
    chapters.push(makeChapter(def, config.rawRoot));
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
