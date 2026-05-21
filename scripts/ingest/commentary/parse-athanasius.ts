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
import { buildExcerptFromSections, parseNewAdventPage } from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

// Athanasius is already in src/lib/content/seed/library.ts as
// "athanasius-the-great". The commentary loader merges seed first; emitting a
// duplicate Person here would be ignored. Use the existing seed person id so
// generated works link to the same library card.
const PERSON_ID = "athanasius-the-great";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

// Per-work label strategies. For multi-subpage works, the parenthetical
// extraction used elsewhere doesn't fit Athanasius's title patterns
// ("Discourse 1 Against the Arians", "History of the Arians, Part I", etc.),
// so we name the strategy here and resolve it in deriveLabel().
type LabelStrategy = "parens" | "discourse-n" | "part-n-after-comma" | "full";

type WorkDef = {
  // Four-digit New Advent work id (filename prefix + provenance.work_id).
  naId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
  translators: string;
  labelStrategy?: LabelStrategy;
};

// Editorial summaries grounded in NPNF Series II Vol. 4 introductions and
// the ranking from docs/athanasius-raw-content-integration-plan.md §11–§12.
// Slugs are namespaced under "athanasius-…" to keep them distinct from the
// pre-existing seed work "on-the-incarnation" (anthology-derived stub).
const WORKS: WorkDef[] = [
  {
    naId: "2801",
    slug: "athanasius-against-the-heathen",
    title: "Against the Heathen (Contra Gentes)",
    shortTitle: "Against the Heathen",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 318",
    summary:
      "The first half of Athanasius's apologetic diptych. A philosophical and biblical critique of pagan polytheism that prepares the ground for On the Incarnation.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2802",
    slug: "athanasius-on-the-incarnation",
    title: "On the Incarnation of the Word",
    shortTitle: "On the Incarnation",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 318",
    summary:
      "The foundational Orthodox treatise on the Word made flesh — fifty-seven chapters arguing that the Son of God became human \"that we might be made god,\" restoring the image of God in fallen humanity.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2803",
    slug: "athanasius-deposition-of-arius",
    title: "Deposition of Arius",
    shortTitle: "Deposition of Arius",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 321",
    summary:
      "Synodal document from the Alexandrian council that condemned Arius, preserved within the Athanasian corpus as a primary record of the controversy's earliest documentary phase.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2804",
    slug: "athanasius-letter-on-the-council-of-nicaea",
    title: "Letter on the Council of Nicaea",
    shortTitle: "On Nicaea (Eusebius letter)",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "325",
    summary:
      "Eusebius of Caesarea's letter to his diocese explaining the creed of Nicaea. Included in the NPNF Athanasius volume because of its bearing on the controversy Athanasius would inherit.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2805",
    slug: "athanasius-on-luke-10-22",
    title: "On Luke 10:22 and Matthew 11:27",
    shortTitle: "On Luke 10:22",
    workType: "commentary",
    lengthLabel: "short",
    eraLabel: "c. 350s",
    summary:
      "The only direct Scripture commentary in Athanasius's corpus — five short sections expounding \"All things are delivered to me of my Father\" as a Trinitarian, not subordinationist, declaration.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2806",
    slug: "athanasius-letters",
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 329–373",
    summary:
      "Forty-three festal and doctrinal letters spanning Athanasius's forty-six years as bishop — including the festal letters that announced the date of Pascha to the Egyptian churches.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2807",
    slug: "athanasius-circular-letter",
    title: "Circular Letter",
    shortTitle: "Circular Letter",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 339",
    summary:
      "Encyclical to the wider church reporting an Arian incursion on the see of Alexandria and appealing for solidarity from the bishops abroad.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2808",
    slug: "athanasius-apologia-contra-arianos",
    title: "Apologia Contra Arianos (Defence Against the Arians)",
    shortTitle: "Apologia Contra Arianos",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 350",
    summary:
      "Athanasius's long self-defense against Arian charges, weaving together synodal acts, episcopal letters, and personal narrative to establish the legal and ecclesiastical record of his case.",
    translators: "M. Atkinson and Archibald Robertson",
    labelStrategy: "parens",
  },
  {
    naId: "2809",
    slug: "athanasius-de-decretis",
    title: "De Decretis (Defence of the Nicene Definition)",
    shortTitle: "De Decretis",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 351",
    summary:
      "Defense of the Nicene Creed's controversial term homoousios, arguing that its substance is biblical even though its exact wording is not.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2810",
    slug: "athanasius-de-sententia-dionysii",
    title: "De Sententia Dionysii (On the Opinion of Dionysius)",
    shortTitle: "De Sententia Dionysii",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 350s",
    summary:
      "A defense of Dionysius of Alexandria's third-century orthodoxy against Arian appropriations of his writings on the Son's distinctness from the Father.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2811",
    slug: "athanasius-life-of-anthony",
    title: "Life of St. Anthony",
    shortTitle: "Life of Anthony",
    workType: "life",
    lengthLabel: "long",
    eraLabel: "c. 360",
    summary:
      "The founding text of Christian monastic hagiography — ninety-four episodes from the life of Anthony the Great whose example would draw Augustine, the desert monastics, and the entire monastic tradition.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2812",
    slug: "athanasius-ad-episcopos-aegypti",
    title: "Ad Episcopos Aegypti et Libyae",
    shortTitle: "To the Bishops of Egypt",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "c. 356",
    summary:
      "Pastoral encyclical to the Egyptian and Libyan bishops warning against Arian apologetic strategies and reaffirming the Nicene confession.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2813",
    slug: "athanasius-apologia-ad-constantium",
    title: "Apologia ad Constantium",
    shortTitle: "Apologia ad Constantium",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 357",
    summary:
      "Self-defense addressed to the Emperor Constantius, responding to charges of disloyalty and treating the relationship between bishop and emperor with grave courtesy.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2814",
    slug: "athanasius-apologia-de-fuga",
    title: "Apologia de Fuga (Defence of His Flight)",
    shortTitle: "Apologia de Fuga",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 357",
    summary:
      "Defense of Athanasius's flight from his enemies during the persecutions — biblical precedents from the Patriarchs, Elijah, and Christ himself for withdrawing to preserve the witness.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2815",
    slug: "athanasius-historia-arianorum",
    title: "Historia Arianorum (History of the Arians)",
    shortTitle: "Historia Arianorum",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 358",
    summary:
      "Eight-part historical-polemical narrative of the Arian persecution, addressed to the monks — a primary witness for the church's experience under Constantius II.",
    translators: "M. Atkinson and Archibald Robertson",
    labelStrategy: "part-n-after-comma",
  },
  {
    naId: "2816",
    slug: "athanasius-four-discourses-against-the-arians",
    title: "Four Discourses Against the Arians",
    shortTitle: "Discourses Against the Arians",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 358",
    summary:
      "Four sustained discourses against Arian Christology — the most extensive Trinitarian and Christological argument in Athanasius's corpus, including his celebrated reading of Proverbs 8:22.",
    translators: "John Henry Newman and Archibald Robertson",
    labelStrategy: "discourse-n",
  },
  {
    naId: "2817",
    slug: "athanasius-de-synodis",
    title: "De Synodis (On the Councils of Ariminum and Seleucia)",
    shortTitle: "De Synodis",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 359",
    summary:
      "Synodal history with sustained Trinitarian argument — chronicling the councils called by Constantius and comparing their creeds against the Nicene standard.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2818",
    slug: "athanasius-tomus-ad-antiochenos",
    title: "Tomus ad Antiochenos",
    shortTitle: "Tomus ad Antiochenos",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "362",
    summary:
      "Synodal letter from the Council of Alexandria (362) addressing the Antiochene schism — a remarkable irenic effort to receive returning semi-Arians without compromising the Nicene confession.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2819",
    slug: "athanasius-ad-afros-epistola-synodica",
    title: "Ad Afros Epistola Synodica",
    shortTitle: "Ad Afros",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "c. 369",
    summary:
      "Letter to the African bishops reaffirming the authority of Nicaea against later compromise creeds.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2820",
    slug: "athanasius-historia-acephala",
    title: "Historia Acephala",
    shortTitle: "Historia Acephala",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 365",
    summary:
      "Anonymous \"Headless History\" — a contemporary chronicle of Athanasius's exiles preserved in the manuscripts and edited into NPNF Vol. 4 for its primary-source value.",
    translators: "Archibald Robertson",
  },
  {
    naId: "2821",
    slug: "athanasius-statement-of-faith",
    title: "Statement of Faith",
    shortTitle: "Statement of Faith",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 4th century",
    summary:
      "A concise doctrinal statement — the genuinely Athanasian creed-text, distinct from the later Western Quicunque vult attributed to him by tradition but not by authorship.",
    translators: "Archibald Robertson",
  },
];

const NPNF_VOLUME_LABEL =
  "Nicene and Post-Nicene Fathers, Second Series, Vol. 4 (Schaff & Wace eds., 1892)";

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
    label: `${def.title} — NPNF Second Series, Vol. 4 (Schaff & Wace eds., 1892)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translators}. From ${NPNF_VOLUME_LABEL} (Buffalo, NY: Christian Literature Publishing Co., 1892). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

// Per-work label rules. Most multi-subpage Athanasius titles don't fit the
// parenthetical pattern we use for Augustine and Gregory; pick the right
// shape for each work.
function deriveLabel(
  parsedTitle: string,
  def: WorkDef,
  fallback: string,
): string {
  const strategy = def.labelStrategy ?? "parens";

  if (strategy === "discourse-n") {
    // "Discourse 1 Against the Arians" → "Discourse 1"
    const m = parsedTitle.match(/^(Discourse\s+[IVX\d]+)/i);
    if (m) return m[1];
  }

  if (strategy === "part-n-after-comma") {
    // "History of the Arians, Part I" → "Part I"
    const m = parsedTitle.match(/Part\s+([IVX\d]+)/i);
    if (m) return `Part ${m[1]}`;
  }

  // Default: parenthetical, then full title.
  const paren = parsedTitle.match(/\(([^)]+)\)/);
  if (paren) return paren[1];

  return parsedTitle || fallback;
}

function makeChapter(args: {
  def: WorkDef;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackLabel: string;
  fallbackTitle: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  const label = deriveLabel(parsed.title, args.def, args.fallbackLabel);

  return {
    id: `${args.def.slug}-${args.fileId}`,
    workId: args.def.slug,
    order: args.order,
    label,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${args.def.slug}-source`,
  };
}

type ParseConfig = {
  rawDir: string;
  // Translation prefix for the only direct verse commentary in the corpus
  // (2805 On Luke 10:22 / Matthew 11:27). Verse IDs are built as
  // `${prefix}:${bookSlug}.${chapter}.${verse}` — matches the commentary
  // loader's verseLocationKey() convention.
  verseTranslationPrefix: string;
};

// Build verse-keyed CommentaryEntry rows for 2805 (On Luke 10:22). The
// work's title encodes the two verses Athanasius is exegeting. We emit one
// CommentaryEntry per verse, sharing the same excerpt.
function build2805Entries(
  def: WorkDef,
  chapter: WorkChapter,
  verseTranslationPrefix: string,
): CommentaryEntry[] {
  const excerpt = buildExcerptFromSections(chapter.sections);
  const targets: { bookSlug: string; chapter: number; verse: number }[] = [
    { bookSlug: "luke", chapter: 10, verse: 22 },
    { bookSlug: "matthew", chapter: 11, verse: 27 },
  ];

  return targets.map((t) => ({
    id: `athanasius-${t.bookSlug}-${String(t.chapter).padStart(3, "0")}-v${t.verse}`,
    relation: "verse",
    targetVerseId: `${verseTranslationPrefix}:${t.bookSlug}.${t.chapter}.${t.verse}`,
    topicSlugs: ["incarnation", "theosis"],
    personId: PERSON_ID,
    workId: def.slug,
    title: `On ${t.bookSlug === "luke" ? "Luke" : "Matthew"} ${t.chapter}:${t.verse}`,
    excerpt,
    takeaway: "",
    sourceId: `${def.slug}-source`,
    rank: 80,
    tags: ["athanasius", "patristic", "trinitarian"],
  }));
}

export function parseAthanasius(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Athanasius provenance file missing: ${provPath}`);
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    let workChapters: WorkChapter[];
    if (prov.subpages.length === 0) {
      // Self-contained work — the NNNN.html file IS the body.
      workChapters = [
        makeChapter({
          def,
          rawDir: config.rawDir,
          fileId: def.naId,
          order: 1,
          fallbackLabel: def.shortTitle,
          fallbackTitle: def.title,
        }),
      ];
    } else {
      // Multi-subpage work (2806, 2808, 2815, 2816). Skip the NNNN.html
      // index — it's only a TOC — and parse each subpage in provenance order.
      workChapters = prov.subpages.map((subpageId, idx) =>
        makeChapter({
          def,
          rawDir: config.rawDir,
          fileId: subpageId,
          order: idx + 1,
          fallbackLabel: `${def.shortTitle} ${idx + 1}`,
          fallbackTitle: `${def.title} ${idx + 1}`,
        }),
      );
    }
    chapters.push(...workChapters);

    // 2805 On Luke 10:22 is the only work in this corpus that's exegeting a
    // specific verse. Emit verse-keyed CommentaryEntry rows so it surfaces
    // in the Bible reader's verse drawer for Luke 10:22 and Matt 11:27.
    if (def.naId === "2805" && workChapters[0]) {
      entries.push(
        ...build2805Entries(def, workChapters[0], config.verseTranslationPrefix),
      );
    }
  }

  return {
    version: "2",
    people: [],
    works,
    sources,
    entries,
    chapters,
  };
}
