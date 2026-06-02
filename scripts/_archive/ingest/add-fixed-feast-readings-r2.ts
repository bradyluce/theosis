// Add fixed-date lectionary entries and troparia/kontakia for major saint
// days that have extended bios but lack readings or hymns. Idempotent —
// existing entries on these dates are preserved.
//
// Run with: tsx scripts/ingest/add-fixed-feast-readings-r2.ts

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
  date: string; // MM-DD
  lectionary?: LectionarySlot[];
  hymns?: HymnSlot[];
};

const ENTRIES: FixedFeastEntry[] = [
  // May 15 — Pachomius the Great
  {
    date: "05-15",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Father",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Father",
      },
    ],
  },
  // June 1 — Justin the Philosopher and Martyr
  {
    date: "06-01",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "first-corinthians",
        bookName: "1 Corinthians",
        chapter: 4,
        verseStart: 9,
        verseEnd: 16,
        label: "Epistle of the Martyr",
      },
      {
        kind: "gospel",
        bookSlug: "mark",
        bookName: "Mark",
        chapter: 5,
        verseStart: 24,
        verseEnd: 34,
        label: "Gospel of the Martyr",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Martyr Justin",
        text: "O Justin, teacher of divine knowledge, who shone forth with apostolic grace and the eloquence of the Greek wisdom which thou didst illumine by the Cross of Christ: thou didst entreat for the truth and didst seal it with thy blood. With the apostles and martyrs intercede unceasingly for us all.",
      },
      {
        type: "kontakion",
        tone: "Tone 2",
        title: "Kontakion of the Martyr Justin",
        text: "Thou didst rise as a light, O Justin most wise, gladdening with the rays of divine knowledge the hearts of the faithful. Thou didst confound the wisdom of the worldly philosophers and didst illumine the world with thy teachings, before the eternal Light to which thou wast a true witness.",
      },
    ],
  },
  // July 4 — Andrew of Crete
  {
    date: "07-04",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 7,
        verseStart: 26,
        verseEnd: 28,
        label: "Epistle of the Hierarch",
      },
      {
        kind: "gospel",
        bookSlug: "john",
        bookName: "John",
        chapter: 10,
        verseStart: 9,
        verseEnd: 16,
        label: "Gospel of the Hierarch",
      },
    ],
  },
  // July 11 — Holy Equal-to-the-Apostles Olga
  {
    date: "07-11",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of the Equal-to-the-Apostles",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 7,
        verseStart: 36,
        verseEnd: 50,
        label: "Gospel of the Equal-to-the-Apostles",
      },
    ],
  },
  // July 17 — Great-martyr Marina + Royal Martyrs (lectionary + hymns)
  {
    date: "07-17",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of the Great-martyr Marina",
      },
      {
        kind: "gospel",
        bookSlug: "mark",
        bookName: "Mark",
        chapter: 5,
        verseStart: 24,
        verseEnd: 34,
        label: "Gospel of the Great-martyr Marina",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Great-martyr Marina",
        text: "Thy lamb Marina, O Jesus, crieth out with a loud voice: I love thee, my Bridegroom, and seeking thee I contest. I am crucified with thee, and in thy baptism am buried with thee. I suffer for thy sake, that I might reign with thee; I die for thee, that I might live in thee. Receive me, then, an unblemished sacrifice that I have offered to thee in love. By her prayers save our souls, O thou who art merciful.",
      },
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Royal Martyrs of Russia",
        text: "Most-noble and right-believing passion-bearers, gentle Tsar Nicholas and his most-pious consort Alexandra, with their God-beloved children Olga, Tatiana, Maria, Anastasia, and the Tsarevich Alexei: ye were martyred for Christ by the godless, the icons of every Russian Christian household to come. Pray to the merciful Master for our country, that we may walk in His paths and find rest with you in His mercy.",
      },
    ],
  },
  // July 19 — Macrina the Younger
  {
    date: "07-19",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of the Venerable Mother",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 7,
        verseStart: 36,
        verseEnd: 50,
        label: "Gospel of the Venerable Mother",
      },
    ],
  },
  // September 20 — Eustathius Placidas
  {
    date: "09-20",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "ephesians",
        bookName: "Ephesians",
        chapter: 6,
        verseStart: 10,
        verseEnd: 17,
        label: "Epistle of the Great-martyr Eustathius",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 21,
        verseStart: 12,
        verseEnd: 19,
        label: "Gospel of the Great-martyr Eustathius",
      },
    ],
  },
  // September 24 — Thekla (lectionary)
  {
    date: "09-24",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "second-timothy",
        bookName: "2 Timothy",
        chapter: 3,
        verseStart: 10,
        verseEnd: 15,
        label: "Epistle of the Protomartyr Thekla",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 25,
        verseStart: 1,
        verseEnd: 13,
        label: "Gospel of the Protomartyr Thekla",
      },
    ],
  },
  // October 17 — Lazarus of Bethany (second repose, lectionary + hymns)
  {
    date: "10-17",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 13,
        verseStart: 17,
        verseEnd: 21,
        label: "Epistle of the Righteous Lazarus",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 6,
        verseStart: 17,
        verseEnd: 23,
        label: "Gospel of the Righteous Lazarus",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 3",
        title: "Troparion of Lazarus the Four-Days-Dead",
        text: "Giving us before thy Passion an assurance of the general resurrection, thou didst raise Lazarus from the dead, O Christ our God. Wherefore, like the children of old, we also bear before thee the symbols of triumph and cry to thee, the Vanquisher of death: Hosanna in the highest; blessed is he that cometh in the name of the Lord.",
      },
    ],
  },
  // October 28 — Great-martyr Paraskeva
  {
    date: "10-28",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of the Great-martyr Paraskeva",
      },
      {
        kind: "gospel",
        bookSlug: "mark",
        bookName: "Mark",
        chapter: 5,
        verseStart: 24,
        verseEnd: 34,
        label: "Gospel of the Great-martyr Paraskeva",
      },
    ],
  },
  // December 13 — Herman of Alaska
  {
    date: "12-13",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Herman",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Herman",
      },
    ],
  },
  // December 17 — Daniel + Three Holy Youths (lectionary + hymns)
  {
    date: "12-17",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 11,
        verseStart: 33,
        verseEnd: 40,
        label: "Epistle of the Prophet Daniel and the Three Youths",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 11,
        verseStart: 47,
        verseEnd: 54,
        label: "Gospel of the Prophet Daniel",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 2",
        title: "Troparion of the Prophet Daniel and the Three Youths",
        text: "Great are the achievements of faith! In the fountain of flame, as on the waters of rest, the three holy youths rejoiced. And the prophet Daniel was shown to be a shepherd of lions, as of sheep. Through their prayers, O Christ God, save our souls.",
      },
    ],
  },
  // December 20 — Ignatius the God-bearer (lectionary + hymns)
  {
    date: "12-20",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 4,
        verseStart: 14,
        verseEnd: 16,
        label: "Epistle of the Hieromartyr Ignatius",
      },
      {
        kind: "gospel",
        bookSlug: "mark",
        bookName: "Mark",
        chapter: 9,
        verseStart: 33,
        verseEnd: 41,
        label: "Gospel of the Hieromartyr Ignatius",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Hieromartyr Ignatius",
        text: "Sharing the ways of the apostles and successor to their thrones, O God-inspired, thou hast found in active life the path to divine contemplation. Wherefore, ordering rightly the word of truth, thou didst contest for the faith even unto blood, O Hieromartyr Ignatius. Intercede with Christ God that our souls may be saved.",
      },
      {
        type: "kontakion",
        tone: "Tone 4",
        title: "Kontakion of the Hieromartyr Ignatius",
        text: "From the East today hath the radiant star arisen, illumining the faithful with the splendor of his miracles. Wherefore let us crown with hymns Ignatius the God-bearer, the heavenly worshipper.",
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

  // Sort keys for stable diffs.
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
