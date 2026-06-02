// Mass-fill fixed-feast lectionary and hymns for every menaion day that
// doesn't already have an explicit entry. Classifies each day by its
// menaion title and assigns the appropriate Common-of-Saints readings
// and troparion from the Byzantine typikon.
//
// Idempotent — skips any date that already has lectionary or hymn data.
// Run with: tsx scripts/ingest/mass-fill-fixed-feasts.ts

import fs from "node:fs";
import path from "node:path";

type LectionarySlot = {
  kind: "epistle" | "gospel";
  bookSlug: string;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  label: string;
};

type HymnSlot = {
  type: "troparion" | "kontakion";
  tone: string;
  title: string;
  text: string;
};

type SaintType =
  | "prophet"
  | "apostle"
  | "hierarch"
  | "hieromartyr"
  | "great-martyr"
  | "virgin-martyr"
  | "martyr"
  | "venerable-woman"
  | "venerable"
  | "passion-bearer"
  | "righteous"
  | "wonderworker"
  | "theotokos"
  | "cross"
  | "angel"
  | "unknown";

// Classify a menaion title by saint-type. Returns the most specific
// applicable type. Order of checks matters: more specific first.
function classify(title: string): SaintType {
  const t = title.toLowerCase();

  // Theotokos and major Marian feasts
  if (
    t.includes("theotokos") ||
    t.includes("annunciation") ||
    t.includes("dormition") ||
    t.includes("nativity of the most") ||
    t.includes("nativity of our lady") ||
    t.includes("entry of the most") ||
    t.includes("conception of") ||
    t.includes("most pure") ||
    t.includes("protection of the") ||
    t.includes("ever-virgin")
  ) {
    return "theotokos";
  }

  // Cross feasts
  if (t.includes("cross") && (t.includes("precious") || t.includes("honorable") || t.includes("exaltation") || t.includes("procession"))) {
    return "cross";
  }

  // Angelic feasts
  if (t.includes("archangel") || t.includes("synaxis of") && t.includes("bodiless") || t.includes("synaxis of the heavenly") || t.includes("miracle at chonae")) {
    return "angel";
  }

  // Specific martyr forms (most specific first)
  if (t.includes("hieromartyr")) return "hieromartyr";
  if (t.includes("virgin-martyr") || t.includes("virgin martyr") || t.includes("virginmartyr")) return "virgin-martyr";
  if (t.includes("great-martyr") || t.includes("great martyr") || t.includes("greatmartyr")) return "great-martyr";
  if (t.includes("passion-bearer") || t.includes("passion bearer")) return "passion-bearer";
  if (t.includes("martyr")) return "martyr";

  // Prophets
  if (t.startsWith("prophet ")) return "prophet";

  // Apostles (this should also catch evangelists)
  if (
    t.startsWith("apostle ") ||
    t.includes("of the twelve") ||
    t.includes("of the seventy") ||
    t.includes("evangelist") ||
    t.includes("equal-to-the-apostles") ||
    t.includes("equal to the apostles")
  ) {
    return "apostle";
  }

  // Hierarch tells
  if (
    t.includes("patriarch") ||
    t.includes("archbishop") ||
    t.includes("metropolitan") ||
    t.includes("bishop")
  ) {
    return "hierarch";
  }

  // Wonderworker
  if (t.includes("wonderworker")) return "wonderworker";

  // Righteous (Old Testament patriarchs, NT relatives of the Lord)
  if (
    t.startsWith("righteous ") ||
    t.includes("forefather") ||
    t.includes("ancestor of god") ||
    t.includes("foremother")
  ) {
    return "righteous";
  }

  // Female venerable (nun-saints, female hermits)
  if (
    t.includes("nun ") ||
    (t.startsWith("st. ") && (t.includes("matushka") || t.endsWith("the younger") || /\babbess\b/.test(t)))
  ) {
    return "venerable-woman";
  }

  // Generic "St. X" with no qualifier — usually a monastic/venerable in the menaion tradition
  if (t.startsWith("st. ") || t.startsWith("saint ") || t.startsWith("our holy ") || t.startsWith("our venerable") || t.startsWith("venerable") || t.startsWith("our father")) {
    return "venerable";
  }

  return "unknown";
}

// Common-of-saints lectionary readings by type. Drawn from the Byzantine
// typikon's standard table of Apostle/Gospel readings for the categories
// of saints when no specific reading is appointed. Verse ranges kept
// single-chapter so they fit the existing data model.
function defaultLectionary(type: SaintType, title: string): LectionarySlot[] {
  const noun = title.split(",")[0]; // for the label

  switch (type) {
    case "apostle":
      return [
        {
          kind: "epistle",
          bookSlug: "first-corinthians",
          bookName: "1 Corinthians",
          chapter: 4,
          verseStart: 9,
          verseEnd: 16,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 10,
          verseStart: 16,
          verseEnd: 21,
          label: `Gospel of ${noun}`,
        },
      ];

    case "prophet":
      return [
        {
          kind: "epistle",
          bookSlug: "hebrews",
          bookName: "Hebrews",
          chapter: 11,
          verseStart: 33,
          verseEnd: 40,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 4,
          verseStart: 22,
          verseEnd: 30,
          label: `Gospel of ${noun}`,
        },
      ];

    case "hierarch":
      return [
        {
          kind: "epistle",
          bookSlug: "hebrews",
          bookName: "Hebrews",
          chapter: 7,
          verseStart: 26,
          verseEnd: 28,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "john",
          bookName: "John",
          chapter: 10,
          verseStart: 9,
          verseEnd: 16,
          label: `Gospel of ${noun}`,
        },
      ];

    case "hieromartyr":
      return [
        {
          kind: "epistle",
          bookSlug: "hebrews",
          bookName: "Hebrews",
          chapter: 13,
          verseStart: 7,
          verseEnd: 16,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 12,
          verseStart: 32,
          verseEnd: 40,
          label: `Gospel of ${noun}`,
        },
      ];

    case "great-martyr":
      return [
        {
          kind: "epistle",
          bookSlug: "second-timothy",
          bookName: "2 Timothy",
          chapter: 2,
          verseStart: 1,
          verseEnd: 10,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "john",
          bookName: "John",
          chapter: 15,
          verseStart: 17,
          verseEnd: 27,
          label: `Gospel of ${noun}`,
        },
      ];

    case "virgin-martyr":
      return [
        {
          kind: "epistle",
          bookSlug: "galatians",
          bookName: "Galatians",
          chapter: 3,
          verseStart: 23,
          verseEnd: 29,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "mark",
          bookName: "Mark",
          chapter: 5,
          verseStart: 24,
          verseEnd: 34,
          label: `Gospel of ${noun}`,
        },
      ];

    case "martyr":
      return [
        {
          kind: "epistle",
          bookSlug: "romans",
          bookName: "Romans",
          chapter: 8,
          verseStart: 28,
          verseEnd: 39,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 21,
          verseStart: 12,
          verseEnd: 19,
          label: `Gospel of ${noun}`,
        },
      ];

    case "passion-bearer":
      return [
        {
          kind: "epistle",
          bookSlug: "romans",
          bookName: "Romans",
          chapter: 8,
          verseStart: 28,
          verseEnd: 39,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "matthew",
          bookName: "Matthew",
          chapter: 10,
          verseStart: 16,
          verseEnd: 22,
          label: `Gospel of ${noun}`,
        },
      ];

    case "venerable":
      return [
        {
          kind: "epistle",
          bookSlug: "galatians",
          bookName: "Galatians",
          chapter: 5,
          verseStart: 22,
          verseEnd: 26,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "matthew",
          bookName: "Matthew",
          chapter: 11,
          verseStart: 27,
          verseEnd: 30,
          label: `Gospel of ${noun}`,
        },
      ];

    case "venerable-woman":
      return [
        {
          kind: "epistle",
          bookSlug: "galatians",
          bookName: "Galatians",
          chapter: 3,
          verseStart: 23,
          verseEnd: 29,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 7,
          verseStart: 36,
          verseEnd: 50,
          label: `Gospel of ${noun}`,
        },
      ];

    case "wonderworker":
      return [
        {
          kind: "epistle",
          bookSlug: "hebrews",
          bookName: "Hebrews",
          chapter: 7,
          verseStart: 26,
          verseEnd: 28,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "matthew",
          bookName: "Matthew",
          chapter: 4,
          verseStart: 25,
          verseEnd: 29,
          label: `Gospel of ${noun}`,
        },
      ];

    case "righteous":
      return [
        {
          kind: "epistle",
          bookSlug: "galatians",
          bookName: "Galatians",
          chapter: 4,
          verseStart: 22,
          verseEnd: 31,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 8,
          verseStart: 16,
          verseEnd: 21,
          label: `Gospel of ${noun}`,
        },
      ];

    case "theotokos":
      return [
        {
          kind: "epistle",
          bookSlug: "philippians",
          bookName: "Philippians",
          chapter: 2,
          verseStart: 5,
          verseEnd: 11,
          label: `Epistle of the Theotokos`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 10,
          verseStart: 38,
          verseEnd: 42,
          label: `Gospel of the Theotokos`,
        },
      ];

    case "cross":
      return [
        {
          kind: "epistle",
          bookSlug: "first-corinthians",
          bookName: "1 Corinthians",
          chapter: 1,
          verseStart: 18,
          verseEnd: 24,
          label: `Epistle of the Honorable Cross`,
        },
        {
          kind: "gospel",
          bookSlug: "john",
          bookName: "John",
          chapter: 19,
          verseStart: 6,
          verseEnd: 35,
          label: `Gospel of the Honorable Cross`,
        },
      ];

    case "angel":
      return [
        {
          kind: "epistle",
          bookSlug: "hebrews",
          bookName: "Hebrews",
          chapter: 2,
          verseStart: 2,
          verseEnd: 10,
          label: `Epistle of the Bodiless Powers`,
        },
        {
          kind: "gospel",
          bookSlug: "luke",
          bookName: "Luke",
          chapter: 10,
          verseStart: 16,
          verseEnd: 21,
          label: `Gospel of the Bodiless Powers`,
        },
      ];

    case "unknown":
    default:
      // Generic — assume venerable as the safest fallback
      return [
        {
          kind: "epistle",
          bookSlug: "galatians",
          bookName: "Galatians",
          chapter: 5,
          verseStart: 22,
          verseEnd: 26,
          label: `Epistle of ${noun}`,
        },
        {
          kind: "gospel",
          bookSlug: "matthew",
          bookName: "Matthew",
          chapter: 11,
          verseStart: 27,
          verseEnd: 30,
          label: `Gospel of ${noun}`,
        },
      ];
  }
}

// Common-of-saints troparia. Each draws on the standard Greek-Slavonic
// formula for the type, with the saint's name interpolated.
function defaultHymns(type: SaintType, title: string): HymnSlot[] {
  const noun = title.split(",")[0];

  switch (type) {
    case "apostle":
      return [
        {
          type: "troparion",
          tone: "Tone 3",
          title: `Troparion of ${noun}`,
          text: `O Holy Apostle ${noun}, intercede with the merciful God that He may grant our souls the forgiveness of sins.`,
        },
      ];

    case "prophet":
      return [
        {
          type: "troparion",
          tone: "Tone 2",
          title: `Troparion of ${noun}`,
          text: `We celebrate the memory of thy prophet ${noun}, O Lord; through him we beseech Thee: save our souls.`,
        },
      ];

    case "hierarch":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of ${noun}`,
          text: `In truth thou wast revealed to thy flock as a rule of faith, a model of meekness, and a teacher of temperance, so that by humility thou didst gain exaltation, and by poverty, riches. Holy Father ${noun}, intercede with Christ our God that our souls may be saved.`,
        },
      ];

    case "hieromartyr":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of ${noun}`,
          text: `Sharing the ways of the apostles and successor to their thrones, O God-inspired ${noun}, thou hast found in active life the path to divine contemplation. Wherefore, ordering rightly the word of truth, thou didst contest for the faith even unto blood. Intercede with Christ God that our souls may be saved.`,
        },
      ];

    case "great-martyr":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of ${noun}`,
          text: `Thy Great-martyr ${noun}, O Lord, through his sufferings hath received the incorruptible crown from Thee, our God; for, having Thy strength, he cast down the tyrants and broke the feeble audacity of the demons. Through his intercessions save our souls.`,
        },
      ];

    case "virgin-martyr":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of ${noun}`,
          text: `Thy lamb ${noun}, O Jesus, crieth out with a loud voice: I love Thee, my Bridegroom, and seeking Thee I contest. I am crucified with Thee, and in Thy baptism am buried with Thee. I suffer for Thy sake, that I might reign with Thee; I die for Thee, that I might live in Thee. Receive me, then, an unblemished sacrifice that I have offered to Thee in love. By her prayers save our souls.`,
        },
      ];

    case "martyr":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of ${noun}`,
          text: `Thy Martyr ${noun}, O Lord, through his sufferings hath received the incorruptible crown from Thee, our God; for, having Thy strength, he cast down the tyrants and broke the feeble audacity of the demons. Through his intercessions save our souls.`,
        },
      ];

    case "passion-bearer":
      return [
        {
          type: "troparion",
          tone: "Tone 2",
          title: `Troparion of ${noun}`,
          text: `O Passion-bearer ${noun}, by thy patience and steadfastness in suffering at the hands of thy brothers, thou didst inherit the kingdom of heaven. Intercede with Christ God for the salvation of our souls.`,
        },
      ];

    case "venerable":
      return [
        {
          type: "troparion",
          tone: "Tone 8",
          title: `Troparion of ${noun}`,
          text: `By a flood of tears thou didst make the desert fertile, and thy longing for God brought forth fruits in abundance. By the radiance of miracles thou didst illumine the whole universe. O ${noun}, our holy father, pray to Christ our God to save our souls.`,
        },
      ];

    case "venerable-woman":
      return [
        {
          type: "troparion",
          tone: "Tone 8",
          title: `Troparion of ${noun}`,
          text: `In thee, O mother, the divine image was preserved with exactness; for taking up the Cross thou didst follow Christ; by deeds thou didst teach us to disregard the flesh, for it is fleeting, but to attend to the soul, since it is immortal. Wherefore thy spirit, O Venerable ${noun}, rejoiceth with the angels.`,
        },
      ];

    case "wonderworker":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of ${noun}`,
          text: `O Wonderworker ${noun}, thou wast filled with grace from on high and didst pour out unto the faithful the gift of healing. Pray Christ God for the salvation of our souls.`,
        },
      ];

    case "righteous":
      return [
        {
          type: "troparion",
          tone: "Tone 2",
          title: `Troparion of ${noun}`,
          text: `Great are the achievements of faith! O Righteous ${noun}, thou didst shine like a star upon the earth, leaving us a model of holy life. Through thy prayers, O Christ God, save our souls.`,
        },
      ];

    case "theotokos":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of the Most Holy Theotokos`,
          text: `Today is the prelude of the good will of God, of the preaching of the salvation of mankind. The Virgin is exalted in the temple of God to make known Christ to all. To Her, then, with mighty voice let us cry aloud: Rejoice, O fulfillment of the Creator's plan.`,
        },
      ];

    case "cross":
      return [
        {
          type: "troparion",
          tone: "Tone 1",
          title: `Troparion of the Honorable Cross`,
          text: `O Lord, save Thy people and bless Thine inheritance, granting unto Thy people victory over all their enemies, and by the power of Thy Cross preserving Thy commonwealth.`,
        },
      ];

    case "angel":
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of the Bodiless Powers`,
          text: `Captains of the heavenly hosts, we who are unworthy beseech thee that by your supplications thou wilt encompass us beneath the wings of thy immaterial glory, and faithfully preserve us who fall down and cry to thee: deliver us from all dangers, for ye are the commanders of the powers on high.`,
        },
      ];

    case "unknown":
    default:
      return [
        {
          type: "troparion",
          tone: "Tone 4",
          title: `Troparion of ${noun}`,
          text: `O holy ${noun}, pray to Christ our God that He save our souls.`,
        },
      ];
  }
}

function main() {
  const dir = path.join(process.cwd(), "content/normalized/calendar");
  const menaionPath = path.join(dir, "menaion.json");
  const lectPath = path.join(dir, "lectionary.json");
  const hymnPath = path.join(dir, "hymns.json");

  const menaion = JSON.parse(fs.readFileSync(menaionPath, "utf8")) as {
    entries: Record<string, { monthDay: string; title: string; summary?: string; saintIds?: string[]; also?: unknown[] }>;
    _meta?: unknown;
  };
  const lect = JSON.parse(fs.readFileSync(lectPath, "utf8")) as {
    movable: Record<string, LectionarySlot[]>;
    fixed: Record<string, LectionarySlot[]>;
    _meta?: unknown;
  };
  const hymns = JSON.parse(fs.readFileSync(hymnPath, "utf8")) as {
    movable: Record<string, HymnSlot[]>;
    fixed: Record<string, HymnSlot[]>;
    _meta?: unknown;
  };

  let lectAdded = 0;
  let hymnAdded = 0;
  const classifications: Record<SaintType, number> = {} as Record<SaintType, number>;

  for (const [date, entry] of Object.entries(menaion.entries)) {
    const type = classify(entry.title);
    classifications[type] = (classifications[type] ?? 0) + 1;

    if (!lect.fixed[date]) {
      lect.fixed[date] = defaultLectionary(type, entry.title);
      lectAdded += 1;
    }
    if (!hymns.fixed[date]) {
      hymns.fixed[date] = defaultHymns(type, entry.title);
      hymnAdded += 1;
    }
  }

  const sortByDate = <T>(obj: Record<string, T>) => {
    const sorted: Record<string, T> = {};
    Object.keys(obj)
      .sort()
      .forEach((k) => {
        sorted[k] = obj[k];
      });
    return sorted;
  };

  lect.fixed = sortByDate(lect.fixed);
  hymns.fixed = sortByDate(hymns.fixed);

  fs.writeFileSync(lectPath, JSON.stringify(lect, null, 2) + "\n");
  fs.writeFileSync(hymnPath, JSON.stringify(hymns, null, 2) + "\n");

  console.log(`lectionary: added ${lectAdded}, hymns: added ${hymnAdded}`);
  console.log("classification breakdown:");
  for (const [type, count] of Object.entries(classifications).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

main();
