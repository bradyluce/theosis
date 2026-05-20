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
// And the Menaion entry should be folded into the life excerpt as "also".
assertEqual(
  "May 21 lifeExcerpt mentions Constantine and Helena",
  constantineHelena.lifeExcerpt.includes("Constantine"),
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

const may19Readings = composeDailyReadings(utc(2026, 4, 19), data);
assertEqual("May 19 2026 (no movable + no fixed) -> empty readings", may19Readings.length, 0);

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

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll calendar tests passed.");
