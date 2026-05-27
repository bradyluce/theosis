// Editorial reading-plan corpus. Static data — no I/O, no React, no
// Node-specific deps — so both the web app (server-side render) and the
// mobile app (Metro bundle) can import the same plans.

import type {
  ReadingPlan,
  ReadingPlanDay,
  ReadingPlanReading,
} from "./types";

// New Testament chapter counts in canonical Eastern order. Drives the
// 90-day NT plan distribution.
const NT_BOOKS: ReadonlyArray<{ slug: string; name: string; chapters: number }> = [
  { slug: "matthew", name: "Matthew", chapters: 28 },
  { slug: "mark", name: "Mark", chapters: 16 },
  { slug: "luke", name: "Luke", chapters: 24 },
  { slug: "john", name: "John", chapters: 21 },
  { slug: "acts", name: "Acts", chapters: 28 },
  { slug: "romans", name: "Romans", chapters: 16 },
  { slug: "first-corinthians", name: "1 Corinthians", chapters: 16 },
  { slug: "second-corinthians", name: "2 Corinthians", chapters: 13 },
  { slug: "galatians", name: "Galatians", chapters: 6 },
  { slug: "ephesians", name: "Ephesians", chapters: 6 },
  { slug: "philippians", name: "Philippians", chapters: 4 },
  { slug: "colossians", name: "Colossians", chapters: 4 },
  { slug: "first-thessalonians", name: "1 Thessalonians", chapters: 5 },
  { slug: "second-thessalonians", name: "2 Thessalonians", chapters: 3 },
  { slug: "first-timothy", name: "1 Timothy", chapters: 6 },
  { slug: "second-timothy", name: "2 Timothy", chapters: 4 },
  { slug: "titus", name: "Titus", chapters: 3 },
  { slug: "philemon", name: "Philemon", chapters: 1 },
  { slug: "hebrews", name: "Hebrews", chapters: 13 },
  { slug: "james", name: "James", chapters: 5 },
  { slug: "first-peter", name: "1 Peter", chapters: 5 },
  { slug: "second-peter", name: "2 Peter", chapters: 3 },
  { slug: "first-john", name: "1 John", chapters: 5 },
  { slug: "second-john", name: "2 John", chapters: 1 },
  { slug: "third-john", name: "3 John", chapters: 1 },
  { slug: "jude", name: "Jude", chapters: 1 },
  { slug: "revelation", name: "Revelation", chapters: 22 },
];

function flattenNtChapters(): Array<{
  bookSlug: string;
  bookName: string;
  chapter: number;
}> {
  const out: Array<{ bookSlug: string; bookName: string; chapter: number }> = [];
  for (const book of NT_BOOKS) {
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      out.push({ bookSlug: book.slug, bookName: book.name, chapter });
    }
  }
  return out;
}

function buildDayReadings(
  chapters: Array<{ bookSlug: string; bookName: string; chapter: number }>,
): ReadingPlanReading[] {
  const out: ReadingPlanReading[] = [];
  for (const ch of chapters) {
    const last = out[out.length - 1];
    if (
      last &&
      last.bookSlug === ch.bookSlug &&
      (last.chapterEnd ?? last.chapterNumber) + 1 === ch.chapter
    ) {
      last.chapterEnd = ch.chapter;
      last.label = `${ch.bookName} ${last.chapterNumber}-${ch.chapter}`;
    } else {
      out.push({
        label: `${ch.bookName} ${ch.chapter}`,
        bookSlug: ch.bookSlug,
        chapterNumber: ch.chapter,
      });
    }
  }
  return out;
}

function buildNtPlan(): ReadingPlan {
  const chapters = flattenNtChapters();
  const totalChapters = chapters.length;
  const totalDays = 90;
  const baseChaptersPerDay = Math.floor(totalChapters / totalDays);
  const extraDays = totalChapters - baseChaptersPerDay * totalDays;

  const days: ReadingPlanDay[] = [];
  let cursor = 0;
  for (let d = 1; d <= totalDays; d++) {
    const count = baseChaptersPerDay + (d <= extraDays ? 1 : 0);
    const slice = chapters.slice(cursor, cursor + count);
    cursor += count;
    days.push({ day: d, readings: buildDayReadings(slice) });
  }

  return {
    id: "plan-nt-90",
    slug: "nt-90",
    title: "Through the New Testament",
    subtitle: "Read every book of the New Testament in 90 days.",
    category: "scripture",
    summary:
      "A three-month walk through the New Testament in canonical Eastern order — the four Gospels, Acts, the Pauline epistles, the General epistles, and Revelation. About three chapters a day.",
    totalDays,
    estimatedMinutesPerDay: 12,
    days,
  };
}

function buildPsalterPlan(): ReadingPlan {
  const days: ReadingPlanDay[] = [];
  for (let d = 1; d <= 30; d++) {
    const start = (d - 1) * 5 + 1;
    const end = d * 5;
    days.push({
      day: d,
      readings: [
        {
          label: `Psalms ${start}-${end}`,
          bookSlug: "psalms",
          chapterNumber: start,
          chapterEnd: end,
        },
      ],
    });
  }
  return {
    id: "plan-psalter-30",
    slug: "psalter-30",
    title: "The Psalter in a Month",
    subtitle: "Five psalms a day — the whole Psalter in thirty days.",
    category: "psalter",
    summary:
      "Pray the whole Psalter — the prayerbook of the Church — over the course of a month. Each day covers five psalms. Numbering follows the LXX in Orthodox translations and the MT (KJV/RSV) in the English Bibles bundled with the app.",
    totalDays: 30,
    estimatedMinutesPerDay: 10,
    days,
  };
}

function buildHolyWeekPlan(): ReadingPlan {
  const days: ReadingPlanDay[] = [
    {
      day: 1,
      label: "Lazarus Saturday",
      readings: [
        {
          label: "John 11:1-45",
          bookSlug: "john",
          chapterNumber: 11,
          verseStart: 1,
          verseEnd: 45,
        },
      ],
      note: "Christ raises Lazarus from the dead — a foreshadowing of His own Pascha.",
    },
    {
      day: 2,
      label: "Palm Sunday",
      readings: [
        {
          label: "John 12:1-18",
          bookSlug: "john",
          chapterNumber: 12,
          verseStart: 1,
          verseEnd: 18,
        },
      ],
      note: "The entrance into Jerusalem. The Lord comes as King.",
    },
    {
      day: 3,
      label: "Holy Monday",
      readings: [
        {
          label: "Matthew 21:18-43",
          bookSlug: "matthew",
          chapterNumber: 21,
          verseStart: 18,
          verseEnd: 43,
        },
      ],
      note: "The barren fig tree and the temple. Joseph the Patriarch is also commemorated.",
    },
    {
      day: 4,
      label: "Holy Tuesday",
      readings: [
        {
          label: "Matthew 22:15-23:39",
          bookSlug: "matthew",
          chapterNumber: 22,
          verseStart: 15,
        },
      ],
      note: "The Lord's last teachings in the temple. The parable of the ten virgins is recalled at Matins.",
    },
    {
      day: 5,
      label: "Holy Wednesday",
      readings: [
        {
          label: "John 12:17-50",
          bookSlug: "john",
          chapterNumber: 12,
          verseStart: 17,
          verseEnd: 50,
        },
      ],
      note: "The anointing at Bethany. Holy Unction is served in many parishes this evening.",
    },
    {
      day: 6,
      label: "Holy Thursday",
      readings: [
        {
          label: "Luke 22:1-39",
          bookSlug: "luke",
          chapterNumber: 22,
          verseStart: 1,
          verseEnd: 39,
        },
      ],
      note: "The Mystical Supper — the Lord institutes the Eucharist.",
    },
    {
      day: 7,
      label: "Holy Friday",
      readings: [
        {
          label: "John 18:1-19:42",
          bookSlug: "john",
          chapterNumber: 18,
          verseStart: 1,
        },
      ],
      note: "The Passion. Many keep a deeper fast and stand for the Twelve Gospels.",
    },
    {
      day: 8,
      label: "Holy Saturday",
      readings: [
        {
          label: "Matthew 27:62-28:20",
          bookSlug: "matthew",
          chapterNumber: 27,
          verseStart: 62,
        },
      ],
      note: "The Lord is in the tomb. He preaches to the spirits in Hades.",
    },
    {
      day: 9,
      label: "Pascha",
      readings: [
        {
          label: "John 1:1-17",
          bookSlug: "john",
          chapterNumber: 1,
          verseStart: 1,
          verseEnd: 17,
        },
      ],
      note: "Christ is risen! The Gospel of the Resurrection, read at the Paschal Liturgy.",
    },
  ];

  return {
    id: "plan-holy-week",
    slug: "holy-week",
    title: "Holy Week, Day by Day",
    subtitle: "Walk with Christ from Lazarus Saturday to Pascha.",
    category: "season",
    summary:
      "Nine days from the raising of Lazarus through the Bright Sunday of Pascha — one Gospel reading per day, paired with a short note on the service of the day.",
    totalDays: 9,
    estimatedMinutesPerDay: 8,
    days,
  };
}

export const readingPlans: ReadingPlan[] = [
  buildNtPlan(),
  buildPsalterPlan(),
  buildHolyWeekPlan(),
];

export function getReadingPlanById(id: string): ReadingPlan | undefined {
  return readingPlans.find((plan) => plan.id === id);
}

export function getReadingPlanBySlug(slug: string): ReadingPlan | undefined {
  return readingPlans.find((plan) => plan.slug === slug);
}
