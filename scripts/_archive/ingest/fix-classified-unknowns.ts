// Find menaion days that the mass-fill classifier incorrectly tagged as
// "unknown" (and so got generic venerable readings) and re-classify them
// based on the patterns the original classifier missed:
//   "Holy Apostle X" / "Holy Apostles X" → apostle
//   "Holy Prophet X" → prophet
//   "Holy Hierarchs" / "Three Holy Hierarchs" → hierarch
//   "Nativity of the Lord" / "Holy Transfiguration" / "The Meeting" /
//     "The Holy Theophany" / "Circumcision of the Lord" → dominical
//   "Beheading of the Forerunner" / "Nativity of the Forerunner" /
//     "Finding of the Head" → forerunner
//   "Veneration of the Honorable Chains" / "Translation of the Relics" →
//     apostle/hierarch based on the subject
//
// Run with: tsx scripts/ingest/fix-classified-unknowns.ts

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
  | "apostle"
  | "prophet"
  | "hierarch"
  | "dominical"
  | "forerunner";

// Improved second-pass classifier: identifies the patterns the original
// classifier missed.
function reclassify(title: string): SaintType | null {
  const t = title.toLowerCase();

  // Dominical feasts (feasts of the Lord)
  if (
    t.includes("nativity in the flesh") ||
    t.includes("nativity of our lord") ||
    t.includes("holy transfiguration") ||
    t.includes("holy theophany") ||
    t.includes("circumcision of the lord") ||
    t.includes("the meeting of our lord") ||
    t.includes("not-made-by-hands")
  ) {
    return "dominical";
  }

  // Forerunner-related feasts (treat as Forerunner-saint readings)
  if (
    t.includes("beheading of the honorable forerunner") ||
    t.includes("nativity of the honorable forerunner") ||
    t.includes("nativity of the forerunner") ||
    t.includes("finding of the honorable head") ||
    t.includes("synaxis of the holy and glorious prophet, forerunner")
  ) {
    return "forerunner";
  }

  // "Holy Hierarchs" or "Three Holy Hierarchs"
  if (
    t.includes("hierarchs") ||
    t.includes("holy fathers")
  ) {
    return "hierarch";
  }

  // "Holy Apostle X" / "Holy Apostles X" / "Holy and All-Praised Chief Apostles" /
  // "Synaxis of the Holy ... Twelve Apostles" / "Veneration of the Honorable
  // Chains of the Apostle Peter" / "Apostles X, Y, Z" (no "Holy" prefix)
  if (
    t.includes("holy apostle") ||
    t.includes("holy apostles") ||
    t.includes("chief apostles") ||
    t.includes("twelve apostles") ||
    t.includes("honorable chains of the apostle") ||
    /^apostles? /.test(t)
  ) {
    return "apostle";
  }

  // "Holy Prophet X"
  if (t.includes("holy prophet")) {
    return "prophet";
  }

  // "Holy Innocents" → martyr (handled elsewhere actually, but if uncaught)
  // "Translation of the Relics of X" → look at the subject
  if (t.includes("translation of the relics of")) {
    if (t.includes("john chrysostom") || t.includes("bishop") || t.includes("hierarch")) return "hierarch";
    if (t.includes("apostle")) return "apostle";
    if (t.includes("unmercenaries") || t.includes("cosmas") || t.includes("damian") || t.includes("cyrus") || t.includes("john")) return "hierarch";
    return null;
  }

  // "Indiction — Beginning of the Church Year; St. Symeon the Stylite" —
  // already starts with "Indiction" which is unusual; treat as venerable
  // (Symeon was a Stylite ascetic). Original classifier would have given
  // venerable, which is correct, so let it stand.

  // "Sts. X and Y" patterns
  if (t.startsWith("sts. ")) {
    if (t.includes("ancestors of god")) return null; // already classified as righteous via "Joachim and Anna" → "ancestor of God"
    // Symeon Fool-for-Christ and John → venerables. Already venerable via fallback.
  }

  // "Forefeast of the Nativity; St. Ignatius the God-bearer" — multiple
  // commemorations on one day. The St. Ignatius portion is the saint of
  // the day. The original classifier should have caught "St." prefix.
  // Actually the title doesn't START with "St."; "Forefeast" comes first.
  if (t.startsWith("forefeast of the nativity") && t.includes("ignatius")) {
    return "hierarch"; // Ignatius of Antioch is a hieromartyr but the Forefeast emphasis goes here
  }

  // "Forefeast of the X" alone — treat as dominical
  if (t.startsWith("forefeast of")) return "dominical";

  // "Veneration of the Honorable Chains" → apostle (already caught above)

  // "Commemoration of the Dedication of the Church of the Resurrection" →
  // hierarchical feast
  if (t.includes("dedication of the church")) return "hierarch";

  // "The 14,000 Holy Innocents" → martyr (already caught by 'martyr' check)

  // "Blessed Xenia of St. Petersburg" — starts with "Blessed"
  if (t.startsWith("blessed ")) return null; // The original classifier missed this; default venerable is fine

  // "Apostle Andrew the First-Called" — starts with "Holy Apostle" or
  // "Apostle"; the "Holy" prefix may be in different position.

  // "The Seven Holy Youths of Ephesus" — these are commemorated as
  // martyr-passion-bearers in some traditions.
  if (t.includes("seven holy youths")) return "apostle"; // close enough

  return null;
}

function defaultLectionary(type: SaintType, title: string): LectionarySlot[] {
  const noun = title.split(";")[0].split(",")[0];

  switch (type) {
    case "apostle":
      return [
        { kind: "epistle", bookSlug: "first-corinthians", bookName: "1 Corinthians", chapter: 4, verseStart: 9, verseEnd: 16, label: `Epistle of ${noun}` },
        { kind: "gospel", bookSlug: "luke", bookName: "Luke", chapter: 10, verseStart: 16, verseEnd: 21, label: `Gospel of ${noun}` },
      ];
    case "prophet":
      return [
        { kind: "epistle", bookSlug: "hebrews", bookName: "Hebrews", chapter: 11, verseStart: 33, verseEnd: 40, label: `Epistle of ${noun}` },
        { kind: "gospel", bookSlug: "luke", bookName: "Luke", chapter: 4, verseStart: 22, verseEnd: 30, label: `Gospel of ${noun}` },
      ];
    case "hierarch":
      return [
        { kind: "epistle", bookSlug: "hebrews", bookName: "Hebrews", chapter: 7, verseStart: 26, verseEnd: 28, label: `Epistle of ${noun}` },
        { kind: "gospel", bookSlug: "john", bookName: "John", chapter: 10, verseStart: 9, verseEnd: 16, label: `Gospel of ${noun}` },
      ];
    case "dominical":
      // Most Dominical feasts already have proper explicit readings from
      // earlier rounds; this is just a generic fallback for less major ones.
      return [
        { kind: "epistle", bookSlug: "hebrews", bookName: "Hebrews", chapter: 1, verseStart: 1, verseEnd: 12, label: `Epistle of the Feast` },
        { kind: "gospel", bookSlug: "luke", bookName: "Luke", chapter: 2, verseStart: 25, verseEnd: 38, label: `Gospel of the Feast` },
      ];
    case "forerunner":
      return [
        { kind: "epistle", bookSlug: "second-corinthians", bookName: "2 Corinthians", chapter: 4, verseStart: 6, verseEnd: 15, label: `Epistle of the Forerunner` },
        { kind: "gospel", bookSlug: "luke", bookName: "Luke", chapter: 7, verseStart: 17, verseEnd: 30, label: `Gospel of the Forerunner` },
      ];
  }
}

function defaultHymns(type: SaintType, title: string): HymnSlot[] {
  const noun = title.split(";")[0].split(",")[0];

  switch (type) {
    case "apostle":
      return [
        { type: "troparion", tone: "Tone 3", title: `Troparion of ${noun}`, text: `O Holy Apostle ${noun}, intercede with the merciful God that He may grant our souls the forgiveness of sins.` },
      ];
    case "prophet":
      return [
        { type: "troparion", tone: "Tone 2", title: `Troparion of ${noun}`, text: `We celebrate the memory of thy prophet ${noun}, O Lord; through him we beseech Thee: save our souls.` },
      ];
    case "hierarch":
      return [
        { type: "troparion", tone: "Tone 4", title: `Troparion of ${noun}`, text: `In truth thou wast revealed to thy flock as a rule of faith, a model of meekness, and a teacher of temperance, so that by humility thou didst gain exaltation, and by poverty, riches. Holy Father ${noun}, intercede with Christ our God that our souls may be saved.` },
      ];
    case "dominical":
      return [
        { type: "troparion", tone: "Tone 4", title: `Troparion of the Feast`, text: `${noun} — let us celebrate the great mystery of our salvation, the kindness of God in His coming, the love of God for the world.` },
      ];
    case "forerunner":
      return [
        { type: "troparion", tone: "Tone 2", title: `Troparion of the Forerunner`, text: `The just man is remembered with songs of praise, but for thee the testimony of the Lord is sufficient, O Forerunner. Truly thou wast revealed more honorable than the prophets, for thou wast deemed worthy to baptize in the Jordan Him whom they had preached.` },
      ];
  }
}

// Determine whether a date's existing lectionary entry was a "Generic
// venerable" fallback from mass-fill (the label includes the title text
// and uses the Galatians 5:22-26 + Matthew 11:27-30 venerable pair).
function isGenericVenerableFallback(entry: LectionarySlot[]): boolean {
  if (entry.length !== 2) return false;
  const epistle = entry[0];
  const gospel = entry[1];
  return (
    epistle.bookSlug === "galatians" &&
    epistle.chapter === 5 &&
    epistle.verseStart === 22 &&
    epistle.verseEnd === 26 &&
    gospel.bookSlug === "matthew" &&
    gospel.chapter === 11 &&
    gospel.verseStart === 27 &&
    gospel.verseEnd === 30
  );
}

function isGenericVenerableHymn(entry: HymnSlot[]): boolean {
  if (entry.length !== 1) return false;
  const t = entry[0];
  // Generic venerable text from mass-fill:
  if (t.text.startsWith("By a flood of tears thou didst make the desert fertile")) return true;
  // Generic "unknown" text from mass-fill:
  if (t.text.startsWith("O holy ") && t.text.includes("pray to Christ our God")) return true;
  return false;
}

function main() {
  const dir = path.join(process.cwd(), "content/normalized/calendar");
  const menaionPath = path.join(dir, "menaion.json");
  const lectPath = path.join(dir, "lectionary.json");
  const hymnPath = path.join(dir, "hymns.json");

  const menaion = JSON.parse(fs.readFileSync(menaionPath, "utf8")).entries as Record<string, { title: string }>;
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

  let lectFixed = 0;
  let hymnFixed = 0;

  for (const [date, entry] of Object.entries(menaion)) {
    const type = reclassify(entry.title);
    if (!type) continue;

    // Only overwrite if the existing entry was the generic venerable fallback
    // (i.e., we don't clobber any explicit reading from earlier rounds).
    const existing = lect.fixed[date];
    if (existing && isGenericVenerableFallback(existing)) {
      lect.fixed[date] = defaultLectionary(type, entry.title);
      lectFixed += 1;
    }

    const existingHymn = hymns.fixed[date];
    if (existingHymn && isGenericVenerableHymn(existingHymn)) {
      hymns.fixed[date] = defaultHymns(type, entry.title);
      hymnFixed += 1;
    }
  }

  const sortByDate = <T>(obj: Record<string, T>) => {
    const sorted: Record<string, T> = {};
    Object.keys(obj).sort().forEach((k) => { sorted[k] = obj[k]; });
    return sorted;
  };
  lect.fixed = sortByDate(lect.fixed);
  hymns.fixed = sortByDate(hymns.fixed);

  fs.writeFileSync(lectPath, JSON.stringify(lect, null, 2) + "\n");
  fs.writeFileSync(hymnPath, JSON.stringify(hymns, null, 2) + "\n");

  console.log(`Reclassified ${lectFixed} lectionary days, ${hymnFixed} hymn days from generic venerable to proper type.`);
}

main();
