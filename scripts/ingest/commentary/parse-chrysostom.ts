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
import {
  buildExcerptFromSections,
  parseNewAdventPage,
} from "./new-advent-html";

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

// Chrysostom is already in src/lib/content/seed/library.ts as
// "john-chrysostom". The commentary loader merges seed first; emitting a
// duplicate Person here would be ignored. Reuse the seed person id.
const PERSON_ID = "john-chrysostom";

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
  npnfVolume: 9 | 10 | 11 | 12 | 13 | 14;
  translators: string;
  // Optional: if set, head-verse extraction runs against this work's homilies
  // and emits verse-keyed CommentaryEntry rows under this book slug.
  // (The extractor already detects the book from the bible href / h2 text;
  // this flag just gates verse-keying to the 17 NT commentary series.)
  ntCommentary?: boolean;
};

// Editorial summaries grounded in the NPNF First Series intros and the
// ranking from docs/chrysostom-raw-content-integration-plan.md §11–§12.
// Slugs are namespaced under "chrysostom-…" to coexist with the existing
// seed work "homilies-on-john" (a small anthology stub).
const WORKS: WorkDef[] = [
  // ── NPNF Vol. 9 — Priesthood, Statues, occasional sermons ──────────────────
  {
    naId: "1901",
    slug: "chrysostom-homilies-on-the-statues",
    title: "Homilies on the Statues (Ad Populum Antiochenum)",
    shortTitle: "Homilies on the Statues",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "387",
    summary:
      "Twenty-one homilies preached during the Antioch riot of 387, when the city had defaced imperial statues and feared retribution from Theodosius. Chrysostom's pastoral preaching at its most urgent — a window into Christian conduct under civic crisis.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1902",
    slug: "chrysostom-no-one-can-harm",
    title: "No One Can Harm the Man Who Does Not Injure Himself",
    shortTitle: "No One Can Harm",
    workType: "treatise",
    lengthLabel: "medium",
    eraLabel: "c. 406",
    summary:
      "Ethical treatise written from exile, arguing that the soul's freedom belongs to the one who keeps its inner peace — no external loss can wound a person who does not consent to be wounded.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1903",
    slug: "chrysostom-letters-to-theodore",
    title: "Two Letters to Theodore After His Fall",
    shortTitle: "Letters to Theodore",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "c. 369",
    summary:
      "Two pastoral letters urging Chrysostom's friend Theodore back from a fall into worldly life — written when both men were young monastics, before Chrysostom's ordination.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1904",
    slug: "chrysostom-letter-to-a-young-widow",
    title: "Letter to a Young Widow",
    shortTitle: "Letter to a Young Widow",
    workType: "letter",
    lengthLabel: "medium",
    eraLabel: "c. 380",
    summary:
      "Pastoral letter consoling a young widow and counseling her against remarriage — a window into the early Christian theology of widowhood as a vocation.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1905",
    slug: "chrysostom-homily-on-ignatius",
    title: "Homily on St. Ignatius",
    shortTitle: "Homily on St. Ignatius",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "c. 386",
    summary:
      "Panegyric preached on the feast day of Ignatius of Antioch, the second-century martyr-bishop whose epistles shaped early ecclesiology.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1906",
    slug: "chrysostom-homily-on-babylas",
    title: "Homily on St. Babylas",
    shortTitle: "Homily on St. Babylas",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "c. 382",
    summary:
      "Panegyric for Babylas, third-century bishop of Antioch and martyr, defending the cult of relics against the emperor Julian.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1907",
    slug: "chrysostom-on-lowliness-of-mind",
    title: "Homily Concerning Lowliness of Mind",
    shortTitle: "On Lowliness of Mind",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 388",
    summary:
      "Sermon on humility as the foundation of the Christian life, framed around Paul's Philippians 2 hymn to the kenosis of Christ.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1908",
    slug: "chrysostom-instructions-to-catechumens",
    title: "Instructions to Catechumens",
    shortTitle: "Instructions to Catechumens",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 387–390",
    summary:
      "Pre-baptismal catechetical homilies — an indispensable witness to the early Christian process of preparing adult converts for baptism at the Paschal vigil.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1910",
    slug: "chrysostom-on-father-if-it-be-possible",
    title: "Homily on \"Father, if it be possible…\"",
    shortTitle: "On Matt 26:39",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 388",
    summary:
      "Christological sermon on the Gethsemane prayer (Matthew 26:39), reading Christ's plea \"let this cup pass from me\" as evidence of the genuine humanity of the Word — not a weakness in the Godhead.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1911",
    slug: "chrysostom-on-the-paralytic",
    title: "Homily on the Paralytic Lowered Through the Roof",
    shortTitle: "On the Paralytic",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 388",
    summary:
      "Sermon on the healing of the paralytic (Mark 2:1–12 / Luke 5:17–26), focusing on the bond of friendship and faith that brought him to Christ.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1912",
    slug: "chrysostom-on-feed-your-enemy",
    title: "Homily on \"If your enemy hunger, feed him\"",
    shortTitle: "On Romans 12:20",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 388",
    summary:
      "Sermon on Romans 12:20 — the practical theology of returning good for evil as the heaping of coals on the enemy's head, read as the kindling of repentance, not vengeance.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1913",
    slug: "chrysostom-against-publishing-errors",
    title: "Homily Against Publishing the Errors of the Brethren",
    shortTitle: "Against Publishing Errors",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "c. 388",
    summary:
      "Sermon against the public exposure of fellow Christians' sins — counseling instead the patience of fraternal correction.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1914",
    slug: "chrysostom-first-homily-on-eutropius",
    title: "First Homily on Eutropius",
    shortTitle: "First Homily on Eutropius",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "399",
    summary:
      "Sermon preached when the imperial eunuch Eutropius — having fallen from power — took refuge at the altar of Hagia Sophia. Chrysostom interceded for his protection from the very emperor he had served.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1915",
    slug: "chrysostom-second-homily-on-eutropius",
    title: "Second Homily on Eutropius",
    shortTitle: "Second Homily on Eutropius",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "399",
    summary:
      "The famous \"vanity of vanities\" sermon delivered after Eutropius's fall — a sustained meditation on the impermanence of worldly power, preached over the head of the trembling minister still clinging to the altar.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1916",
    slug: "chrysostom-letters-to-olympias",
    title: "Four Letters to Olympias",
    shortTitle: "Letters to Olympias",
    workType: "letter",
    lengthLabel: "long",
    eraLabel: "404–407",
    summary:
      "Pastoral letters from exile to the deaconess Olympias of Constantinople, his closest friend and defender. Among the most personally revealing of Chrysostom's writings — meditations on providence, suffering, and the patience of saints.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1917",
    slug: "chrysostom-letter-to-priests-of-antioch",
    title: "Letter to Some Priests of Antioch",
    shortTitle: "Letter to Antioch Priests",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "c. 405",
    summary:
      "Brief pastoral letter from exile to clergy of the church he had served as presbyter before being summoned to Constantinople.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1918",
    slug: "chrysostom-correspondence-with-innocent",
    title: "Correspondence with Pope Innocent I",
    shortTitle: "Letters to Pope Innocent",
    workType: "letter",
    lengthLabel: "short",
    eraLabel: "404–407",
    summary:
      "Letters between Chrysostom in exile and Pope Innocent I of Rome — Rome's defense of Chrysostom against the Eastern synodal proceedings that deposed him.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1919",
    slug: "chrysostom-on-the-power-of-satan",
    title: "Three Homilies on the Power of Satan (Adversus Daemones)",
    shortTitle: "On the Power of Satan",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 388",
    summary:
      "Three sermons on spiritual warfare and the divine permission that bounds the activity of demons — including reflections on the trial of Job.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },
  {
    naId: "1922",
    slug: "chrysostom-on-the-priesthood",
    title: "On the Priesthood (De Sacerdotio)",
    shortTitle: "On the Priesthood",
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: "c. 386",
    summary:
      "Six books in dialogue with his friend Basil (not the Cappadocian) on the gravity, dignity, and danger of the priestly office. The foundational Christian treatise on ministry and the work that shaped Eastern thinking about the priesthood for centuries.",
    npnfVolume: 9,
    translators: "W.R.W. Stephens",
  },

  // ── NPNF Vol. 10 — Matthew ──────────────────────────────────────────────────
  {
    naId: "2001",
    slug: "chrysostom-homilies-on-matthew",
    title: "Homilies on the Gospel of Matthew",
    shortTitle: "Homilies on Matthew",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 390",
    summary:
      "Ninety homilies on Matthew preached at Antioch — verse by verse from the genealogy through the Passion. The longest and most influential patristic commentary on the First Gospel.",
    npnfVolume: 10,
    translators: "George Prevost, revised by M.B. Riddle",
    ntCommentary: true,
  },

  // ── NPNF Vol. 11 — Acts and Romans ─────────────────────────────────────────
  {
    naId: "2101",
    slug: "chrysostom-homilies-on-acts",
    title: "Homilies on the Acts of the Apostles",
    shortTitle: "Homilies on Acts",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 400",
    summary:
      "Fifty-five homilies preached at Constantinople through the Book of Acts — the only patristic verse-by-verse Acts commentary of this scope.",
    npnfVolume: 11,
    translators: "J. Walker, J. Sheppard, and H. Browne, revised by George B. Stevens",
    ntCommentary: true,
  },
  {
    naId: "2102",
    slug: "chrysostom-homilies-on-romans",
    title: "Homilies on the Epistle to the Romans",
    shortTitle: "Homilies on Romans",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 391",
    summary:
      "Thirty-two homilies on Paul's longest letter — Chrysostom's most theologically sustained Pauline commentary, indispensable for Orthodox readings of justification, grace, and the moral life.",
    npnfVolume: 11,
    translators: "J.B. Morris and W.H. Simcox, revised by George B. Stevens",
    ntCommentary: true,
  },

  // ── NPNF Vol. 12 — 1 & 2 Corinthians ────────────────────────────────────────
  {
    naId: "2201",
    slug: "chrysostom-homilies-on-first-corinthians",
    title: "Homilies on the First Epistle to the Corinthians",
    shortTitle: "Homilies on 1 Corinthians",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 392",
    summary:
      "Forty-four homilies on 1 Corinthians — pastoral application of Paul's letter to the moral and ecclesial life of Antioch.",
    npnfVolume: 12,
    translators: "Talbot W. Chambers",
    ntCommentary: true,
  },
  {
    naId: "2202",
    slug: "chrysostom-homilies-on-second-corinthians",
    title: "Homilies on the Second Epistle to the Corinthians",
    shortTitle: "Homilies on 2 Corinthians",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 392",
    summary:
      "Thirty homilies on 2 Corinthians — Chrysostom's reading of Paul's most personal letter, with sustained attention to the ministry of reconciliation.",
    npnfVolume: 12,
    translators: "Talbot W. Chambers",
    ntCommentary: true,
  },

  // ── NPNF Vol. 13 — Pauline epistles (Galatians through Philemon) ───────────
  {
    naId: "2301",
    slug: "chrysostom-homilies-on-ephesians",
    title: "Homilies on the Epistle to the Ephesians",
    shortTitle: "Homilies on Ephesians",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 393",
    summary:
      "Twenty-four homilies on Ephesians — major patristic source for Christology, ecclesiology, and the theology of Christian marriage in Ephesians 5.",
    npnfVolume: 13,
    translators: "Gross Alexander",
    ntCommentary: true,
  },
  {
    naId: "2302",
    slug: "chrysostom-homilies-on-philippians",
    title: "Homilies on the Epistle to the Philippians",
    shortTitle: "Homilies on Philippians",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 399",
    summary:
      "Fifteen homilies on Philippians, including extensive treatment of the Christ-hymn of Philippians 2 (\"who, being in the form of God\").",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2303",
    slug: "chrysostom-homilies-on-colossians",
    title: "Homilies on the Epistle to the Colossians",
    shortTitle: "Homilies on Colossians",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 399",
    summary:
      "Twelve homilies on Colossians — Christological exposition of Paul's reading of \"in him all things hold together.\"",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2304",
    slug: "chrysostom-homilies-on-first-thessalonians",
    title: "Homilies on the First Epistle to the Thessalonians",
    shortTitle: "Homilies on 1 Thessalonians",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 399",
    summary:
      "Eleven homilies on 1 Thessalonians — sustained patristic exposition of the Parousia and the resurrection of the dead.",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2305",
    slug: "chrysostom-homilies-on-second-thessalonians",
    title: "Homilies on the Second Epistle to the Thessalonians",
    shortTitle: "Homilies on 2 Thessalonians",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 399",
    summary:
      "Five homilies on 2 Thessalonians — Chrysostom's reading of the \"man of lawlessness\" and the meaning of the restrainer.",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2306",
    slug: "chrysostom-homilies-on-first-timothy",
    title: "Homilies on the First Epistle to Timothy",
    shortTitle: "Homilies on 1 Timothy",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 399",
    summary:
      "Eighteen homilies on 1 Timothy — pastoral epistles read by a working pastor, with sustained attention to the qualifications of bishops and the order of the church.",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2307",
    slug: "chrysostom-homilies-on-second-timothy",
    title: "Homilies on the Second Epistle to Timothy",
    shortTitle: "Homilies on 2 Timothy",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 399",
    summary:
      "Ten homilies on 2 Timothy — Paul's farewell letter read with pastoral urgency.",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2308",
    slug: "chrysostom-homilies-on-titus",
    title: "Homilies on the Epistle to Titus",
    shortTitle: "Homilies on Titus",
    workType: "homily",
    lengthLabel: "medium",
    eraLabel: "c. 399",
    summary:
      "Six homilies on Titus — the third pastoral epistle.",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2309",
    slug: "chrysostom-homilies-on-philemon",
    title: "Homilies on the Epistle to Philemon",
    shortTitle: "Homilies on Philemon",
    workType: "homily",
    lengthLabel: "short",
    eraLabel: "c. 399",
    summary:
      "Three homilies plus an introduction on Paul's shortest letter — a remarkable patristic reading of the social ethic of fraternal restoration.",
    npnfVolume: 13,
    translators: "John A. Broadus",
    ntCommentary: true,
  },
  {
    naId: "2310",
    slug: "chrysostom-commentary-on-galatians",
    title: "Commentary on Galatians",
    shortTitle: "Commentary on Galatians",
    workType: "commentary",
    lengthLabel: "medium",
    eraLabel: "c. 393",
    summary:
      "Chapter-by-chapter commentary through Galatians — the major patristic exposition of justification, the law, and the inheritance of Abraham.",
    npnfVolume: 13,
    translators: "Gross Alexander",
    ntCommentary: true,
  },

  // ── NPNF Vol. 14 — John and Hebrews ────────────────────────────────────────
  {
    naId: "2401",
    slug: "chrysostom-homilies-on-john",
    title: "Homilies on the Gospel of John",
    shortTitle: "Homilies on John",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 391",
    summary:
      "Eighty-eight homilies on the Fourth Gospel — Chrysostom's most theologically dense Gospel series, sustained exegesis of John's Christology, the bread of life discourse, and the farewell prayers.",
    npnfVolume: 14,
    translators: "Charles Marriott",
    ntCommentary: true,
  },
  {
    naId: "2402",
    slug: "chrysostom-homilies-on-hebrews",
    title: "Homilies on the Epistle to the Hebrews",
    shortTitle: "Homilies on Hebrews",
    workType: "homily",
    lengthLabel: "long",
    eraLabel: "c. 403",
    summary:
      "Thirty-four homilies on Hebrews — the most extensive patristic commentary on the priestly Christology of the Epistle, read with the experience of having served the altar.",
    npnfVolume: 14,
    translators: "T. Keble (compiler), revised by Frederic Gardiner",
    ntCommentary: true,
  },
];

const NPNF_YEARS: Record<number, number> = {
  9: 1889,
  10: 1888,
  11: 1889,
  12: 1889,
  13: 1889,
  14: 1889,
};

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
  const year = NPNF_YEARS[def.npnfVolume];
  return {
    id: `${def.slug}-source`,
    label: `${def.title} — NPNF First Series, Vol. ${def.npnfVolume} (Schaff ed., ${year})`,
    collection: "New Advent (newadvent.org/fathers)",
    sourceType: "web-collection",
    url: `https://www.newadvent.org/fathers/${def.naId}.htm`,
    note: `Translated by ${def.translators}. From Nicene and Post-Nicene Fathers, First Series, Vol. ${def.npnfVolume}, edited by Philip Schaff (Buffalo, NY: Christian Literature Publishing Co., ${year}). Revised and edited for New Advent by Kevin Knight. Translation public domain; transcription © New Advent LLC.`,
    isSeeded: false,
  };
}

// ── Label derivation ────────────────────────────────────────────────────────

// Pull "Homily N", "Chapter N", "Book N", "Letter N" prefix off a parsed title;
// fall back to a parenthetical; fall back to the full title.
function deriveLabel(parsedTitle: string, fallback: string): string {
  const prefixMatch = parsedTitle.match(
    /^(Homily|Chapter|Book|Letter|Discourse|Part|Treatise)\s+([IVX\d]+)/i,
  );
  if (prefixMatch) {
    const word = prefixMatch[1];
    const normalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return `${normalized} ${prefixMatch[2]}`;
  }
  const paren = parsedTitle.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  return parsedTitle || fallback;
}

// ── Head-verse extraction ───────────────────────────────────────────────────

// Map New Advent 3-char book codes to Theosis book slugs. NT only — head-verse
// extraction is gated to NT commentary works (ntCommentary: true above).
const NA_BOOK_CODE_TO_SLUG: Record<string, string> = {
  mat: "matthew",
  mar: "mark",
  luk: "luke",
  joh: "john",
  act: "acts",
  rom: "romans",
  "1co": "first-corinthians",
  "2co": "second-corinthians",
  gal: "galatians",
  eph: "ephesians",
  phi: "philippians",
  col: "colossians",
  "1th": "first-thessalonians",
  "2th": "second-thessalonians",
  "1ti": "first-timothy",
  "2ti": "second-timothy",
  tit: "titus",
  phm: "philemon",
  heb: "hebrews",
};

// Map pretty book names (used in the <h2>Book Ch:V</h2> epigraph in John and
// 1/2 Corinthians) to the same Theosis slugs.
const BOOK_NAME_TO_SLUG: Record<string, string> = {
  matthew: "matthew",
  mark: "mark",
  luke: "luke",
  john: "john",
  acts: "acts",
  romans: "romans",
  "1 corinthians": "first-corinthians",
  "first corinthians": "first-corinthians",
  "2 corinthians": "second-corinthians",
  "second corinthians": "second-corinthians",
  galatians: "galatians",
  ephesians: "ephesians",
  philippians: "philippians",
  colossians: "colossians",
  "1 thessalonians": "first-thessalonians",
  "first thessalonians": "first-thessalonians",
  "2 thessalonians": "second-thessalonians",
  "second thessalonians": "second-thessalonians",
  "1 timothy": "first-timothy",
  "first timothy": "first-timothy",
  "2 timothy": "second-timothy",
  "second timothy": "second-timothy",
  titus: "titus",
  philemon: "philemon",
  hebrews: "hebrews",
};

type HeadVerse = {
  bookSlug: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

// Pull the head-verse epigraph out of the raw HTML. Chrysostom's NT-commentary
// homilies open with either:
//   (A) <p>...<a href="../bible/<code><chap>.htm[#verse<N>]">DISPLAY</a>...</p>
//       — Galatians, Matthew, Acts, Ephesians, Statues style
//   (B) <h2>{BookName} {Ch}:{V}[-{V2}]</h2>
//       — John, 1/2 Corinthians style
// We scan the window between </h1> and the first numbered paragraph <p>N. and
// take the first match. stiki spans (inline citations) are explicitly skipped.
function extractHeadVerse(rawHtml: string): HeadVerse | null {
  const springfieldStart = rawHtml.indexOf('<div id="springfield2">');
  if (springfieldStart === -1) return null;
  const h1End = rawHtml.indexOf("</h1>", springfieldStart);
  if (h1End === -1) return null;

  // Scan window: from </h1> to the first numbered paragraph <p>N. (or to
  // <div class="pub"> if there's no numbered paragraph in the homily — e.g.
  // when the epigraph immediately precedes the citation block).
  const afterH1 = rawHtml.slice(h1End);
  const numParaMatch = afterH1.match(/<p[^>]*>\s*\d+\.\s/);
  const pubMatch = afterH1.match(/<div class="pub"/);
  const cutoff = Math.min(
    numParaMatch ? numParaMatch.index ?? afterH1.length : afterH1.length,
    pubMatch ? pubMatch.index ?? afterH1.length : afterH1.length,
  );
  const window = afterH1.slice(0, cutoff);

  // Pattern A — bible href epigraph.
  const aRegex =
    /<a\s+href="\.\.\/bible\/([a-z0-9]{1,3})(\d{3})\.htm(?:#verse(\d+))?"\s*>([^<]*)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRegex.exec(window)) !== null) {
    // Skip if wrapped in <span class="stiki"> (inline citation, not epigraph).
    // Look 60 chars back for an unclosed stiki opening tag.
    const before = window.slice(Math.max(0, m.index - 60), m.index);
    if (/<span[^>]*class="[^"]*stiki[^"]*"[^>]*>\s*$/i.test(before)) continue;

    const code = m[1].toLowerCase();
    const bookSlug = NA_BOOK_CODE_TO_SLUG[code];
    if (!bookSlug) continue;
    const chapter = Number(m[2]);
    const anchorVerse = m[3] ? Number(m[3]) : undefined;
    const display = m[4] ?? "";

    // Try a range in the display text first ("Verse 1-3", "Chapter I. Verses 11-14", "1 Timothy 5:23-25").
    const rangeMatch = display.match(/(\d+)\s*[-–]\s*(\d+)\s*$/);
    if (rangeMatch) {
      return {
        bookSlug,
        chapter,
        verseStart: Number(rangeMatch[1]),
        verseEnd: Number(rangeMatch[2]),
      };
    }
    // Fall back to the anchor verse (#verseN) if present.
    if (anchorVerse !== undefined) {
      return { bookSlug, chapter, verseStart: anchorVerse, verseEnd: anchorVerse };
    }
    // Last resort — take a trailing single verse from the display text.
    const trailingDigit = display.match(/(\d+)\s*\.?\s*$/);
    if (trailingDigit) {
      const v = Number(trailingDigit[1]);
      return { bookSlug, chapter, verseStart: v, verseEnd: v };
    }
  }

  // Pattern B — h2 text epigraph.
  const h2Regex = /<h2>([^<]+)<\/h2>/gi;
  while ((m = h2Regex.exec(window)) !== null) {
    const text = m[1].trim();
    // e.g. "John 1:1", "1 Corinthians 1:4-5", "2 Thessalonians 2:6"
    const refMatch = text.match(
      /^([12]?\s*[A-Z][A-Za-z]+(?:\s+[A-Z][a-z]+)?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?$/,
    );
    if (!refMatch) continue;
    const bookName = refMatch[1].trim().toLowerCase().replace(/\s+/g, " ");
    const bookSlug = BOOK_NAME_TO_SLUG[bookName];
    if (!bookSlug) continue;
    const verseStart = Number(refMatch[3]);
    const verseEnd = refMatch[4] ? Number(refMatch[4]) : verseStart;
    return {
      bookSlug,
      chapter: Number(refMatch[2]),
      verseStart,
      verseEnd,
    };
  }

  return null;
}

// ── Per-file parsing ────────────────────────────────────────────────────────

function makeChapter(args: {
  def: WorkDef;
  rawDir: string;
  fileId: string;
  order: number;
  fallbackLabel: string;
  fallbackTitle: string;
}): { chapter: WorkChapter; headVerse: HeadVerse | null; excerpt: string } {
  const filePath = join(args.rawDir, `${args.fileId}.html`);
  const rawHtml = readFileSync(filePath, "utf8");
  const parsed = parseNewAdventPage(rawHtml, filePath);
  const label = deriveLabel(parsed.title, args.fallbackLabel);
  const headVerse = args.def.ntCommentary ? extractHeadVerse(rawHtml) : null;
  const chapter: WorkChapter = {
    id: `${args.def.slug}-${args.fileId}`,
    workId: args.def.slug,
    order: args.order,
    label,
    title: parsed.title || args.fallbackTitle,
    summary: parsed.summary,
    sections: parsed.sections,
    sourceId: `${args.def.slug}-source`,
  };
  return {
    chapter,
    headVerse,
    excerpt: buildExcerptFromSections(parsed.sections),
  };
}

// Display name (proper Title Case) for each NT book slug. Used in
// CommentaryEntry titles like "On 1 Corinthians 1:4–5".
const SLUG_TO_DISPLAY_NAME: Record<string, string> = {
  matthew: "Matthew",
  mark: "Mark",
  luke: "Luke",
  john: "John",
  acts: "Acts",
  romans: "Romans",
  "first-corinthians": "1 Corinthians",
  "second-corinthians": "2 Corinthians",
  galatians: "Galatians",
  ephesians: "Ephesians",
  philippians: "Philippians",
  colossians: "Colossians",
  "first-thessalonians": "1 Thessalonians",
  "second-thessalonians": "2 Thessalonians",
  "first-timothy": "1 Timothy",
  "second-timothy": "2 Timothy",
  titus: "Titus",
  philemon: "Philemon",
  hebrews: "Hebrews",
};

function buildHeadVerseEntries(
  def: WorkDef,
  fileId: string,
  headVerse: HeadVerse,
  excerpt: string,
  verseTranslationPrefix: string,
): CommentaryEntry[] {
  const baseId = `chrysostom-${fileId}`;
  const rangeLabel =
    headVerse.verseStart === headVerse.verseEnd
      ? `${headVerse.verseStart}`
      : `${headVerse.verseStart}–${headVerse.verseEnd}`;
  const displayBook = SLUG_TO_DISPLAY_NAME[headVerse.bookSlug] ?? headVerse.bookSlug;
  const title = `On ${displayBook} ${headVerse.chapter}:${rangeLabel}`;

  const entries: CommentaryEntry[] = [];
  for (let v = headVerse.verseStart; v <= headVerse.verseEnd; v += 1) {
    entries.push({
      id: `${baseId}-v${v}`,
      relation: "verse",
      targetVerseId: `${verseTranslationPrefix}:${headVerse.bookSlug}.${headVerse.chapter}.${v}`,
      topicSlugs: [],
      personId: PERSON_ID,
      workId: def.slug,
      title,
      excerpt,
      takeaway: "",
      sourceId: `${def.slug}-source`,
      rank: 90,
      tags: ["chrysostom", "patristic", "homily", headVerse.bookSlug],
    });
  }
  return entries;
}

// ── Entry point ─────────────────────────────────────────────────────────────

type ParseConfig = {
  rawDir: string;
  verseTranslationPrefix: string;
};

export function parseChrysostom(config: ParseConfig): CommentaryBundleV2 {
  const works: Work[] = [];
  const sources: SourceRecord[] = [];
  const chapters: WorkChapter[] = [];
  const entries: CommentaryEntry[] = [];

  for (const def of WORKS) {
    const provPath = join(config.rawDir, `provenance_${def.naId}.json`);
    if (!existsSync(provPath)) {
      throw new Error(`Chrysostom provenance file missing: ${provPath}`);
    }
    const prov = JSON.parse(readFileSync(provPath, "utf8")) as Provenance;

    works.push(buildWork(def));
    sources.push(buildSource(def));

    const subpageList =
      prov.subpages.length > 0 ? prov.subpages : [def.naId];

    subpageList.forEach((fileId, idx) => {
      const result = makeChapter({
        def,
        rawDir: config.rawDir,
        fileId,
        order: idx + 1,
        fallbackLabel: prov.subpages.length > 0
          ? `${def.shortTitle} ${idx + 1}`
          : def.shortTitle,
        fallbackTitle: def.title,
      });
      chapters.push(result.chapter);

      if (def.ntCommentary && result.headVerse) {
        entries.push(
          ...buildHeadVerseEntries(
            def,
            fileId,
            result.headVerse,
            result.excerpt,
            config.verseTranslationPrefix,
          ),
        );
      }
    });
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
