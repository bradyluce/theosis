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

// Gregory of Nyssa is already in src/lib/content/seed/library.ts (id
// "gregory-of-nyssa"). The commentary loader merges seed first; emitting a
// duplicate Person here would be ignored. Keep the bundle to Works + Sources
// + Chapters only.
const PERSON_ID = "gregory-of-nyssa";

type Provenance = {
  schema: string;
  work_id: string;
  title: string;
  subpages: string[];
  source: string;
  source_url: string;
};

type WorkDef = {
  // Four-digit New Advent work id from provenance / filenames (e.g. "2914").
  naId: string;
  slug: string;
  title: string;
  shortTitle: string;
  workType: WorkType;
  lengthLabel: "short" | "medium" | "long";
  eraLabel: string;
  summary: string;
};

// Editorial summaries grounded in NPNF Series II Vol. 5 introductions and the
// ranking from docs/gregory-of-nyssa-raw-content-integration-plan.md §11.
// Slugs are namespaced under "gregory-of-nyssa-…" to match the person's slug
// in seed/library.ts (same convention as the Augustine bundles).
const WORKS: WorkDef[] = [
  {
    naId: "2901",
    slug: "gregory-of-nyssa-against-eunomius",
    title: "Against Eunomius",
    shortTitle: "Against Eunomius",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 380–383",
    summary:
      "Twelve books defending the Nicene confession of the Son's consubstantiality against the Anomoean Eunomius — completing the polemical project begun by Gregory's brother Basil before his death.",
  },
  {
    naId: "2902",
    slug: "gregory-of-nyssa-answer-to-eunomius-second-book",
    title: "Answer to Eunomius' Second Book",
    shortTitle: "Answer to Eunomius II",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 383",
    summary:
      "Companion volume to Against Eunomius, responding section by section to Eunomius's second book; sustained polemic on divine names, generation, and the Son's eternity.",
  },
  {
    naId: "2903",
    slug: "gregory-of-nyssa-on-the-holy-spirit",
    title: "On the Holy Spirit, Against the Macedonians",
    shortTitle: "On the Holy Spirit",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 380s",
    summary:
      "A pneumatological treatise against the Pneumatomachi (Macedonians), defending the full divinity of the Holy Spirit and the unity of the divine activity across the three Persons.",
  },
  {
    naId: "2904",
    slug: "gregory-of-nyssa-on-the-holy-trinity",
    title: "On the Holy Trinity, and of the Godhead of the Holy Spirit",
    shortTitle: "On the Holy Trinity",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 380s",
    summary:
      "A brief letter to Eustathius arguing that the same divine names, operations, and worship are owed to all three Persons of the Trinity.",
  },
  {
    naId: "2905",
    slug: "gregory-of-nyssa-not-three-gods",
    title: "On \"Not Three Gods\"",
    shortTitle: "Not Three Gods",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 380s",
    summary:
      "Famous short treatise addressed to Ablabius arguing that the unity of the divine nature, known through the single divine operation, makes \"three gods\" a category mistake despite three hypostases.",
  },
  {
    naId: "2906",
    slug: "gregory-of-nyssa-on-the-faith",
    title: "On the Faith",
    shortTitle: "On the Faith",
    workType: "treatise",
    lengthLabel: "short",
    eraLabel: "c. 380s",
    summary:
      "A short doctrinal letter to Simplicius restating the orthodox Trinitarian faith.",
  },
  {
    naId: "2907",
    slug: "gregory-of-nyssa-on-virginity",
    title: "On Virginity",
    shortTitle: "On Virginity",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 371",
    summary:
      "Twenty-four chapters on Christian asceticism — Gregory's earliest extant work, framing virginity not as mere physical continence but as the soul's undivided ascent toward likeness with God.",
  },
  {
    naId: "2908",
    slug: "gregory-of-nyssa-great-catechism",
    title: "The Great Catechism",
    shortTitle: "The Great Catechism",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 385",
    summary:
      "A systematic exposition of Christian doctrine — Trinity, creation, fall, Incarnation, atonement, and the sacraments — written as a handbook for catechists addressing pagans, Jews, and heretics.",
  },
  {
    naId: "2909",
    slug: "gregory-of-nyssa-funeral-oration-meletius",
    title: "Funeral Oration on Meletius",
    shortTitle: "Funeral Oration",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "381",
    summary:
      "Eulogy delivered at the Council of Constantinople (381) for Meletius of Antioch — high rhetorical density, mourning a beloved bishop and friend.",
  },
  {
    naId: "2910",
    slug: "gregory-of-nyssa-on-the-baptism-of-christ",
    title: "On the Baptism of Christ",
    shortTitle: "On the Baptism of Christ",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "c. 380s",
    summary:
      "Sermon for the Feast of Lights (Theophany), meditating on the Jordan, sacramental regeneration, and the descent of the Spirit.",
  },
  {
    naId: "2911",
    slug: "gregory-of-nyssa-letters",
    title: "Letters",
    shortTitle: "Letters",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 370s–390s",
    summary:
      "Eighteen festal and pastoral letters — including the famous letter on pilgrimages, the canonical letter to Letoius, and correspondence with fellow Cappadocians.",
  },
  {
    naId: "2912",
    slug: "gregory-of-nyssa-on-infants-early-deaths",
    title: "On Infants' Early Deaths",
    shortTitle: "On Infants' Early Deaths",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 380s",
    summary:
      "A treatise wrestling with theodicy and the eschatological fate of children who die before knowing virtue — addressed to Hierius, prefect of Cappadocia.",
  },
  {
    naId: "2913",
    slug: "gregory-of-nyssa-on-pilgrimages",
    title: "On Pilgrimages",
    shortTitle: "On Pilgrimages",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 380s",
    summary:
      "A short pastoral letter arguing that geographical pilgrimage to the Holy Land confers no special grace; the kingdom of God is approached by interior renewal, not travel.",
  },
  {
    naId: "2914",
    slug: "gregory-of-nyssa-on-the-making-of-man",
    title: "On the Making of Man",
    shortTitle: "On the Making of Man",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "379",
    summary:
      "Thirty chapters on Christian anthropology, completing the Hexaemeron of Gregory's brother Basil — meditating on the image of God, the resurrection body, and the soul's destiny.",
  },
  {
    naId: "2915",
    slug: "gregory-of-nyssa-on-the-soul-and-the-resurrection",
    title: "On the Soul and the Resurrection",
    shortTitle: "On the Soul and the Resurrection",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 380",
    summary:
      "A dialogue with Gregory's dying sister Macrina the Younger on the nature of the soul, the passions, and the final restoration — foundational for Orthodox eschatology.",
  },
];

// All Gregory of Nyssa works in the New Advent corpus share the same source
// edition; the only per-work differences are URL and translator attribution.
const SHARED_TRANSLATORS = "W. Moore, H.A. Wilson, and H.C. Ogle";

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
    label: `${def.title} — NPNF Second Series, Vol. 5 (Schaff & Wace eds., 1893)`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${SHARED_TRANSLATORS}. From Nicene and Post-Nicene Fathers, Second Series, Vol. 5, edited by Philip Schaff and Henry Wace (Buffalo, NY: Christian Literature Publishing Co., 1893). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

// Build one WorkChapter from one HTML file. For multi-subpage works (2901,
// 2911) this is called once per subpage; for self-contained works it's called
// once on the NNNN.html itself, and the file's internal <h2> headings become
// the chapter's sections via parseNewAdventPage.
function makeChapter(args: {
  workId: string;
  sourceId: string;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackLabel: string;
  fallbackTitle: string;
}): WorkChapter {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const html = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(html, filePath);

  // Subpage titles like "Against Eunomius (Book I)" → label = "Book I".
  // "Letter 1" → label = "Letter 1". Self-contained "On the Making of Man" →
  // label falls back to the work's short title since the parenthetical
  // pattern doesn't match.
  const parenMatch = parsed.title.match(/\(([^)]+)\)/);
  const label = parenMatch
    ? parenMatch[1]
    : parsed.title || args.fallbackLabel;

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

export function parseGregoryNyssa(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(
        `Gregory of Nyssa provenance file missing: ${provPath}`,
      );
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    if (prov.subpages.length === 0) {
      // Self-contained work — the NNNN.html file IS the body. Internal <h2>
      // chapters (e.g. "I. Wherein is a partial inquiry…" in On the Making
      // of Man) become sections on the single WorkChapter.
      chapters.push(
        makeChapter({
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
      // Multi-subpage work (2901 Against Eunomius, 2911 Letters). The
      // NNNN.html index page is just a TOC; skip it and parse each subpage.
      prov.subpages.forEach((subpageId, idx) => {
        chapters.push(
          makeChapter({
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
    people: [],
    works,
    sources,
    entries: [],
    chapters,
  };
}
