// Add fixed-date lectionary entries and troparia/kontakia for major
// saint days — round 4. Same idempotent pattern as rounds 2-3.
// Run with: tsx scripts/ingest/add-fixed-feast-readings-r4.ts

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

type FixedFeastEntry = {
  date: string;
  lectionary?: LectionarySlot[];
  hymns?: HymnSlot[];
};

const ENTRIES: FixedFeastEntry[] = [
  // Feb 1 — Tryphon of Lampsacus
  {
    date: "02-01",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "romans",
        bookName: "Romans",
        chapter: 8,
        verseStart: 28,
        verseEnd: 39,
        label: "Epistle of the Martyr Tryphon",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 10,
        verseStart: 19,
        verseEnd: 21,
        label: "Gospel of the Martyr Tryphon",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Martyr Tryphon",
        text: "Thy Martyr Tryphon, O Lord, through his sufferings hath received the incorruptible crown from thee, our God; for, having thy strength, he cast down the tyrants and broke the feeble audacity of the demons. Through his intercessions save our souls.",
      },
    ],
  },
  // Feb 5 — Agatha of Sicily
  {
    date: "02-05",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of the Martyr Agatha",
      },
      {
        kind: "gospel",
        bookSlug: "mark",
        bookName: "Mark",
        chapter: 5,
        verseStart: 24,
        verseEnd: 34,
        label: "Gospel of the Martyr Agatha",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Martyr Agatha",
        text: "Thy lamb Agatha, O Jesus, crieth out with a loud voice: I love thee, my Bridegroom, and seeking thee I contest. I am crucified with thee, and in thy baptism am buried with thee. I suffer for thy sake, that I might reign with thee; I die for thee, that I might live in thee. By her prayers save our souls.",
      },
    ],
  },
  // Feb 26 — Photini the Samaritan Woman
  {
    date: "02-26",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of the Equal-to-the-Apostles Photini",
      },
      {
        kind: "gospel",
        bookSlug: "john",
        bookName: "John",
        chapter: 4,
        verseStart: 5,
        verseEnd: 42,
        label: "Gospel of the Equal-to-the-Apostles Photini",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Equal-to-the-Apostles Photini",
        text: "Illumined by the Holy Spirit, O Photini, thou didst drink with delight the water from Christ which He giveth unto those who seek; thou didst share the streams of immortality with thy people. Wherefore we honor thy contest, Great-martyr equal to the Apostles, and entreat thee to pray for the salvation of our souls.",
      },
    ],
  },
  // May 6 — Job the Long-suffering
  {
    date: "05-06",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "james",
        bookName: "James",
        chapter: 5,
        verseStart: 10,
        verseEnd: 20,
        label: "Epistle of the Righteous Job",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 21,
        verseStart: 12,
        verseEnd: 19,
        label: "Gospel of the Righteous Job",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 1",
        title: "Troparion of the Righteous Job",
        text: "Hearing the goodness of Job, thou hast emulated his pious life. Living an upright life and pleasing God in works of mercy, thou didst become a wonderworker, righteous Job: thy mercies and almsgivings preserve us, by thine intercessions, before the Master.",
      },
    ],
  },
  // Jun 14 — Prophet Elisha
  {
    date: "06-14",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "first-corinthians",
        bookName: "1 Corinthians",
        chapter: 14,
        verseStart: 20,
        verseEnd: 25,
        label: "Epistle of the Prophet Elisha",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 4,
        verseStart: 22,
        verseEnd: 30,
        label: "Gospel of the Prophet Elisha",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Prophet Elisha",
        text: "O great Prophet Elisha, thou didst receive a double portion of the spirit of Elijah, and the gift of healing all sicknesses and infirmities of body and soul. Pray now to the Lord that mercy may be granted to our souls.",
      },
    ],
  },
  // Jul 25 — Dormition of Saint Anna
  {
    date: "07-25",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 4,
        verseStart: 22,
        verseEnd: 31,
        label: "Epistle of the Holy Anna",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 8,
        verseStart: 16,
        verseEnd: 21,
        label: "Gospel of the Holy Anna",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Dormition of Saint Anna",
        text: "O Foremother of Christ, we entreat thee to send down the favors of thy daughter, the Theotokos, upon those who hymn thy memory in faith. Thou hast brought into the world the holy Mother of God who bore the eternal life. Wherefore, with joy in thy dormition thou hast departed to the Lord. Pray for those who keep thy memory.",
      },
    ],
  },
  // Aug 20 — Prophet Samuel
  {
    date: "08-20",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 11,
        verseStart: 32,
        verseEnd: 40,
        label: "Epistle of the Prophet Samuel",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 4,
        verseStart: 22,
        verseEnd: 30,
        label: "Gospel of the Prophet Samuel",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 2",
        title: "Troparion of the Prophet Samuel",
        text: "We celebrate the memory of thy prophet Samuel, O Lord: through him we beseech thee, save our souls.",
      },
    ],
  },
  // Sep 17 — Sophia and her daughters Faith, Hope, and Love
  {
    date: "09-17",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of Sophia and her Daughters",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 10,
        verseStart: 38,
        verseEnd: 42,
        label: "Gospel of Sophia and her Daughters",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of Sophia and her Daughters Faith, Hope, and Love",
        text: "The Church doth celebrate and praise as three sweet-scented flowers Faith, Hope and Love, divinely thriving; and crieth out in song to their mother Sophia, who is named for divine wisdom: Through the contests of these thy children entreat the only Lover of mankind that we be granted mercy and the divine vision.",
      },
    ],
  },
  // Sep 22 — Prophet Jonah
  {
    date: "09-22",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 11,
        verseStart: 33,
        verseEnd: 40,
        label: "Epistle of the Prophet Jonah",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 12,
        verseStart: 38,
        verseEnd: 45,
        label: "Gospel of the Prophet Jonah",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 2",
        title: "Troparion of the Prophet Jonah",
        text: "As thou didst foretell mystically the three-day burial of Christ, and didst preach repentance unto Nineveh, do thou ever pray for us, O Prophet Jonah.",
      },
    ],
  },
  // Nov 17 — Gregory the Wonderworker
  {
    date: "11-17",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 7,
        verseStart: 26,
        verseEnd: 28,
        label: "Epistle of the Hierarch Gregory the Wonderworker",
      },
      {
        kind: "gospel",
        bookSlug: "john",
        bookName: "John",
        chapter: 10,
        verseStart: 9,
        verseEnd: 16,
        label: "Gospel of the Hierarch Gregory the Wonderworker",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 8",
        title: "Troparion of Gregory the Wonderworker",
        text: "Thou didst become worthy of thy name through thy manner of life; through thy faith, O wonderworker Gregory, the city of Neocaesarea is well established. Wherefore, having boldness before Christ God, entreat Him to save our souls.",
      },
    ],
  },
];

function main() {
  const dir = path.join(process.cwd(), "content/normalized/calendar");
  const lectPath = path.join(dir, "lectionary.json");
  const hymnPath = path.join(dir, "hymns.json");

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
  let lectSkipped = 0;
  let hymnAdded = 0;
  let hymnSkipped = 0;

  for (const entry of ENTRIES) {
    if (entry.lectionary) {
      if (lect.fixed[entry.date]) {
        lectSkipped += 1;
      } else {
        lect.fixed[entry.date] = entry.lectionary;
        lectAdded += 1;
      }
    }
    if (entry.hymns) {
      if (hymns.fixed[entry.date]) {
        hymnSkipped += 1;
      } else {
        hymns.fixed[entry.date] = entry.hymns;
        hymnAdded += 1;
      }
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

  console.log(
    `lectionary: added ${lectAdded}, skipped ${lectSkipped}; hymns: added ${hymnAdded}, skipped ${hymnSkipped}`,
  );
}

main();
