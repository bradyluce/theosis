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

const ORDERS_PERSON_ID = "early-church-orders";
const SYRIAC_PERSON_ID = "syriac-and-late-documents";

type WorkDef = {
  naId: string;
  personId: string;
  rawSubdir: string; // sub-folder under content/raw/reference/
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  topicSlugs: string[];
  // Optional decoder for sub-page IDs → human labels (used by Apostolic Constitutions)
  labelFromSubpage?: (subpageId: string, idx: number) => string;
};

// ── Apostolic Constitutions: Book I–VIII ────────────────────────────────────
const APOSTOLIC_CONSTITUTIONS_LABELS: Record<string, string> = {
  "07151": "Book I — On the Laity",
  "07152": "Book II — On Bishops, Presbyters, and Deacons",
  "07153": "Book III — On Widows",
  "07154": "Book IV — On Orphans",
  "07155": "Book V — On Martyrs",
  "07156": "Book VI — On Schisms",
  "07157": "Book VII — Discipline and Liturgy",
  "07158": "Book VIII — Clementine Liturgy & 85 Apostolic Canons",
};

const WORKS: WorkDef[] = [
  // ── Didache ──────────────────────────────────────────────────────────────
  {
    naId: "0714",
    personId: ORDERS_PERSON_ID,
    rawSubdir: "didache",
    slug: "didache",
    title: "The Didache (Teaching of the Twelve Apostles)",
    shortTitle: "Didache",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "late 1st – early 2nd century",
    summary:
      "The earliest extant Christian church order. 16 short chapters covering the Two Ways moral catechesis (chs. 1-6), baptism (immersion preferred; effusion permitted, ch. 7), fasting and prayer with the Lord's Prayer thrice daily (ch. 8), the earliest extant Eucharistic prayers (chs. 9-10), the testing of itinerant prophets and teachers (chs. 11-13), bishops and deacons (ch. 15), and an apocalyptic conclusion (ch. 16). Cited as authoritative by Eusebius and Athanasius but lost from the late patristic period until its rediscovery in 1873 by Metropolitan Philotheos Bryennios in the Codex Hierosolymitanus.",
    topicSlugs: ["church-orders", "early-liturgy", "catechesis"],
  },
  // ── Apostolic Constitutions ──────────────────────────────────────────────
  {
    naId: "0715",
    personId: ORDERS_PERSON_ID,
    rawSubdir: "apostolic-constitutions",
    slug: "apostolic-constitutions",
    title: "Apostolic Constitutions",
    shortTitle: "Apostolic Constitutions",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 380–400",
    summary:
      "The largest extant pre-medieval Christian church order, in eight books. Pseudonymously attributed to the apostles via Clement of Rome but actually composed in Syria around 380. Book I deals with the laity, II with the clergy, III–VI with discipline, sacraments, and the persecution-era church. Book VII contains the catechumenate and baptismal rite; Book VIII contains the Clementine Liturgy and the 85 Apostolic Canons — the latter is foundational for Orthodox canon law and remains in force.",
    topicSlugs: ["church-orders", "early-liturgy", "canon-law"],
    labelFromSubpage: (subpageId) =>
      APOSTOLIC_CONSTITUTIONS_LABELS[subpageId] ?? subpageId,
  },
  // ── Miscellaneous Syriac & Late Documents ────────────────────────────────
  {
    naId: "0850",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-remains-second-third-centuries",
    title: "Remains of the Second and Third Centuries",
    shortTitle: "Remains 2nd–3rd c.",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "2nd–3rd century",
    summary:
      "Miscellaneous patristic fragments from the second and third centuries collected in the Ante-Nicene Fathers — short surviving pieces by writers whose larger works are lost.",
    topicSlugs: ["patristic-fragments"],
  },
  {
    naId: "0852",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-extracts-abgar",
    title: "Extracts Concerning Abgar the King",
    shortTitle: "Extracts on Abgar",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th – 5th century",
    summary:
      "Syriac extracts on the legendary correspondence between Abgar V of Edessa and Jesus — the foundation of the Abgar tradition, important for Edessene apostolic self-understanding.",
    topicSlugs: ["syriac-christianity", "edessene-tradition"],
  },
  {
    naId: "0853",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-doctrine-addai",
    title: "The Doctrine of Addai",
    shortTitle: "Doctrine of Addai",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "Syriac, late 4th century",
    summary:
      "The foundational legend of Syriac Christianity. Addai (Thaddeus, one of the Seventy) is sent to King Abgar V of Edessa in response to Abgar's letter to Jesus; he converts Abgar and his court and establishes the church of Edessa. The text gives a developed Syriac-Christian self-narrative of apostolic origins and includes the legend of the Image of Edessa (the Mandylion).",
    topicSlugs: ["syriac-christianity", "edessene-tradition"],
  },
  {
    naId: "0854",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-teaching-apostles",
    title: "The Teaching of the Apostles (Syriac)",
    shortTitle: "Syriac Teaching of the Apostles",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th century",
    summary:
      "A Syriac church-order document related to the Greek Didache and the Didascalia tradition — narrates the disciples' division of the regions of the world for evangelization and lays down basic disciplinary rules.",
    topicSlugs: ["syriac-christianity", "church-orders"],
  },
  {
    naId: "0855",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-teaching-simon-cephas",
    title: "The Teaching of Simon Cephas in Rome",
    shortTitle: "Teaching of Simon Cephas",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th century",
    summary:
      "Syriac legendary text — Peter's Roman ministry, his confrontation with Simon Magus, and his martyrdom.",
    topicSlugs: ["syriac-christianity"],
  },
  {
    naId: "0856",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-acts-sharbil",
    title: "Acts of Sharbil",
    shortTitle: "Acts of Sharbil",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th century (re: c. 105)",
    summary:
      "Syriac martyrdom narrative — Sharbil, formerly a pagan priest of Edessa, converted by the bishop Barsamya and martyred under Trajan.",
    topicSlugs: ["syriac-christianity", "martyrdom"],
  },
  {
    naId: "0857",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-martyrdom-habib",
    title: "Martyrdom of Habib the Deacon",
    shortTitle: "Martyrdom of Habib",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th century (re: c. 322)",
    summary:
      "Syriac martyrdom narrative — Habib, deacon of Edessa, executed under Licinius. Companion text to Mar Jacob of Sarug's metrical homily on Habib.",
    topicSlugs: ["syriac-christianity", "martyrdom"],
  },
  {
    naId: "0858",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-martyrdom-shamuna-guria-habib",
    title: "Martyrdom of Shamuna, Guria, and Habib",
    shortTitle: "Shamuna, Guria, and Habib",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th century (re: c. 297, 322)",
    summary:
      "Combined Syriac narrative of the three principal Edessene martyrs — Shamuna and Guria under Diocletian (c. 297), Habib under Licinius (c. 322). Source for Mar Jacob of Sarug's metrical homilies on Guria-Shamuna and Habib.",
    topicSlugs: ["syriac-christianity", "martyrdom", "edessene-tradition"],
  },
  {
    naId: "0865",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-martyrdom-barsamya",
    title: "The Martyrdom of Barsamya",
    shortTitle: "Martyrdom of Barsamya",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th century (re: c. 113)",
    summary:
      "Syriac martyrdom narrative of Barsamya, bishop of Edessa who converted Sharbil — paired in the manuscript tradition with the Acts of Sharbil.",
    topicSlugs: ["syriac-christianity", "martyrdom", "edessene-tradition"],
  },
  {
    naId: "0863",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-letter-mara",
    title: "A Letter of Mara, Son of Serapion",
    shortTitle: "Letter of Mara Son of Serapion",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "1st – 3rd century",
    summary:
      "Stoic letter from Mara, a Syrian prisoner of Rome, to his son — one of the earliest non-Christian references to Jesus. Mara cites the executed \"wise king of the Jews\" alongside Socrates and Pythagoras as examples of wise men whose unjust deaths their own peoples were punished for. Important for the study of historical-Jesus testimony alongside Josephus and Tacitus.",
    topicSlugs: ["syriac-christianity", "historical-jesus"],
  },
  {
    naId: "0864",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-ambrose-syriac",
    title: "Ambrose (Syriac)",
    shortTitle: "Pseudo-Ambrose (Syriac)",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "Syriac, 4th – 5th century",
    summary:
      "Pseudonymous Syriac text attributed to Ambrose — not the authentic Ambrose of Milan corpus. A short apologetic piece preserved in the Syriac manuscript tradition.",
    topicSlugs: ["syriac-christianity"],
  },
  {
    naId: "1004",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-barlaam-josaphat",
    title: "The Legend of Barlaam and Josaphat",
    shortTitle: "Barlaam and Josaphat",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "8th century (Greek)",
    summary:
      "A Christianized retelling of the life of the Buddha, traditionally ascribed to John of Damascus. The Indian prince Josaphat (from Sanskrit bodhisattva) is converted to the Christian faith by the desert ascetic Barlaam. The text preserves the Greek text of Aristides's Apology (Ch. 27) — its only complete survival before the Syriac rediscovery of 1878.",
    topicSlugs: ["legend", "byzantine-tradition"],
  },
  {
    naId: "1013",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-scillitan-martyrs",
    title: "Passion of the Scillitan Martyrs",
    shortTitle: "Scillitan Martyrs",
    workType: "life",
    lengthLabel: "short",
    eraLabel: "180",
    summary:
      "The earliest extant Latin Christian martyrdom act — the trial and execution of twelve Christians from Scillium in North Africa on 17 July 180 under the proconsul Saturninus. The surviving acta record their confession of faith in stripped court-style prose, the first such text in Latin literature.",
    topicSlugs: ["martyrdom", "latin-patristics"],
  },
  {
    naId: "0514",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-against-novatian",
    title: "Treatise Against the Heretic Novatian",
    shortTitle: "Against Novatian",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "3rd century",
    summary:
      "Anti-Novatianist polemic preserved with the Cyprianic corpus though of disputed authorship — attacks the Novatianist refusal to readmit lapsed Christians and defends the bishop's authority to bind and loose.",
    topicSlugs: ["latin-patristics", "schism"],
  },
  {
    naId: "0515",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-on-rebaptism",
    title: "Treatise on Re-Baptism",
    shortTitle: "On Re-Baptism",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "3rd century",
    summary:
      "Anonymous 3rd-century Latin tract on the 250s baptismal controversy between Cyprian and Stephen of Rome — argues against Cyprian's position that heretical baptism is invalid and must be repeated for converts entering the Church.",
    topicSlugs: ["latin-patristics", "sacraments"],
  },
  {
    naId: "0835",
    personId: SYRIAC_PERSON_ID,
    rawSubdir: "miscellaneous-syriac",
    slug: "reference-false-decretals",
    title: "The False Decretals (Pseudo-Isidore)",
    shortTitle: "False Decretals (forgery)",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 850",
    summary:
      "**Known forgery.** A 9th-century Frankish collection of forged papal decretals attributed to bishops of Rome from Clement I through Damasus I. Wielded enormous influence on medieval Western canon law before being exposed as fabrications in the 15th–17th centuries. Included in the Ante-Nicene Fathers for the historical-canonical record only; carries no authority in Orthodox tradition.",
    topicSlugs: ["forgeries", "medieval-western-canon-law"],
  },
];

function buildOrdersPerson(workIds: string[]): Person {
  return {
    id: ORDERS_PERSON_ID,
    slug: ORDERS_PERSON_ID,
    name: "Early Church Orders",
    honorific: "",
    kind: "theologian",
    eraLabel: "1st – 4th century",
    summary:
      "A synthetic catalogue grouping the major anonymous and pseudonymous church-order texts — the Didache (the earliest extant Christian church order, c. 100) and the Apostolic Constitutions (the largest pre-medieval church order, c. 380). The Apostolic Constitutions contain the 85 Apostolic Canons which remain foundational for Orthodox canon law.",
    traditions: ["Eastern Orthodox", "Roman Catholic"],
    topicSlugs: ["church-orders", "early-liturgy", "canon-law"],
    featuredWorkIds: workIds,
    feastDayLabel: undefined,
  };
}

function buildSyriacPerson(workIds: string[]): Person {
  return {
    id: SYRIAC_PERSON_ID,
    slug: SYRIAC_PERSON_ID,
    name: "Syriac and Late Documents",
    honorific: "",
    kind: "theologian",
    eraLabel: "1st – 9th century",
    summary:
      "A synthetic catalogue for the Ante-Nicene volume's miscellaneous Syriac and late-antique texts — including the Doctrine of Addai (foundational legend of Syriac Christianity), the Edessene martyrdom narratives (Sharbil, Habib, Shamuna-Guria-Habib, Barsamya), the Letter of Mara Son of Serapion (one of the earliest non-Christian references to Jesus), the Passion of the Scillitan Martyrs (earliest extant Latin martyrdom act), the Legend of Barlaam and Josaphat, and the False Decretals (a known 9th-century forgery preserved for historical-canonical record).",
    traditions: ["Syriac Orthodox", "Eastern Orthodox"],
    topicSlugs: ["syriac-christianity", "martyrdom"],
    featuredWorkIds: workIds,
    feastDayLabel: undefined,
  };
}

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
    topicSlugs: def.topicSlugs,
    sourceId: `${def.slug}-source`,
    verseRefs: [],
  };
}

function buildSource(def: WorkDef): SourceRecord {
  // 0714 (Didache) + 0715 (Apostolic Constitutions) + most 08xx texts are
  // ANF Vol. 7. The 1004 Barlaam, 1013 Scillitan are Vol. 9. The 05xx are
  // appendix to Vol. 5 (Cyprianic appendix).
  const vol = def.naId.startsWith("05")
    ? "Vol. 5 (appendix)"
    : def.naId.startsWith("10")
      ? "Vol. 9 (extra volume)"
      : def.naId.startsWith("0835") || def.naId === "0835"
        ? "Vol. 8"
        : "Vol. 7";
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — Ante-Nicene Fathers, ${vol} (Roberts/Donaldson/Coxe eds., 1886)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `From the Ante-Nicene Fathers series, edited by Alexander Roberts, James Donaldson, and A. Cleveland Coxe (Buffalo, NY: Christian Literature Publishing Co., 1886). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
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
  return {
    id: `${args.workId}-${args.fileId}`,
    workId: args.workId,
    order: args.order,
    label: args.fallbackLabel,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: args.sourceId,
  };
}

type ParseConfig = {
  referenceDir: string;
};

export function parseReferenceWorks(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const ordersWorkIds: string[] = [];
  const syriacWorkIds: string[] = [];

  for (const def of WORKS) {
    const rawDir = join(config.referenceDir, def.rawSubdir);
    const provPath = join(rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      console.warn(`[reference-works] Missing provenance for ${def.naId}`);
      continue;
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;
    works.push(buildWork(def));
    sources.push(buildSource(def));
    if (def.personId === ORDERS_PERSON_ID) ordersWorkIds.push(def.slug);
    else syriacWorkIds.push(def.slug);

    if (prov.subpages.length === 0) {
      chapters.push(
        buildChapter({
          workId: def.slug,
          sourceId: `${def.slug}-source`,
          rawDir,
          fileId: def.naId,
          order: 1,
          fallbackLabel: def.shortTitle,
          fallbackTitle: def.title,
        }),
      );
    } else {
      prov.subpages.forEach((subpageId, idx) => {
        const label =
          def.labelFromSubpage?.(subpageId, idx) ??
          `${def.shortTitle} ${idx + 1}`;
        chapters.push(
          buildChapter({
            workId: def.slug,
            sourceId: `${def.slug}-source`,
            rawDir,
            fileId: subpageId,
            order: idx + 1,
            fallbackLabel: label,
            fallbackTitle: `${def.title} — ${label}`,
          }),
        );
      });
    }
  }

  return {
    version: "2",
    people: [buildOrdersPerson(ordersWorkIds), buildSyriacPerson(syriacWorkIds)],
    works,
    sources,
    entries: [],
    chapters,
  };
}
