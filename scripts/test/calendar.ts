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

// A day genuinely outside both the Menaion and the paschal cycle:
// June 21 2026 (pdist = 70, past All Saints at +56) with no Menaion entry yet.
const june21 = composeDailyCommemoration(utc(2026, 5, 21), data);
assertEqual(
  "June 21 -> fallback when neither cycle has an entry",
  june21.title,
  "A quiet day in the Church year",
);
// Sanity check on the cycle-exit math itself.
assertEqual("pdist(2026-06-21) = 70 (outside cycle)", paschalDayOffset(utc(2026, 5, 21)), 70);

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

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll calendar tests passed.");
