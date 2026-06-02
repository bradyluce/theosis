// Generates post-Pentecost weekday lectionary entries (Mon-Sat) and merges
// them into content/normalized/calendar/lectionary.json under the `movable`
// key (pdist-indexed).
//
// Run with: tsx scripts/ingest/build-weekday-lectionary.ts
//
// References follow the standard Greek/Slavic Orthodox post-Pentecost
// weekday cycle. Continuous reading of Romans → 1 Corinthians → 2 Corinthians
// for the apostle, and of Matthew for the gospel through the first ~11 weeks.
// Saturday readings draw from earlier in the same book (Saturdays have their
// own micro-cycle in the Orthodox lectionary tradition).
//
// Sundays are excluded — they're already populated by the post-Pentecost
// Sunday cycle. Named days that fall in the pdist range (Holy Spirit Day,
// Ascension, etc.) keep their existing entries; this script only adds
// pdists that aren't already populated.

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

type WeekdayReading = {
  pdist: number;
  weekLabel: string;
  dayLabel: string;
  epistle: { book: string; bookName: string; chapter: number; from: number; to: number };
  gospel: { book: string; bookName: string; chapter: number; from: number; to: number };
};

// Weekday readings for weeks 1-10 after Pentecost. Sundays (pdist 56, 63,
// 70, 77, 84, 91, 98, 105, 112, 119) are excluded — they have their own
// entries elsewhere in lectionary.json.
const READINGS: WeekdayReading[] = [
  // Week 1 (Trinity / Pentecost week — fast-free; pdist 50 Mon is Holy Spirit Day
  // and already covered in lectionary.json)
  { pdist: 51, weekLabel: "Week 1", dayLabel: "Tuesday", epistle: { book: "romans", bookName: "Romans", chapter: 1, from: 1, to: 17 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 4, from: 25, to: 5 } },
  { pdist: 52, weekLabel: "Week 1", dayLabel: "Wednesday", epistle: { book: "romans", bookName: "Romans", chapter: 1, from: 18, to: 27 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 5, from: 20, to: 26 } },
  { pdist: 53, weekLabel: "Week 1", dayLabel: "Thursday", epistle: { book: "romans", bookName: "Romans", chapter: 1, from: 28, to: 32 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 5, from: 27, to: 32 } },
  { pdist: 54, weekLabel: "Week 1", dayLabel: "Friday", epistle: { book: "romans", bookName: "Romans", chapter: 2, from: 14, to: 29 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 5, from: 33, to: 41 } },
  { pdist: 55, weekLabel: "Week 1", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 1, from: 7, to: 12 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 5, from: 42, to: 48 } },

  // Week 2 (after All Saints Sunday)
  { pdist: 57, weekLabel: "Week 2", dayLabel: "Monday", epistle: { book: "romans", bookName: "Romans", chapter: 2, from: 28, to: 29 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 6, from: 31, to: 34 } },
  { pdist: 58, weekLabel: "Week 2", dayLabel: "Tuesday", epistle: { book: "romans", bookName: "Romans", chapter: 4, from: 4, to: 12 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 7, from: 15, to: 21 } },
  { pdist: 59, weekLabel: "Week 2", dayLabel: "Wednesday", epistle: { book: "romans", bookName: "Romans", chapter: 4, from: 13, to: 25 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 7, from: 21, to: 23 } },
  { pdist: 60, weekLabel: "Week 2", dayLabel: "Thursday", epistle: { book: "romans", bookName: "Romans", chapter: 5, from: 10, to: 16 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 8, from: 23, to: 27 } },
  { pdist: 61, weekLabel: "Week 2", dayLabel: "Friday", epistle: { book: "romans", bookName: "Romans", chapter: 5, from: 17, to: 21 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 9, from: 14, to: 17 } },
  { pdist: 62, weekLabel: "Week 2", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 3, from: 19, to: 26 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 7, from: 1, to: 8 } },

  // Week 3
  { pdist: 64, weekLabel: "Week 3", dayLabel: "Monday", epistle: { book: "romans", bookName: "Romans", chapter: 7, from: 1, to: 13 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 9, from: 36, to: 38 } },
  { pdist: 65, weekLabel: "Week 3", dayLabel: "Tuesday", epistle: { book: "romans", bookName: "Romans", chapter: 7, from: 14, to: 25 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 10, from: 9, to: 15 } },
  { pdist: 66, weekLabel: "Week 3", dayLabel: "Wednesday", epistle: { book: "romans", bookName: "Romans", chapter: 8, from: 2, to: 13 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 10, from: 16, to: 22 } },
  { pdist: 67, weekLabel: "Week 3", dayLabel: "Thursday", epistle: { book: "romans", bookName: "Romans", chapter: 8, from: 22, to: 27 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 10, from: 23, to: 31 } },
  { pdist: 68, weekLabel: "Week 3", dayLabel: "Friday", epistle: { book: "romans", bookName: "Romans", chapter: 9, from: 6, to: 19 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 10, from: 32, to: 36 } },
  { pdist: 69, weekLabel: "Week 3", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 3, from: 28, to: 31 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 7, from: 24, to: 29 } },

  // Week 4
  { pdist: 71, weekLabel: "Week 4", dayLabel: "Monday", epistle: { book: "romans", bookName: "Romans", chapter: 9, from: 18, to: 33 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 11, from: 2, to: 15 } },
  { pdist: 72, weekLabel: "Week 4", dayLabel: "Tuesday", epistle: { book: "romans", bookName: "Romans", chapter: 10, from: 11, to: 21 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 11, from: 16, to: 20 } },
  { pdist: 73, weekLabel: "Week 4", dayLabel: "Wednesday", epistle: { book: "romans", bookName: "Romans", chapter: 11, from: 2, to: 12 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 11, from: 20, to: 26 } },
  { pdist: 74, weekLabel: "Week 4", dayLabel: "Thursday", epistle: { book: "romans", bookName: "Romans", chapter: 11, from: 13, to: 24 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 11, from: 27, to: 30 } },
  { pdist: 75, weekLabel: "Week 4", dayLabel: "Friday", epistle: { book: "romans", bookName: "Romans", chapter: 11, from: 25, to: 36 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 12, from: 1, to: 8 } },
  { pdist: 76, weekLabel: "Week 4", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 6, from: 11, to: 17 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 8, from: 14, to: 23 } },

  // Week 5
  { pdist: 78, weekLabel: "Week 5", dayLabel: "Monday", epistle: { book: "romans", bookName: "Romans", chapter: 12, from: 4, to: 21 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 12, from: 9, to: 13 } },
  { pdist: 79, weekLabel: "Week 5", dayLabel: "Tuesday", epistle: { book: "romans", bookName: "Romans", chapter: 14, from: 9, to: 18 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 12, from: 14, to: 30 } },
  { pdist: 80, weekLabel: "Week 5", dayLabel: "Wednesday", epistle: { book: "romans", bookName: "Romans", chapter: 15, from: 7, to: 16 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 12, from: 38, to: 45 } },
  { pdist: 81, weekLabel: "Week 5", dayLabel: "Thursday", epistle: { book: "romans", bookName: "Romans", chapter: 15, from: 17, to: 29 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 12, from: 46, to: 50 } },
  { pdist: 82, weekLabel: "Week 5", dayLabel: "Friday", epistle: { book: "romans", bookName: "Romans", chapter: 16, from: 1, to: 16 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 13, from: 3, to: 9 } },
  { pdist: 83, weekLabel: "Week 5", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 8, from: 14, to: 21 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 9, from: 9, to: 13 } },

  // Week 6
  { pdist: 85, weekLabel: "Week 6", dayLabel: "Monday", epistle: { book: "romans", bookName: "Romans", chapter: 16, from: 17, to: 24 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 13, from: 10, to: 23 } },
  { pdist: 86, weekLabel: "Week 6", dayLabel: "Tuesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 1, from: 1, to: 9 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 13, from: 24, to: 30 } },
  { pdist: 87, weekLabel: "Week 6", dayLabel: "Wednesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 2, from: 9, to: 16 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 13, from: 31, to: 36 } },
  { pdist: 88, weekLabel: "Week 6", dayLabel: "Thursday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 3, from: 18, to: 23 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 13, from: 36, to: 43 } },
  { pdist: 89, weekLabel: "Week 6", dayLabel: "Friday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 4, from: 5, to: 8 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 13, from: 44, to: 54 } },
  { pdist: 90, weekLabel: "Week 6", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 9, from: 1, to: 5 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 9, from: 18, to: 26 } },

  // Week 7
  { pdist: 92, weekLabel: "Week 7", dayLabel: "Monday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 5, from: 9, to: 13 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 13, from: 54, to: 58 } },
  { pdist: 93, weekLabel: "Week 7", dayLabel: "Tuesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 6, from: 20, to: 20 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 14, from: 1, to: 13 } },
  { pdist: 94, weekLabel: "Week 7", dayLabel: "Wednesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 7, from: 12, to: 24 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 14, from: 35, to: 36 } },
  { pdist: 95, weekLabel: "Week 7", dayLabel: "Thursday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 7, from: 24, to: 35 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 15, from: 12, to: 21 } },
  { pdist: 96, weekLabel: "Week 7", dayLabel: "Friday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 7, from: 35, to: 40 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 15, from: 29, to: 31 } },
  { pdist: 97, weekLabel: "Week 7", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 12, from: 1, to: 3 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 10, from: 37, to: 42 } },

  // Week 8
  { pdist: 99, weekLabel: "Week 8", dayLabel: "Monday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 9, from: 13, to: 18 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 16, from: 1, to: 6 } },
  { pdist: 100, weekLabel: "Week 8", dayLabel: "Tuesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 10, from: 5, to: 12 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 16, from: 6, to: 12 } },
  { pdist: 101, weekLabel: "Week 8", dayLabel: "Wednesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 10, from: 12, to: 22 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 16, from: 20, to: 24 } },
  { pdist: 102, weekLabel: "Week 8", dayLabel: "Thursday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 10, from: 28, to: 33 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 16, from: 24, to: 28 } },
  { pdist: 103, weekLabel: "Week 8", dayLabel: "Friday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 11, from: 8, to: 22 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 17, from: 10, to: 18 } },
  { pdist: 104, weekLabel: "Week 8", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 13, from: 1, to: 10 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 12, from: 30, to: 37 } },

  // Week 9
  { pdist: 106, weekLabel: "Week 9", dayLabel: "Monday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 11, from: 31, to: 34 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 18, from: 1, to: 11 } },
  { pdist: 107, weekLabel: "Week 9", dayLabel: "Tuesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 12, from: 12, to: 26 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 18, from: 18, to: 22 } },
  { pdist: 108, weekLabel: "Week 9", dayLabel: "Wednesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 13, from: 4, to: 13 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 20, from: 1, to: 16 } },
  { pdist: 109, weekLabel: "Week 9", dayLabel: "Thursday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 14, from: 6, to: 19 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 20, from: 17, to: 28 } },
  { pdist: 110, weekLabel: "Week 9", dayLabel: "Friday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 14, from: 26, to: 40 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 21, from: 12, to: 20 } },
  { pdist: 111, weekLabel: "Week 9", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 14, from: 6, to: 9 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 15, from: 32, to: 39 } },

  // Week 10
  { pdist: 113, weekLabel: "Week 10", dayLabel: "Monday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 15, from: 12, to: 19 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 21, from: 18, to: 22 } },
  { pdist: 114, weekLabel: "Week 10", dayLabel: "Tuesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 15, from: 29, to: 38 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 21, from: 23, to: 27 } },
  { pdist: 115, weekLabel: "Week 10", dayLabel: "Wednesday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 16, from: 4, to: 12 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 21, from: 28, to: 32 } },
  { pdist: 116, weekLabel: "Week 10", dayLabel: "Thursday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 1, from: 1, to: 7 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 21, from: 43, to: 46 } },
  { pdist: 117, weekLabel: "Week 10", dayLabel: "Friday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 1, from: 12, to: 20 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 22, from: 23, to: 33 } },
  { pdist: 118, weekLabel: "Week 10", dayLabel: "Saturday", epistle: { book: "romans", bookName: "Romans", chapter: 15, from: 30, to: 33 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 17, from: 24, to: 27 } },

  // Week 11
  { pdist: 120, weekLabel: "Week 11", dayLabel: "Monday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 2, from: 3, to: 15 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 23, from: 13, to: 22 } },
  { pdist: 121, weekLabel: "Week 11", dayLabel: "Tuesday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 2, from: 14, to: 17 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 23, from: 23, to: 28 } },
  { pdist: 122, weekLabel: "Week 11", dayLabel: "Wednesday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 3, from: 4, to: 11 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 23, from: 29, to: 39 } },
  { pdist: 123, weekLabel: "Week 11", dayLabel: "Thursday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 4, from: 1, to: 6 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 24, from: 13, to: 28 } },
  { pdist: 124, weekLabel: "Week 11", dayLabel: "Friday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 4, from: 13, to: 18 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 24, from: 27, to: 33 } },
  { pdist: 125, weekLabel: "Week 11", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 1, from: 3, to: 9 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 19, from: 3, to: 12 } },

  // Week 12
  { pdist: 127, weekLabel: "Week 12", dayLabel: "Monday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 5, from: 10, to: 15 }, gospel: { book: "mark", bookName: "Mark", chapter: 1, from: 9, to: 15 } },
  { pdist: 128, weekLabel: "Week 12", dayLabel: "Tuesday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 5, from: 15, to: 21 }, gospel: { book: "mark", bookName: "Mark", chapter: 1, from: 16, to: 22 } },
  { pdist: 129, weekLabel: "Week 12", dayLabel: "Wednesday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 6, from: 11, to: 16 }, gospel: { book: "mark", bookName: "Mark", chapter: 1, from: 23, to: 28 } },
  { pdist: 130, weekLabel: "Week 12", dayLabel: "Thursday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 7, from: 1, to: 10 }, gospel: { book: "mark", bookName: "Mark", chapter: 1, from: 29, to: 35 } },
  { pdist: 131, weekLabel: "Week 12", dayLabel: "Friday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 7, from: 10, to: 16 }, gospel: { book: "mark", bookName: "Mark", chapter: 2, from: 18, to: 22 } },
  { pdist: 132, weekLabel: "Week 12", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 1, from: 26, to: 29 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 20, from: 29, to: 34 } },

  // Week 13
  { pdist: 134, weekLabel: "Week 13", dayLabel: "Monday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 8, from: 7, to: 15 }, gospel: { book: "mark", bookName: "Mark", chapter: 3, from: 6, to: 12 } },
  { pdist: 135, weekLabel: "Week 13", dayLabel: "Tuesday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 8, from: 16, to: 24 }, gospel: { book: "mark", bookName: "Mark", chapter: 3, from: 13, to: 19 } },
  { pdist: 136, weekLabel: "Week 13", dayLabel: "Wednesday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 9, from: 12, to: 15 }, gospel: { book: "mark", bookName: "Mark", chapter: 3, from: 20, to: 27 } },
  { pdist: 137, weekLabel: "Week 13", dayLabel: "Thursday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 10, from: 7, to: 18 }, gospel: { book: "mark", bookName: "Mark", chapter: 3, from: 28, to: 35 } },
  { pdist: 138, weekLabel: "Week 13", dayLabel: "Friday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 11, from: 5, to: 21 }, gospel: { book: "mark", bookName: "Mark", chapter: 4, from: 1, to: 9 } },
  { pdist: 139, weekLabel: "Week 13", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 2, from: 6, to: 9 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 22, from: 15, to: 22 } },

  // Week 14
  { pdist: 141, weekLabel: "Week 14", dayLabel: "Monday", epistle: { book: "galatians", bookName: "Galatians", chapter: 2, from: 11, to: 16 }, gospel: { book: "mark", bookName: "Mark", chapter: 5, from: 24, to: 34 } },
  { pdist: 142, weekLabel: "Week 14", dayLabel: "Tuesday", epistle: { book: "galatians", bookName: "Galatians", chapter: 2, from: 21, to: 21 }, gospel: { book: "mark", bookName: "Mark", chapter: 6, from: 1, to: 7 } },
  { pdist: 143, weekLabel: "Week 14", dayLabel: "Wednesday", epistle: { book: "galatians", bookName: "Galatians", chapter: 3, from: 15, to: 22 }, gospel: { book: "mark", bookName: "Mark", chapter: 6, from: 7, to: 13 } },
  { pdist: 144, weekLabel: "Week 14", dayLabel: "Thursday", epistle: { book: "galatians", bookName: "Galatians", chapter: 3, from: 23, to: 29 }, gospel: { book: "mark", bookName: "Mark", chapter: 6, from: 30, to: 45 } },
  { pdist: 145, weekLabel: "Week 14", dayLabel: "Friday", epistle: { book: "galatians", bookName: "Galatians", chapter: 4, from: 8, to: 21 }, gospel: { book: "mark", bookName: "Mark", chapter: 6, from: 45, to: 53 } },
  { pdist: 146, weekLabel: "Week 14", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 4, from: 1, to: 5 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 23, from: 1, to: 12 } },

  // Week 15
  { pdist: 148, weekLabel: "Week 15", dayLabel: "Monday", epistle: { book: "galatians", bookName: "Galatians", chapter: 4, from: 28, to: 31 }, gospel: { book: "mark", bookName: "Mark", chapter: 6, from: 54, to: 56 } },
  { pdist: 149, weekLabel: "Week 15", dayLabel: "Tuesday", epistle: { book: "galatians", bookName: "Galatians", chapter: 5, from: 11, to: 21 }, gospel: { book: "mark", bookName: "Mark", chapter: 7, from: 5, to: 16 } },
  { pdist: 150, weekLabel: "Week 15", dayLabel: "Wednesday", epistle: { book: "galatians", bookName: "Galatians", chapter: 6, from: 2, to: 10 }, gospel: { book: "mark", bookName: "Mark", chapter: 7, from: 14, to: 24 } },
  { pdist: 151, weekLabel: "Week 15", dayLabel: "Thursday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 1, from: 1, to: 9 }, gospel: { book: "mark", bookName: "Mark", chapter: 7, from: 24, to: 30 } },
  { pdist: 152, weekLabel: "Week 15", dayLabel: "Friday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 1, from: 7, to: 17 }, gospel: { book: "mark", bookName: "Mark", chapter: 8, from: 1, to: 10 } },
  { pdist: 153, weekLabel: "Week 15", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 4, from: 17, to: 21 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 24, from: 1, to: 13 } },

  // Week 16 — Ephesians continues; Mark gospel
  { pdist: 155, weekLabel: "Week 16", dayLabel: "Monday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 1, from: 22, to: 23 }, gospel: { book: "mark", bookName: "Mark", chapter: 10, from: 46, to: 52 } },
  { pdist: 156, weekLabel: "Week 16", dayLabel: "Tuesday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 2, from: 19, to: 22 }, gospel: { book: "mark", bookName: "Mark", chapter: 11, from: 11, to: 23 } },
  { pdist: 157, weekLabel: "Week 16", dayLabel: "Wednesday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 3, from: 8, to: 21 }, gospel: { book: "mark", bookName: "Mark", chapter: 11, from: 23, to: 26 } },
  { pdist: 158, weekLabel: "Week 16", dayLabel: "Thursday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 4, from: 14, to: 19 }, gospel: { book: "mark", bookName: "Mark", chapter: 11, from: 27, to: 33 } },
  { pdist: 159, weekLabel: "Week 16", dayLabel: "Friday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 4, from: 17, to: 25 }, gospel: { book: "mark", bookName: "Mark", chapter: 12, from: 1, to: 12 } },
  { pdist: 160, weekLabel: "Week 16", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 10, from: 23, to: 28 }, gospel: { book: "matthew", bookName: "Matthew", chapter: 24, from: 34, to: 44 } },

  // Week 17 — Lukan jump: Gospel switches to Luke; Apostle continues Ephesians
  { pdist: 162, weekLabel: "Week 17", dayLabel: "Monday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 4, from: 25, to: 32 }, gospel: { book: "luke", bookName: "Luke", chapter: 3, from: 19, to: 22 } },
  { pdist: 163, weekLabel: "Week 17", dayLabel: "Tuesday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 5, from: 20, to: 26 }, gospel: { book: "luke", bookName: "Luke", chapter: 3, from: 23, to: 38 } },
  { pdist: 164, weekLabel: "Week 17", dayLabel: "Wednesday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 5, from: 25, to: 33 }, gospel: { book: "luke", bookName: "Luke", chapter: 4, from: 1, to: 15 } },
  { pdist: 165, weekLabel: "Week 17", dayLabel: "Thursday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 5, from: 33, to: 33 }, gospel: { book: "luke", bookName: "Luke", chapter: 4, from: 16, to: 22 } },
  { pdist: 166, weekLabel: "Week 17", dayLabel: "Friday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 6, from: 18, to: 24 }, gospel: { book: "luke", bookName: "Luke", chapter: 4, from: 22, to: 30 } },
  { pdist: 167, weekLabel: "Week 17", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 15, from: 58, to: 58 }, gospel: { book: "luke", bookName: "Luke", chapter: 5, from: 17, to: 26 } },

  // Week 18 — Philippians begins; Luke continues
  { pdist: 169, weekLabel: "Week 18", dayLabel: "Monday", epistle: { book: "philippians", bookName: "Philippians", chapter: 1, from: 1, to: 7 }, gospel: { book: "luke", bookName: "Luke", chapter: 4, from: 38, to: 44 } },
  { pdist: 170, weekLabel: "Week 18", dayLabel: "Tuesday", epistle: { book: "philippians", bookName: "Philippians", chapter: 1, from: 8, to: 14 }, gospel: { book: "luke", bookName: "Luke", chapter: 5, from: 12, to: 16 } },
  { pdist: 171, weekLabel: "Week 18", dayLabel: "Wednesday", epistle: { book: "philippians", bookName: "Philippians", chapter: 1, from: 12, to: 20 }, gospel: { book: "luke", bookName: "Luke", chapter: 5, from: 33, to: 39 } },
  { pdist: 172, weekLabel: "Week 18", dayLabel: "Thursday", epistle: { book: "philippians", bookName: "Philippians", chapter: 1, from: 20, to: 27 }, gospel: { book: "luke", bookName: "Luke", chapter: 6, from: 12, to: 19 } },
  { pdist: 173, weekLabel: "Week 18", dayLabel: "Friday", epistle: { book: "philippians", bookName: "Philippians", chapter: 1, from: 27, to: 30 }, gospel: { book: "luke", bookName: "Luke", chapter: 6, from: 17, to: 23 } },
  { pdist: 174, weekLabel: "Week 18", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 14, from: 20, to: 25 }, gospel: { book: "luke", bookName: "Luke", chapter: 5, from: 27, to: 32 } },

  // Week 19 — Philippians continues; Luke continues
  { pdist: 176, weekLabel: "Week 19", dayLabel: "Monday", epistle: { book: "philippians", bookName: "Philippians", chapter: 2, from: 12, to: 16 }, gospel: { book: "luke", bookName: "Luke", chapter: 6, from: 24, to: 30 } },
  { pdist: 177, weekLabel: "Week 19", dayLabel: "Tuesday", epistle: { book: "philippians", bookName: "Philippians", chapter: 2, from: 16, to: 23 }, gospel: { book: "luke", bookName: "Luke", chapter: 6, from: 37, to: 45 } },
  { pdist: 178, weekLabel: "Week 19", dayLabel: "Wednesday", epistle: { book: "philippians", bookName: "Philippians", chapter: 2, from: 24, to: 30 }, gospel: { book: "luke", bookName: "Luke", chapter: 6, from: 46, to: 49 } },
  { pdist: 179, weekLabel: "Week 19", dayLabel: "Thursday", epistle: { book: "philippians", bookName: "Philippians", chapter: 3, from: 1, to: 8 }, gospel: { book: "luke", bookName: "Luke", chapter: 7, from: 17, to: 30 } },
  { pdist: 180, weekLabel: "Week 19", dayLabel: "Friday", epistle: { book: "philippians", bookName: "Philippians", chapter: 3, from: 8, to: 19 }, gospel: { book: "luke", bookName: "Luke", chapter: 7, from: 31, to: 35 } },
  { pdist: 181, weekLabel: "Week 19", dayLabel: "Saturday", epistle: { book: "first-corinthians", bookName: "1 Corinthians", chapter: 15, from: 39, to: 45 }, gospel: { book: "luke", bookName: "Luke", chapter: 6, from: 1, to: 10 } },

  // Week 20 — Colossians begins; Luke continues
  { pdist: 183, weekLabel: "Week 20", dayLabel: "Monday", epistle: { book: "colossians", bookName: "Colossians", chapter: 1, from: 1, to: 11 }, gospel: { book: "luke", bookName: "Luke", chapter: 7, from: 36, to: 50 } },
  { pdist: 184, weekLabel: "Week 20", dayLabel: "Tuesday", epistle: { book: "colossians", bookName: "Colossians", chapter: 1, from: 12, to: 18 }, gospel: { book: "luke", bookName: "Luke", chapter: 8, from: 1, to: 3 } },
  { pdist: 185, weekLabel: "Week 20", dayLabel: "Wednesday", epistle: { book: "colossians", bookName: "Colossians", chapter: 1, from: 18, to: 23 }, gospel: { book: "luke", bookName: "Luke", chapter: 8, from: 22, to: 25 } },
  { pdist: 186, weekLabel: "Week 20", dayLabel: "Thursday", epistle: { book: "colossians", bookName: "Colossians", chapter: 1, from: 24, to: 29 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 7, to: 11 } },
  { pdist: 187, weekLabel: "Week 20", dayLabel: "Friday", epistle: { book: "colossians", bookName: "Colossians", chapter: 2, from: 1, to: 7 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 12, to: 18 } },
  { pdist: 188, weekLabel: "Week 20", dayLabel: "Saturday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 1, from: 8, to: 11 }, gospel: { book: "luke", bookName: "Luke", chapter: 7, from: 1, to: 10 } },

  // Week 21 — Colossians continues; Luke continues
  { pdist: 190, weekLabel: "Week 21", dayLabel: "Monday", epistle: { book: "colossians", bookName: "Colossians", chapter: 2, from: 13, to: 20 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 18, to: 22 } },
  { pdist: 191, weekLabel: "Week 21", dayLabel: "Tuesday", epistle: { book: "colossians", bookName: "Colossians", chapter: 2, from: 20, to: 23 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 23, to: 27 } },
  { pdist: 192, weekLabel: "Week 21", dayLabel: "Wednesday", epistle: { book: "colossians", bookName: "Colossians", chapter: 3, from: 17, to: 25 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 44, to: 50 } },
  { pdist: 193, weekLabel: "Week 21", dayLabel: "Thursday", epistle: { book: "colossians", bookName: "Colossians", chapter: 4, from: 2, to: 9 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 49, to: 56 } },
  { pdist: 194, weekLabel: "Week 21", dayLabel: "Friday", epistle: { book: "colossians", bookName: "Colossians", chapter: 4, from: 10, to: 18 }, gospel: { book: "luke", bookName: "Luke", chapter: 10, from: 1, to: 15 } },
  { pdist: 195, weekLabel: "Week 21", dayLabel: "Saturday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 3, from: 12, to: 18 }, gospel: { book: "luke", bookName: "Luke", chapter: 8, from: 16, to: 21 } },

  // Week 22 — 1 Thessalonians begins; Luke continues
  { pdist: 197, weekLabel: "Week 22", dayLabel: "Monday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 1, from: 1, to: 5 }, gospel: { book: "luke", bookName: "Luke", chapter: 10, from: 22, to: 24 } },
  { pdist: 198, weekLabel: "Week 22", dayLabel: "Tuesday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 1, from: 6, to: 10 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 1, to: 10 } },
  { pdist: 199, weekLabel: "Week 22", dayLabel: "Wednesday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 2, from: 1, to: 8 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 9, to: 13 } },
  { pdist: 200, weekLabel: "Week 22", dayLabel: "Thursday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 2, from: 9, to: 14 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 14, to: 23 } },
  { pdist: 201, weekLabel: "Week 22", dayLabel: "Friday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 2, from: 14, to: 19 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 23, to: 26 } },
  { pdist: 202, weekLabel: "Week 22", dayLabel: "Saturday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 5, from: 1, to: 10 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 1, to: 6 } },

  // Week 23 — 1 Thessalonians continues; Luke continues
  { pdist: 204, weekLabel: "Week 23", dayLabel: "Monday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 2, from: 20, to: 20 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 29, to: 33 } },
  { pdist: 205, weekLabel: "Week 23", dayLabel: "Tuesday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 3, from: 9, to: 13 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 34, to: 41 } },
  { pdist: 206, weekLabel: "Week 23", dayLabel: "Wednesday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 4, from: 1, to: 12 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 42, to: 46 } },
  { pdist: 207, weekLabel: "Week 23", dayLabel: "Thursday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 5, from: 1, to: 8 }, gospel: { book: "luke", bookName: "Luke", chapter: 11, from: 47, to: 54 } },
  { pdist: 208, weekLabel: "Week 23", dayLabel: "Friday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 5, from: 9, to: 13 }, gospel: { book: "luke", bookName: "Luke", chapter: 12, from: 2, to: 12 } },
  { pdist: 209, weekLabel: "Week 23", dayLabel: "Saturday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 8, from: 1, to: 5 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 37, to: 43 } },

  // Week 24 — 2 Thessalonians begins; Luke continues
  { pdist: 211, weekLabel: "Week 24", dayLabel: "Monday", epistle: { book: "second-thessalonians", bookName: "2 Thessalonians", chapter: 1, from: 1, to: 10 }, gospel: { book: "luke", bookName: "Luke", chapter: 12, from: 13, to: 15 } },
  { pdist: 212, weekLabel: "Week 24", dayLabel: "Tuesday", epistle: { book: "second-thessalonians", bookName: "2 Thessalonians", chapter: 1, from: 10, to: 12 }, gospel: { book: "luke", bookName: "Luke", chapter: 12, from: 42, to: 48 } },
  { pdist: 213, weekLabel: "Week 24", dayLabel: "Wednesday", epistle: { book: "second-thessalonians", bookName: "2 Thessalonians", chapter: 2, from: 1, to: 12 }, gospel: { book: "luke", bookName: "Luke", chapter: 12, from: 48, to: 59 } },
  { pdist: 214, weekLabel: "Week 24", dayLabel: "Thursday", epistle: { book: "second-thessalonians", bookName: "2 Thessalonians", chapter: 2, from: 13, to: 17 }, gospel: { book: "luke", bookName: "Luke", chapter: 13, from: 1, to: 9 } },
  { pdist: 215, weekLabel: "Week 24", dayLabel: "Friday", epistle: { book: "second-thessalonians", bookName: "2 Thessalonians", chapter: 3, from: 6, to: 18 }, gospel: { book: "luke", bookName: "Luke", chapter: 13, from: 31, to: 35 } },
  { pdist: 216, weekLabel: "Week 24", dayLabel: "Saturday", epistle: { book: "second-corinthians", bookName: "2 Corinthians", chapter: 11, from: 1, to: 6 }, gospel: { book: "luke", bookName: "Luke", chapter: 9, from: 57, to: 62 } },

  // Week 25 — 1 Timothy begins; Luke continues
  { pdist: 218, weekLabel: "Week 25", dayLabel: "Monday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 1, from: 1, to: 7 }, gospel: { book: "luke", bookName: "Luke", chapter: 14, from: 12, to: 15 } },
  { pdist: 219, weekLabel: "Week 25", dayLabel: "Tuesday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 1, from: 8, to: 14 }, gospel: { book: "luke", bookName: "Luke", chapter: 14, from: 25, to: 35 } },
  { pdist: 220, weekLabel: "Week 25", dayLabel: "Wednesday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 1, from: 18, to: 20 }, gospel: { book: "luke", bookName: "Luke", chapter: 15, from: 1, to: 10 } },
  { pdist: 221, weekLabel: "Week 25", dayLabel: "Thursday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 3, from: 1, to: 13 }, gospel: { book: "luke", bookName: "Luke", chapter: 16, from: 1, to: 9 } },
  { pdist: 222, weekLabel: "Week 25", dayLabel: "Friday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 4, from: 4, to: 8 }, gospel: { book: "luke", bookName: "Luke", chapter: 16, from: 15, to: 18 } },
  { pdist: 223, weekLabel: "Week 25", dayLabel: "Saturday", epistle: { book: "galatians", bookName: "Galatians", chapter: 1, from: 3, to: 10 }, gospel: { book: "luke", bookName: "Luke", chapter: 10, from: 19, to: 21 } },

  // Week 26 — 1 Timothy continues; Luke continues
  { pdist: 225, weekLabel: "Week 26", dayLabel: "Monday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 5, from: 1, to: 10 }, gospel: { book: "luke", bookName: "Luke", chapter: 17, from: 20, to: 25 } },
  { pdist: 226, weekLabel: "Week 26", dayLabel: "Tuesday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 5, from: 11, to: 21 }, gospel: { book: "luke", bookName: "Luke", chapter: 17, from: 26, to: 37 } },
  { pdist: 227, weekLabel: "Week 26", dayLabel: "Wednesday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 5, from: 22, to: 25 }, gospel: { book: "luke", bookName: "Luke", chapter: 18, from: 15, to: 17 } },
  { pdist: 228, weekLabel: "Week 26", dayLabel: "Thursday", epistle: { book: "first-timothy", bookName: "1 Timothy", chapter: 6, from: 17, to: 21 }, gospel: { book: "luke", bookName: "Luke", chapter: 18, from: 31, to: 34 } },
  { pdist: 229, weekLabel: "Week 26", dayLabel: "Friday", epistle: { book: "second-timothy", bookName: "2 Timothy", chapter: 1, from: 1, to: 2 }, gospel: { book: "luke", bookName: "Luke", chapter: 19, from: 12, to: 28 } },
  { pdist: 230, weekLabel: "Week 26", dayLabel: "Saturday", epistle: { book: "galatians", bookName: "Galatians", chapter: 3, from: 8, to: 12 }, gospel: { book: "luke", bookName: "Luke", chapter: 10, from: 25, to: 37 } },

  // Week 27 — 2 Timothy continues; Luke continues
  { pdist: 232, weekLabel: "Week 27", dayLabel: "Monday", epistle: { book: "second-timothy", bookName: "2 Timothy", chapter: 2, from: 20, to: 26 }, gospel: { book: "luke", bookName: "Luke", chapter: 19, from: 37, to: 44 } },
  { pdist: 233, weekLabel: "Week 27", dayLabel: "Tuesday", epistle: { book: "second-timothy", bookName: "2 Timothy", chapter: 3, from: 16, to: 17 }, gospel: { book: "luke", bookName: "Luke", chapter: 19, from: 45, to: 48 } },
  { pdist: 234, weekLabel: "Week 27", dayLabel: "Wednesday", epistle: { book: "second-timothy", bookName: "2 Timothy", chapter: 4, from: 9, to: 22 }, gospel: { book: "luke", bookName: "Luke", chapter: 20, from: 1, to: 8 } },
  { pdist: 235, weekLabel: "Week 27", dayLabel: "Thursday", epistle: { book: "titus", bookName: "Titus", chapter: 1, from: 5, to: 16 }, gospel: { book: "luke", bookName: "Luke", chapter: 20, from: 9, to: 18 } },
  { pdist: 236, weekLabel: "Week 27", dayLabel: "Friday", epistle: { book: "titus", bookName: "Titus", chapter: 2, from: 1, to: 10 }, gospel: { book: "luke", bookName: "Luke", chapter: 20, from: 19, to: 26 } },
  { pdist: 237, weekLabel: "Week 27", dayLabel: "Saturday", epistle: { book: "galatians", bookName: "Galatians", chapter: 5, from: 22, to: 26 }, gospel: { book: "luke", bookName: "Luke", chapter: 12, from: 32, to: 40 } },

  // Week 28 — Hebrews begins; Luke continues
  { pdist: 239, weekLabel: "Week 28", dayLabel: "Monday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 3, from: 5, to: 11 }, gospel: { book: "luke", bookName: "Luke", chapter: 20, from: 27, to: 44 } },
  { pdist: 240, weekLabel: "Week 28", dayLabel: "Tuesday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 4, from: 1, to: 13 }, gospel: { book: "luke", bookName: "Luke", chapter: 21, from: 12, to: 19 } },
  { pdist: 241, weekLabel: "Week 28", dayLabel: "Wednesday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 5, from: 11, to: 14 }, gospel: { book: "luke", bookName: "Luke", chapter: 21, from: 5, to: 11 } },
  { pdist: 242, weekLabel: "Week 28", dayLabel: "Thursday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 7, from: 1, to: 6 }, gospel: { book: "luke", bookName: "Luke", chapter: 21, from: 28, to: 33 } },
  { pdist: 243, weekLabel: "Week 28", dayLabel: "Friday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 7, from: 18, to: 25 }, gospel: { book: "luke", bookName: "Luke", chapter: 21, from: 37, to: 38 } },
  { pdist: 244, weekLabel: "Week 28", dayLabel: "Saturday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 1, from: 16, to: 23 }, gospel: { book: "luke", bookName: "Luke", chapter: 13, from: 18, to: 29 } },

  // Week 29 — Hebrews continues; Luke continues
  { pdist: 246, weekLabel: "Week 29", dayLabel: "Monday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 8, from: 7, to: 13 }, gospel: { book: "mark", bookName: "Mark", chapter: 8, from: 11, to: 21 } },
  { pdist: 247, weekLabel: "Week 29", dayLabel: "Tuesday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 9, from: 8, to: 23 }, gospel: { book: "mark", bookName: "Mark", chapter: 8, from: 22, to: 26 } },
  { pdist: 248, weekLabel: "Week 29", dayLabel: "Wednesday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 10, from: 1, to: 18 }, gospel: { book: "mark", bookName: "Mark", chapter: 8, from: 30, to: 34 } },
  { pdist: 249, weekLabel: "Week 29", dayLabel: "Thursday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 10, from: 35, to: 38 }, gospel: { book: "mark", bookName: "Mark", chapter: 9, from: 10, to: 16 } },
  { pdist: 250, weekLabel: "Week 29", dayLabel: "Friday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 11, from: 8, to: 16 }, gospel: { book: "mark", bookName: "Mark", chapter: 9, from: 33, to: 41 } },
  { pdist: 251, weekLabel: "Week 29", dayLabel: "Saturday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 2, from: 11, to: 13 }, gospel: { book: "luke", bookName: "Luke", chapter: 13, from: 18, to: 29 } },

  // Week 30 — Hebrews continues; Mark resumes briefly before Triodion
  { pdist: 253, weekLabel: "Week 30", dayLabel: "Monday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 11, from: 17, to: 23 }, gospel: { book: "mark", bookName: "Mark", chapter: 9, from: 42, to: 50 } },
  { pdist: 254, weekLabel: "Week 30", dayLabel: "Tuesday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 12, from: 25, to: 27 }, gospel: { book: "mark", bookName: "Mark", chapter: 10, from: 2, to: 12 } },
  { pdist: 255, weekLabel: "Week 30", dayLabel: "Wednesday", epistle: { book: "hebrews", bookName: "Hebrews", chapter: 13, from: 7, to: 16 }, gospel: { book: "mark", bookName: "Mark", chapter: 10, from: 11, to: 16 } },
  { pdist: 256, weekLabel: "Week 30", dayLabel: "Thursday", epistle: { book: "james", bookName: "James", chapter: 1, from: 1, to: 18 }, gospel: { book: "mark", bookName: "Mark", chapter: 10, from: 17, to: 27 } },
  { pdist: 257, weekLabel: "Week 30", dayLabel: "Friday", epistle: { book: "james", bookName: "James", chapter: 1, from: 19, to: 27 }, gospel: { book: "mark", bookName: "Mark", chapter: 10, from: 23, to: 32 } },
  { pdist: 258, weekLabel: "Week 30", dayLabel: "Saturday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 5, from: 1, to: 8 }, gospel: { book: "luke", bookName: "Luke", chapter: 14, from: 1, to: 11 } },

  // Week 31 — James continues then 2 Peter begins; Mark continues
  { pdist: 260, weekLabel: "Week 31", dayLabel: "Monday", epistle: { book: "james", bookName: "James", chapter: 2, from: 14, to: 26 }, gospel: { book: "mark", bookName: "Mark", chapter: 10, from: 46, to: 52 } },
  { pdist: 261, weekLabel: "Week 31", dayLabel: "Tuesday", epistle: { book: "james", bookName: "James", chapter: 3, from: 1, to: 10 }, gospel: { book: "mark", bookName: "Mark", chapter: 11, from: 11, to: 23 } },
  { pdist: 262, weekLabel: "Week 31", dayLabel: "Wednesday", epistle: { book: "james", bookName: "James", chapter: 3, from: 11, to: 18 }, gospel: { book: "mark", bookName: "Mark", chapter: 11, from: 23, to: 26 } },
  { pdist: 263, weekLabel: "Week 31", dayLabel: "Thursday", epistle: { book: "james", bookName: "James", chapter: 4, from: 7, to: 17 }, gospel: { book: "mark", bookName: "Mark", chapter: 11, from: 27, to: 33 } },
  { pdist: 264, weekLabel: "Week 31", dayLabel: "Friday", epistle: { book: "james", bookName: "James", chapter: 5, from: 7, to: 20 }, gospel: { book: "mark", bookName: "Mark", chapter: 12, from: 1, to: 12 } },
  { pdist: 265, weekLabel: "Week 31", dayLabel: "Saturday", epistle: { book: "ephesians", bookName: "Ephesians", chapter: 5, from: 8, to: 19 }, gospel: { book: "luke", bookName: "Luke", chapter: 14, from: 16, to: 24 } },

  // Week 32 — 1-2 Peter; Mark continues
  { pdist: 267, weekLabel: "Week 32", dayLabel: "Monday", epistle: { book: "first-peter", bookName: "1 Peter", chapter: 1, from: 1, to: 9 }, gospel: { book: "mark", bookName: "Mark", chapter: 12, from: 13, to: 17 } },
  { pdist: 268, weekLabel: "Week 32", dayLabel: "Tuesday", epistle: { book: "first-peter", bookName: "1 Peter", chapter: 1, from: 10, to: 25 }, gospel: { book: "mark", bookName: "Mark", chapter: 12, from: 18, to: 27 } },
  { pdist: 269, weekLabel: "Week 32", dayLabel: "Wednesday", epistle: { book: "first-peter", bookName: "1 Peter", chapter: 2, from: 1, to: 10 }, gospel: { book: "mark", bookName: "Mark", chapter: 12, from: 28, to: 37 } },
  { pdist: 270, weekLabel: "Week 32", dayLabel: "Thursday", epistle: { book: "first-peter", bookName: "1 Peter", chapter: 2, from: 21, to: 25 }, gospel: { book: "mark", bookName: "Mark", chapter: 12, from: 38, to: 44 } },
  { pdist: 271, weekLabel: "Week 32", dayLabel: "Friday", epistle: { book: "first-peter", bookName: "1 Peter", chapter: 3, from: 1, to: 12 }, gospel: { book: "mark", bookName: "Mark", chapter: 13, from: 1, to: 8 } },
  { pdist: 272, weekLabel: "Week 32", dayLabel: "Saturday", epistle: { book: "first-thessalonians", bookName: "1 Thessalonians", chapter: 5, from: 14, to: 23 }, gospel: { book: "luke", bookName: "Luke", chapter: 17, from: 3, to: 10 } },

  // Week 33 — 2 Peter, then 1 John begins; Mark continues
  { pdist: 274, weekLabel: "Week 33", dayLabel: "Monday", epistle: { book: "second-peter", bookName: "2 Peter", chapter: 1, from: 20, to: 21 }, gospel: { book: "mark", bookName: "Mark", chapter: 13, from: 9, to: 13 } },
  { pdist: 275, weekLabel: "Week 33", dayLabel: "Tuesday", epistle: { book: "second-peter", bookName: "2 Peter", chapter: 2, from: 9, to: 22 }, gospel: { book: "mark", bookName: "Mark", chapter: 13, from: 14, to: 23 } },
  { pdist: 276, weekLabel: "Week 33", dayLabel: "Wednesday", epistle: { book: "second-peter", bookName: "2 Peter", chapter: 3, from: 1, to: 18 }, gospel: { book: "mark", bookName: "Mark", chapter: 13, from: 24, to: 31 } },
  { pdist: 277, weekLabel: "Week 33", dayLabel: "Thursday", epistle: { book: "first-john", bookName: "1 John", chapter: 1, from: 8, to: 10 }, gospel: { book: "mark", bookName: "Mark", chapter: 13, from: 31, to: 37 } },
  { pdist: 278, weekLabel: "Week 33", dayLabel: "Friday", epistle: { book: "first-john", bookName: "1 John", chapter: 2, from: 7, to: 17 }, gospel: { book: "mark", bookName: "Mark", chapter: 14, from: 3, to: 9 } },
  { pdist: 279, weekLabel: "Week 33", dayLabel: "Saturday", epistle: { book: "second-timothy", bookName: "2 Timothy", chapter: 2, from: 11, to: 19 }, gospel: { book: "luke", bookName: "Luke", chapter: 18, from: 2, to: 8 } },
];

function buildSlots(reading: WeekdayReading): LectionarySlot[] {
  const epistleLabel = `Apostle of ${reading.weekLabel} ${reading.dayLabel}`;
  const gospelLabel = `Gospel of ${reading.weekLabel} ${reading.dayLabel}`;
  return [
    {
      kind: "epistle",
      bookSlug: reading.epistle.book,
      bookName: reading.epistle.bookName,
      chapter: reading.epistle.chapter,
      verseStart: reading.epistle.from,
      verseEnd: reading.epistle.to,
      label: epistleLabel,
    },
    {
      kind: "gospel",
      bookSlug: reading.gospel.book,
      bookName: reading.gospel.bookName,
      chapter: reading.gospel.chapter,
      verseStart: reading.gospel.from,
      verseEnd: reading.gospel.to,
      label: gospelLabel,
    },
  ];
}

function main() {
  const filePath = path.join(process.cwd(), "content/normalized/calendar/lectionary.json");
  const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    movable: Record<string, LectionarySlot[]>;
    fixed: Record<string, LectionarySlot[]>;
    _meta?: unknown;
  };

  let added = 0;
  let skippedExisting = 0;

  for (const reading of READINGS) {
    const key = String(reading.pdist);
    if (file.movable[key]) {
      skippedExisting += 1;
      continue;
    }
    file.movable[key] = buildSlots(reading);
    added += 1;
  }

  // Keep keys sorted numerically so the JSON diffs are stable.
  const sortedMovable: Record<string, LectionarySlot[]> = {};
  Object.keys(file.movable)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((key) => {
      sortedMovable[key] = file.movable[key];
    });
  file.movable = sortedMovable;

  fs.writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  console.log(`added: ${added}  skipped (already populated): ${skippedExisting}`);
}

main();
