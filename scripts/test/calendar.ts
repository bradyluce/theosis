// Test runner for the calendar slice. No test framework dependency —
// asserts and exits non-zero on failure. Run with: tsx scripts/test/calendar.ts
//
// Coverage:
//   - Gauss algorithm correctness against known Pascha dates (2024, 2025, 2026).
//   - julianMonthDay / gregorianMonthDay symmetry.
//   - paschalDayOffset boundary cases.
//   - resolvePaschalAnchor crossing the year boundary.
//   - End-to-end: composer produces the expected commemoration for known dates.

import fs from "node:fs";
import path from "node:path";
import {
  getPaschaDate,
  gregorianMonthDay,
  julianMonthDay,
  paschalDayOffset,
  resolvePaschalAnchor,
} from "../../src/lib/calendar/paschalion";
import { composeDailyCommemoration } from "../../src/lib/calendar/composer";
import { composeDailyReadings } from "../../src/lib/calendar/readings";
import { composeDailyHymns } from "../../src/lib/calendar/hymns";
import { composeDailyFast } from "../../src/lib/calendar/fasts";
import type { CalendarData } from "../../src/lib/calendar/types";

// Load the normalized data directly — bypasses the server-only data.ts wrapper
// so this test runs under plain tsx without a Next.js bundle context.
function loadCalendarDataDirect(): CalendarData {
  const dir = path.join(process.cwd(), "content/normalized/calendar");
  const menaion = JSON.parse(fs.readFileSync(path.join(dir, "menaion.json"), "utf8")).entries;
  const movableCycle = JSON.parse(
    fs.readFileSync(path.join(dir, "movable-cycle.json"), "utf8"),
  ).entries;
  const lectionary = JSON.parse(fs.readFileSync(path.join(dir, "lectionary.json"), "utf8"));
  const hymns = JSON.parse(fs.readFileSync(path.join(dir, "hymns.json"), "utf8"));
  return { menaion, movableCycle, lectionary, hymns };
}

let failures = 0;

function assertEqual<T>(label: string, actual: T, expected: T): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`ok    ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}`);
    console.error(`        expected: ${JSON.stringify(expected)}`);
    console.error(`        actual:   ${JSON.stringify(actual)}`);
  }
}

function utc(year: number, monthIndex0: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex0, day));
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// --- Paschalion algorithm ---

assertEqual("Pascha 2024 = 2024-05-05", isoOf(getPaschaDate(2024)), "2024-05-05");
assertEqual("Pascha 2025 = 2025-04-20", isoOf(getPaschaDate(2025)), "2025-04-20");
assertEqual("Pascha 2026 = 2026-04-12", isoOf(getPaschaDate(2026)), "2026-04-12");
assertEqual("Pascha 2027 = 2027-05-02", isoOf(getPaschaDate(2027)), "2027-05-02");
assertEqual("Pascha 2030 = 2030-04-28", isoOf(getPaschaDate(2030)), "2030-04-28");

// --- Year-bound assertions ---

try {
  getPaschaDate(1850);
  console.error("FAIL  pre-1900 year should throw");
  failures += 1;
} catch {
  console.log("ok    pre-1900 year throws RangeError");
}
try {
  getPaschaDate(2200);
  console.error("FAIL  post-2099 year should throw");
  failures += 1;
} catch {
  console.log("ok    post-2099 year throws RangeError");
}

// --- Month-day helpers ---

assertEqual("gregorianMonthDay(2026-05-19) = 05-19", gregorianMonthDay(utc(2026, 4, 19)), "05-19");
assertEqual("julianMonthDay(2026-05-19) = 05-06", julianMonthDay(utc(2026, 4, 19)), "05-06");
assertEqual("gregorianMonthDay(2026-01-07) = 01-07", gregorianMonthDay(utc(2026, 0, 7)), "01-07");
assertEqual("julianMonthDay(2026-01-07) = 12-25", julianMonthDay(utc(2026, 0, 7)), "12-25");

// --- Paschal day offset ---

assertEqual("pdist(Pascha 2026) = 0", paschalDayOffset(utc(2026, 3, 12)), 0);
assertEqual("pdist(Pascha 2026 + 49) = 49 (Pentecost)", paschalDayOffset(utc(2026, 4, 31)), 49);
assertEqual("pdist(Pascha 2026 - 7) = -7 (Palm Sunday)", paschalDayOffset(utc(2026, 3, 5)), -7);

// --- Paschal anchor (year-boundary handling) ---

assertEqual(
  "resolvePaschalAnchor(2026-05-19) = this year",
  resolvePaschalAnchor(utc(2026, 4, 19)),
  { paschaYear: 2026, pdist: 37 },
);
// A date in early January should fall back to the previous year's Pascha if
// the current year's Pascha is still >77 days away.
assertEqual(
  "resolvePaschalAnchor(2026-01-05) crosses to prior year",
  resolvePaschalAnchor(utc(2026, 0, 5)),
  { paschaYear: 2025, pdist: 260 },
);

// --- Composer end-to-end ---

const data = loadCalendarDataDirect();

const pascha = composeDailyCommemoration(utc(2026, 3, 12), data);
assertEqual("Pascha 2026 -> title", pascha.title, "Holy Pascha — The Resurrection of Christ");
assertEqual("Pascha 2026 -> feastLabel set", pascha.feastLabel, "Holy Pascha — The Resurrection of Christ");

const pentecost = composeDailyCommemoration(utc(2026, 4, 31), data);
assertEqual("Pentecost 2026 -> title", pentecost.title, "Pentecost — The Descent of the Holy Spirit");

const constantineHelena = composeDailyCommemoration(utc(2026, 4, 21), data);
assertEqual(
  "May 21 (Ascension 2026) shows Ascension as primary",
  constantineHelena.title,
  "Ascension of the Lord",
);
// And the Menaion entry now lives in additionalCommemorations (instead of
// being folded into lifeExcerpt as in the original composer).
assertEqual(
  "May 21 additionalCommemorations[0] mentions Constantine and Helena",
  constantineHelena.additionalCommemorations[0]?.name.includes("Constantine"),
  true,
);

// A day with no movable cycle entry — the Menaion is primary.
const may19 = composeDailyCommemoration(utc(2026, 4, 19), data);
assertEqual("May 19 2026 -> Menaion primary", may19.title, "Hieromartyr Patrick, Bishop of Prusa");

// Sanity check on the cycle-exit math itself.
assertEqual("pdist(2026-06-21) = 70 (outside cycle)", paschalDayOffset(utc(2026, 5, 21)), 70);
// June 21 is outside the paschal cycle but now has a Menaion entry — composer
// falls through to that.
const june21 = composeDailyCommemoration(utc(2026, 5, 21), data);
assertEqual("June 21 -> Menaion when outside paschal cycle", june21.title, "Martyr Julian of Tarsus");

// --- Lectionary ---

const paschaReadings = composeDailyReadings(utc(2026, 3, 12), data);
assertEqual("Pascha readings: 2 slots (epistle + gospel)", paschaReadings.length, 2);
assertEqual("Pascha epistle = Acts 1:1-8", paschaReadings[0].scripture.label, "Acts 1:1-8");
assertEqual("Pascha gospel = John 1:1-17", paschaReadings[1].scripture.label, "John 1:1-17");

const ascensionReadings = composeDailyReadings(utc(2026, 4, 21), data);
// May 21 2026 = Ascension (pdist 39) AND Sts. Constantine & Helen (fixed 05-21).
// Both readings layer: movable first, then fixed.
assertEqual("May 21 2026 layered readings = 4 slots", ascensionReadings.length, 4);
assertEqual(
  "May 21 includes Acts 26:1-20 from fixed cycle",
  ascensionReadings.some((r) => r.scripture.label === "Acts 26:1-20"),
  true,
);

// (May 19 readings are now covered by the Pentecostarion daily slice below
// — the date sits in week 6 of Pascha and has pdist-37 readings.)

// --- Hymns ---

const paschaHymns = composeDailyHymns(utc(2026, 3, 12), data);
assertEqual("Pascha hymns: 2 (troparion + kontakion)", paschaHymns.length, 2);
assertEqual("Pascha troparion title", paschaHymns[0].title, "Paschal Troparion");
assertEqual("Pascha kontakion title", paschaHymns[1].title, "Paschal Kontakion");

const constHelenHymns = composeDailyHymns(utc(2026, 4, 21), data);
// May 21 2026 has Ascension troparion + kontakion (movable) AND Constantine+Helen troparion + kontakion (fixed).
assertEqual("May 21 2026: 4 hymns (Ascension + Constantine&Helen)", constHelenHymns.length, 4);
assertEqual(
  "May 21 hymns include Constantine & Helen troparion",
  constHelenHymns.some((h) => h.title.includes("Constantine")),
  true,
);

const may19Hymns = composeDailyHymns(utc(2026, 4, 19), data);
assertEqual("May 19 2026 -> empty hymns (no entries)", may19Hymns.length, 0);

// --- Fasting rules ---

// Pascha 2026 = Apr 12. Bright Week pdist 1-6 = fast-free.
assertEqual("Bright Monday 2026 -> no fast", composeDailyFast(utc(2026, 3, 13)), undefined);
// Pentecost week (pdist 50-56) = fast-free.
assertEqual("Day after Pentecost 2026 -> no fast", composeDailyFast(utc(2026, 5, 1)), undefined);
// Wednesday in ordinary time = weekly Wed fast.
assertEqual("Sept 16 2026 (Wed) -> weekly fast", composeDailyFast(utc(2026, 8, 16)), "Wednesday and Friday Fast");
// Friday during Bright Week = fast-free overrides weekly Wed/Fri.
assertEqual("Bright Friday 2026 -> no fast (overrides weekly)", composeDailyFast(utc(2026, 3, 17)), undefined);
// Aug 5 2026 -> Dormition Fast
assertEqual("Aug 5 2026 -> Dormition Fast", composeDailyFast(utc(2026, 7, 5)), "Dormition Fast");
// Dec 1 -> Nativity Fast
assertEqual("Dec 1 2026 -> Nativity Fast", composeDailyFast(utc(2026, 11, 1)), "Nativity Fast");
// Dec 25 -> no fast (Sviatki begins)
assertEqual("Dec 25 -> no fast (Sviatki)", composeDailyFast(utc(2026, 11, 25)), undefined);
// Feb 24 2026 = Tuesday, pdist = (2026-04-12 minus 2026-02-24) = -47, Great Lent
assertEqual("Feb 24 2026 -> Great Lent", composeDailyFast(utc(2026, 1, 24)), "Great Lent");
// April 8 2026 = Holy Wednesday (pdist -4)
assertEqual("Holy Wed 2026 -> Holy Week", composeDailyFast(utc(2026, 3, 8)), "Holy Week");
// Sept 8 2026 (Nativity of Theotokos) is a Tuesday — not Wed/Fri, no major fast → no fast
assertEqual("Sept 8 2026 (Tue, no major fast) -> undefined", composeDailyFast(utc(2026, 8, 8)), undefined);

// --- Year-coverage smoke tests across months ---

// Pick one day in each month and confirm we get a real Menaion title.
const sampleDates: [string, Date, string][] = [
  ["Sept 8 -> Nativity of Theotokos", utc(2026, 8, 8), "The Nativity of Our Most Holy Lady the Theotokos and Ever-Virgin Mary"],
  ["Sept 14 -> Exaltation of the Cross", utc(2026, 8, 14), "The Universal Exaltation of the Precious and Life-giving Cross"],
  ["Nov 21 -> Entrance of the Theotokos", utc(2026, 10, 21), "The Entrance of the Most Holy Theotokos into the Temple"],
  ["Dec 25 -> Nativity of Christ", utc(2026, 11, 25), "The Nativity in the Flesh of Our Lord, God, and Saviour Jesus Christ"],
  ["Jan 6 -> Theophany", utc(2026, 0, 6), "The Holy Theophany of Our Lord, God, and Saviour Jesus Christ"],
  ["Feb 2 -> Meeting of the Lord", utc(2026, 1, 2), "The Meeting of Our Lord, God, and Saviour Jesus Christ in the Temple"],
  ["Mar 25 -> Annunciation", utc(2026, 2, 25), "The Annunciation to Our Most Holy Lady the Theotokos and Ever-Virgin Mary"],
  ["Aug 6 -> Transfiguration", utc(2026, 7, 6), "Holy Transfiguration of Our Lord, God, and Saviour Jesus Christ"],
  ["Aug 15 -> Dormition", utc(2026, 7, 15), "The Dormition of Our Most Holy Lady the Theotokos and Ever-Virgin Mary"],
  ["Dec 6 -> St. Nicholas", utc(2026, 11, 6), "St. Nicholas the Wonderworker, Archbishop of Myra in Lycia"],
  ["Jan 17 -> St. Anthony", utc(2026, 0, 17), "St. Anthony the Great, father of monks"],
  ["Jan 30 -> Three Hierarchs", utc(2026, 0, 30), "The Three Holy Hierarchs: Basil the Great, Gregory the Theologian, John Chrysostom"],
  ["April 23 -> St. George", utc(2026, 3, 23), "Great-martyr George the Trophy-bearer"],
];
for (const [label, date, expectedTitle] of sampleDates) {
  const c = composeDailyCommemoration(date, data);
  assertEqual(`Menaion: ${label}`, c.title, expectedTitle);
}

// Spot-check a Great-Feast hymn made it through.
const nativityHymns = composeDailyHymns(utc(2026, 11, 25), data);
assertEqual("Nativity of Christ -> 2 hymns", nativityHymns.length, 2);
assertEqual("Nativity Troparion", nativityHymns[0].title, "Troparion of the Nativity of Christ");

// --- Paschal-anchor: next-year switch ---

// Feb 14, 2027 = Zacchaeus Sunday of Pascha 2027 (May 2). Anchor should switch.
assertEqual(
  "resolvePaschalAnchor(2027-02-14) -> next year's Pascha",
  resolvePaschalAnchor(utc(2027, 1, 14)),
  { paschaYear: 2027, pdist: -77 },
);
// Feb 7, 2027 is one day too early (pdist -78 of next Pascha) — stays on 2026.
assertEqual(
  "resolvePaschalAnchor(2027-02-07) -> still 2026 tail",
  resolvePaschalAnchor(utc(2027, 1, 7)),
  { paschaYear: 2026, pdist: 301 },
);
// Dec 13, 2026 (a Sunday) is well past pdist 56 but well before next Triodion.
assertEqual(
  "resolvePaschalAnchor(2026-12-13) -> 2026 post-Pentecost tail",
  resolvePaschalAnchor(utc(2026, 11, 13)),
  { paschaYear: 2026, pdist: 245 },
);

// --- Sunday lectionary: post-Pentecost cycle ---

// June 14, 2026 (Sunday) = pdist 63 = 2nd Sunday after Pentecost.
const sun2 = composeDailyReadings(utc(2026, 5, 14), data);
assertEqual("2nd Sunday after Pentecost -> 2 readings", sun2.length, 2);
assertEqual("2nd Sunday epistle = Romans 2:10-16", sun2[0].scripture.label, "Romans 2:10-16");
assertEqual("2nd Sunday gospel = Matthew 4:18-23", sun2[1].scripture.label, "Matthew 4:18-23");

// July 26, 2026 (Sunday) = pdist 105 = 8th Sunday after Pentecost.
const sun8 = composeDailyReadings(utc(2026, 6, 26), data);
assertEqual("8th Sunday epistle = 1 Cor 1:10-18", sun8[0].scripture.label, "1 Corinthians 1:10-18");

// Sept 27, 2026 (Sunday) = pdist 168 = 17th Sunday (last Matthew before Lukan cycle).
const sun17 = composeDailyReadings(utc(2026, 8, 27), data);
assertEqual("17th Sunday gospel = Matt 15:21-28", sun17[1].scripture.label, "Matthew 15:21-28");

// Oct 4, 2026 (Sunday) = pdist 175 = 18th Sunday = 1st Sunday of Luke.
const sun18 = composeDailyReadings(utc(2026, 9, 4), data);
assertEqual("18th Sunday gospel = Luke 5:1-11", sun18[1].scripture.label, "Luke 5:1-11");

// Dec 13, 2026 (Sunday) = pdist 245 = 28th Sunday.
const sun28 = composeDailyReadings(utc(2026, 11, 13), data);
assertEqual("28th Sunday gospel = Luke 14:16-24", sun28[1].scripture.label, "Luke 14:16-24");

// Feb 14, 2027 (Sunday) = Zacchaeus = anchor switched to Pascha 2027. Readings present.
const zacchaeus = composeDailyReadings(utc(2027, 1, 14), data);
assertEqual("Zacchaeus 2027 -> 2 readings via next-year anchor", zacchaeus.length, 2);
assertEqual("Zacchaeus gospel = Luke 19:1-10", zacchaeus[1].scripture.label, "Luke 19:1-10");

// --- Triodion and Lenten Sundays ---

// Pascha 2026 was Apr 12. 2026 Triodion Sundays anchored to 2026:
//   pdist -77 = Zacchaeus = Jan 25, 2026
//   pdist -70 = Publican & Pharisee = Feb 1, 2026
const pubPhar = composeDailyReadings(utc(2026, 1, 1), data);
assertEqual("Publican and Pharisee 2026 -> Luke 18:10-14", pubPhar[1].scripture.label, "Luke 18:10-14");

// Sunday of Orthodoxy 2026 = Pascha 2026 - 42 = March 1, 2026
const orthodoxy = composeDailyReadings(utc(2026, 2, 1), data);
assertEqual("Sunday of Orthodoxy gospel = John 1:43-51", orthodoxy[1].scripture.label, "John 1:43-51");

// Lazarus Saturday = Pascha 2026 - 8 = April 4, 2026
const lazarus = composeDailyReadings(utc(2026, 3, 4), data);
assertEqual("Lazarus Saturday gospel = John 11:1-45", lazarus[1].scripture.label, "John 11:1-45");

// --- Pentecostarion daily lectionary ---

// Bright Wednesday 2026 = Pascha + 3 = April 15
const brightWed = composeDailyReadings(utc(2026, 3, 15), data);
assertEqual("Bright Wed -> 2 readings", brightWed.length, 2);
assertEqual("Bright Wed gospel = John 1:35-51", brightWed[1].scripture.label, "John 1:35-51");

// May 19, 2026 (today) = pdist 37 = Tuesday week 6 of Pentecostarion
const today = composeDailyReadings(utc(2026, 4, 19), data);
assertEqual("May 19 2026 -> 2 readings (week 6 Tuesday)", today.length, 2);
assertEqual("May 19 epistle = Acts 17:19-28", today[0].scripture.label, "Acts 17:19-28");
assertEqual("May 19 gospel = John 12:19-36", today[1].scripture.label, "John 12:19-36");

// Mid-Pentecost (Wed week 4) = pdist 24 = May 6, 2026 — already had readings, verify still there
const midPent = composeDailyReadings(utc(2026, 4, 6), data);
assertEqual("Mid-Pentecost still has readings", midPent.length, 2);
assertEqual("Mid-Pentecost gospel = John 7:14-30", midPent[1].scripture.label, "John 7:14-30");

// Saturday of Souls (Sat before Pentecost) = pdist 48 = May 30, 2026
const satSouls = composeDailyReadings(utc(2026, 4, 30), data);
assertEqual("Saturday of Souls -> Acts 28:1-31", satSouls[0].scripture.label, "Acts 28:1-31");

// --- Post-Pentecost weekday lectionary spot-checks ---

// Pascha 2026 = Apr 12 → Tuesday after Pentecost (pdist 51) = June 2, 2026
const week1Tue = composeDailyReadings(utc(2026, 5, 2), data);
assertEqual("Pentecost week Tue -> Rom 1:1-17", week1Tue[0].scripture.label, "Romans 1:1-17");

// pdist 64 = Mon week 3 = June 15, 2026
const week3Mon = composeDailyReadings(utc(2026, 5, 15), data);
assertEqual("Week 3 Mon -> Rom 7:1-13", week3Mon[0].scripture.label, "Romans 7:1-13");

// pdist 162 = Mon week 17 = Sep 21, 2026 (Lukan jump: gospel switches to Luke)
const week17Mon = composeDailyReadings(utc(2026, 8, 21), data);
assertEqual(
  "Week 17 Mon (Lukan jump) gospel = Luke 3:19-22",
  week17Mon[1].scripture.label,
  "Luke 3:19-22",
);

// pdist 169 = Mon week 18 = Sep 28, 2026 (Philippians begins)
const week18Mon = composeDailyReadings(utc(2026, 8, 28), data);
assertEqual(
  "Week 18 Mon epistle = Philippians 1:1-7",
  week18Mon[0].scripture.label,
  "Philippians 1:1-7",
);

// pdist 116 = Thu week 10 (transition to 2 Cor) = Aug 6, 2026
// — but Aug 6 is also Transfiguration (fixed), so readings layer.
const aug6 = composeDailyReadings(utc(2026, 7, 6), data);
assertEqual(
  "Aug 6 (Transfiguration + weekday) -> includes 2 Peter 1:10-19 (fixed Transfiguration)",
  aug6.some((r) => r.scripture.label === "2 Peter 1:10-19"),
  true,
);

// --- Saint linking (composer passes through Menaion saintIds) ---

const nicholas = composeDailyCommemoration(utc(2026, 11, 6), data);
assertEqual("Dec 6 saintIds = [nicholas-of-myra]", nicholas.saintIds, ["nicholas-of-myra"]);

const threeHierarchs = composeDailyCommemoration(utc(2026, 0, 30), data);
assertEqual(
  "Jan 30 saintIds = [basil, gregory-theologian, chrysostom]",
  threeHierarchs.saintIds,
  ["basil-the-great", "gregory-the-theologian", "john-chrysostom"],
);

const peterPaul = composeDailyCommemoration(utc(2026, 5, 29), data);
assertEqual(
  "June 29 saintIds = [peter, paul]",
  peterPaul.saintIds,
  ["apostle-peter", "apostle-paul"],
);

// A day without a Person link returns empty saintIds (does not crash).
const mayNineteen = composeDailyCommemoration(utc(2026, 4, 19), data);
assertEqual("May 19 (no linked Person) -> saintIds empty", mayNineteen.saintIds, []);

// --- Multi-saint days surface additionalCommemorations ---

// June 30: Synaxis of the Twelve Apostles — 12 named co-commemorations.
const twelveApostles = composeDailyCommemoration(utc(2026, 5, 30), data);
assertEqual(
  "June 30 Synaxis of Twelve Apostles -> 12 co-commemorations",
  twelveApostles.additionalCommemorations.length,
  12,
);
// First listed co-commemoration is Apostle Peter, with the saintId set.
assertEqual(
  "June 30 first co-commemoration is Apostle Peter",
  twelveApostles.additionalCommemorations[0].name,
  "Apostle Peter",
);
assertEqual(
  "June 30 Apostle Peter has saintId",
  twelveApostles.additionalCommemorations[0].saintId,
  "apostle-peter",
);

// November 8: Synaxis of Archangels — 6 co-commemorations (Michael in title).
const michaelDay = composeDailyCommemoration(utc(2026, 10, 8), data);
assertEqual(
  "Nov 8 -> 6 co-commemorations (Gabriel through Barachiel)",
  michaelDay.additionalCommemorations.length,
  6,
);

// Days without enrichment: additionalCommemorations is an empty array.
const justMay19 = composeDailyCommemoration(utc(2026, 4, 19), data);
assertEqual("May 19 -> 0 co-commemorations", justMay19.additionalCommemorations.length, 0);

// When a movable feast outranks the Menaion, the Menaion entry becomes a
// co-commemoration so the day's saint isn't lost.
// May 21 2026 = Ascension (pdist 39, movable wins) + Sts. Constantine & Helen (Menaion).
const ascensionDay = composeDailyCommemoration(utc(2026, 4, 21), data);
assertEqual(
  "Ascension day promotes the Menaion entry into additionalCommemorations",
  ascensionDay.additionalCommemorations[0].name,
  "Holy Equal-to-the-Apostles Constantine and his mother Helena",
);

// Enrichment-promoted primaries: when a major saint is the principal
// commemoration of a day, the enrichment script overrides the bulk-written
// Menaion title.
const vladimirDay = composeDailyCommemoration(utc(2026, 6, 15), data);
assertEqual(
  "July 15 -> Vladimir of Kiev is the primary title",
  vladimirDay.title,
  "Holy Equal-to-the-Apostles Great Prince Vladimir of Kiev",
);
assertEqual(
  "July 15 -> Cyricus and Julitta demoted to additionalCommemorations",
  vladimirDay.additionalCommemorations[0].name,
  "Martyrs Cyricus and his mother Julitta",
);

const borisGlebDay = composeDailyCommemoration(utc(2026, 6, 24), data);
assertEqual(
  "July 24 -> Boris and Gleb is the primary title",
  borisGlebDay.title,
  "Holy Passion-Bearers Boris and Gleb",
);

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll calendar tests passed.");
