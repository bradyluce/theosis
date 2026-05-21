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

// Councils are assemblies, not individuals — the seed library has no
// "Local Councils" Person. Create a synthetic one so the works have somewhere
// to attach on the library card.
const PERSON_ID = "local-councils";

const PERSON: Person = {
  id: PERSON_ID,
  slug: PERSON_ID,
  name: "Local Ecclesiastical Councils",
  honorific: "",
  kind: "father",
  eraLabel: "3rd–7th century",
  summary:
    "Regional synods of the early and medieval Church — assemblies of bishops whose canons shaped Christian discipline, liturgy, and pastoral practice. Where ecumenical councils define dogma for the whole Church, local councils address regional questions; many of their canons were later received as binding by the Orthodox tradition.",
  extendedSummary:
    "Eleven councils are gathered here, from Cyprian's Carthaginian council of 257 on the baptism of heretics through the Quinisext (Trullo) council of 692 — whose 102 canons remain the principal source of Orthodox canonical practice. The collection includes Ancyra (314) and Neocaesarea (315) on the readmission of the lapsed under Diocletian, Gangra (343) against extreme asceticism, Sardica (344) defending Athanasius, Laodicea (390) which preserves the earliest ecclesial enumeration of the biblical canon, the Carthaginian council of 419 with its 138 canons, and Trullo itself, which Rome did not receive — one of the canonical roots of the East-West divergence.",
  traditions: ["Orthodox canon law"],
  topicSlugs: [],
  featuredWorkIds: [],
  feastDayLabel: "Sunday of the Fathers of the First Six Ecumenical Councils",
};

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

type CouncilDef = {
  naId: string;
  slug: string;
  title: string;
  shortTitle: string;
  year: string;
  region: string;
  summary: string;
};

// Ordered chronologically so the library card reads from earliest to latest.
const COUNCILS: CouncilDef[] = [
  {
    naId: "3818",
    slug: "council-carthage-cyprian-257",
    title: "Council of Carthage under Cyprian (257)",
    shortTitle: "Carthage under Cyprian",
    year: "257",
    region: "North Africa",
    summary:
      "Cyprian's council on the baptism of heretics — affirming, against Rome, that those baptized by schismatics must be rebaptized when received into the Church.",
  },
  {
    naId: "3802",
    slug: "council-ancyra-314",
    title: "Council of Ancyra (314)",
    shortTitle: "Ancyra",
    year: "314",
    region: "Asia Minor",
    summary:
      "Post-Diocletianic penitential discipline — canons on the readmission of the lapsed and on clerical conduct, set immediately after the Edict of Milan.",
  },
  {
    naId: "3803",
    slug: "council-neocaesarea-315",
    title: "Council of Neocaesarea (315)",
    shortTitle: "Neocaesarea",
    year: "315",
    region: "Pontus",
    summary:
      "Pontic council on clerical and lay discipline — fifteen short canons that influenced the later Eastern penitential tradition.",
  },
  {
    naId: "3805",
    slug: "council-antioch-341",
    title: "Council of Antioch in Encaeniis (341)",
    shortTitle: "Antioch in Encaeniis",
    year: "341",
    region: "Antioch",
    summary:
      "The \"Dedication\" council at Antioch — canons set during the dedication of Constantine's Golden Church, with Arian-leaning currents in the background.",
  },
  {
    naId: "3804",
    slug: "council-gangra-343",
    title: "Council of Gangra (343)",
    shortTitle: "Gangra",
    year: "343",
    region: "Paphlagonia",
    summary:
      "Council in Paphlagonia condemning the extreme asceticism of Eustathius — affirming the goodness of marriage, of meat, and of ownership of property against gnostic-leaning rigorism.",
  },
  {
    naId: "3815",
    slug: "council-sardica-344",
    title: "Council of Sardica (344)",
    shortTitle: "Sardica",
    year: "344",
    region: "Eastern Europe",
    summary:
      "Western-led council that defended Athanasius during his exile — its canons affirm the right of bishops to appeal to Rome, a text later cited in Western papal-primacy debates.",
  },
  {
    naId: "3809",
    slug: "council-constantinople-382",
    title: "Council of Constantinople (382)",
    shortTitle: "Constantinople (382)",
    year: "382",
    region: "Constantinople",
    summary:
      "Follow-up synod a year after the Second Ecumenical Council — reaffirming its faith and addressing the lingering Antiochene schism.",
  },
  {
    naId: "3806",
    slug: "council-laodicea-390",
    title: "Synod of Laodicea (c. 390)",
    shortTitle: "Laodicea",
    year: "c. 390",
    region: "Asia Minor",
    summary:
      "Sixty canons regulating liturgical practice and the conduct of clergy and laity. Canons 59–60 preserve the earliest extant ecclesial enumeration of the biblical canon.",
  },
  {
    naId: "3817",
    slug: "council-constantinople-nectarius-394",
    title: "Council of Constantinople under Nectarius (394)",
    shortTitle: "Constantinople under Nectarius",
    year: "394",
    region: "Constantinople",
    summary:
      "Synod under Patriarch Nectarius adjudicating a disputed episcopal election — a witness to episcopal-discipline procedure at the end of the fourth century.",
  },
  {
    naId: "3816",
    slug: "council-carthage-419",
    title: "Council of Carthage (419)",
    shortTitle: "Carthage (419)",
    year: "419",
    region: "North Africa",
    summary:
      "One hundred and thirty-eight canons consolidating African ecclesiastical discipline at the end of the Augustinian era — among the most influential pre-Trullan canonical collections.",
  },
  {
    naId: "3814",
    slug: "council-trullo-692",
    title: "Council in Trullo / Quinisext (692)",
    shortTitle: "Trullo / Quinisext",
    year: "692",
    region: "Constantinople",
    summary:
      "One hundred and two canons treated by Orthodoxy as the disciplinary continuation of the Fifth and Sixth Ecumenical Councils — the principal source of distinctively Orthodox canonical practice on married clergy, fasting, iconography, and the Paschal date. Not received by Rome.",
  },
];

const NPNF_VOL_14_NOTE =
  "Translated by Henry Percival. From Nicene and Post-Nicene Fathers, Second Series, Vol. 14, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1900). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.";

function buildWork(def: CouncilDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: PERSON_ID,
    title: def.title,
    shortTitle: def.shortTitle,
    workType: "treatise",
    lengthLabel: def.naId === "3814" || def.naId === "3816" ? "long" : "medium",
    eraLabel: def.year,
    summary: def.summary,
    topicSlugs: [],
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: CouncilDef): SourceRecord {
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — NPNF Second Series, Vol. 14 (Schaff & Wace eds., 1900)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: NPNF_VOL_14_NOTE,
    isSeeded: false,
  };
}

function makeChapter(def: CouncilDef, rawDir: string): WorkChapter {
  const filePath = join(rawDir, `${def.naId}.html`);
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
  rawDir: string;
};

export function parseLocalCouncils(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of COUNCILS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Local council provenance file missing: ${provPath}`);
    }
    JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));
    chapters.push(makeChapter(def, config.rawDir));
  }

  return {
    version: "2",
    people: [PERSON],
    works,
    sources,
    entries: [],
    chapters,
  };
}
