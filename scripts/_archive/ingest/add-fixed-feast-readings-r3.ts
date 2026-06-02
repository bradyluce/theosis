// Add fixed-date lectionary entries and troparia/kontakia for major
// saint days — round 3. Same idempotent pattern as round 2. Run with:
//   tsx scripts/ingest/add-fixed-feast-readings-r3.ts

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

// Standard "Venerable Father" pair: Gal 5:22-26 + Mt 11:27-30.
// Standard "Hierarch" pair: Heb 7:26-28 + John 10:9-16.
// Standard female martyr: Gal 3:23-29 + Mark 5:24-34.
// Standard equal-to-apostles: Gal 3:23-29 + Luke 7:36-50.
// Standard joint commemoration of two saints: take the appropriate pair
// from above for the senior saint and let the day's enrichment carry both.

const ENTRIES: FixedFeastEntry[] = [
  // Jan 19 — Macarius the Great (Egyptian)
  {
    date: "01-19",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Macarius",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Macarius",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 1",
        title: "Troparion of the Venerable Macarius the Great",
        text: "Citizen of the desert and angel in flesh, wonderworker and bearer of God: O Macarius our Father, who by fasts and watchings and prayers didst receive heavenly gifts to heal the sick and the souls of those who in faith run to thee. Glory to Him who hath given thee strength; glory to Him who hath crowned thee; glory to Him who through thee worketh wonders.",
      },
    ],
  },
  // Mar 12 — Symeon the New Theologian
  {
    date: "03-12",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Symeon",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Symeon",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 3",
        title: "Troparion of Symeon the New Theologian",
        text: "Receiving the illumination of the Holy Spirit, O most blessed Symeon, thou wast revealed as a chosen vessel and beheld the Sun of Glory at thy side. The Divine Light that shone upon thee thou hast given to us in thy writings; we entreat thee, intercede that we also may be illumined and may attain salvation.",
      },
    ],
  },
  // Mar 31 — Innocent of Alaska
  {
    date: "03-31",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 7,
        verseStart: 26,
        verseEnd: 28,
        label: "Epistle of the Hierarch Innocent",
      },
      {
        kind: "gospel",
        bookSlug: "john",
        bookName: "John",
        chapter: 10,
        verseStart: 9,
        verseEnd: 16,
        label: "Gospel of the Hierarch Innocent",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of St. Innocent of Alaska",
        text: "O Holy Father Innocent, with patience thou didst go forth into the wilds of the north, taking with thee the saving gospel; thou didst love thy spiritual children with the love of an apostle, working signs and wonders for their salvation. To us also has thy intercession been given in time of need. Wherefore we cry to thee: glory to Him who has given thee strength; glory to Him who hath crowned thee; glory to Him who through thee shineth in the lands of America.",
      },
    ],
  },
  // May 3 — Theodosius of the Caves
  {
    date: "05-03",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Theodosius",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Theodosius",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 8",
        title: "Troparion of the Venerable Theodosius of the Caves",
        text: "Thou wast lifted up to the height of virtues, O Theodosius our father, and from thy youth didst love above all the monastic life; through patient labor thou didst attain it boldly, and didst become the dweller of the Caves of Kiev, adorning thy life with fasts and shining with the light of the Holy Spirit. Wherefore we cry to thee: rejoice, blessed father.",
      },
    ],
  },
  // Jul 2 — John of Shanghai and San Francisco
  {
    date: "07-02",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "hebrews",
        bookName: "Hebrews",
        chapter: 7,
        verseStart: 26,
        verseEnd: 28,
        label: "Epistle of St. John of Shanghai",
      },
      {
        kind: "gospel",
        bookSlug: "john",
        bookName: "John",
        chapter: 10,
        verseStart: 9,
        verseEnd: 16,
        label: "Gospel of St. John of Shanghai",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 5",
        title: "Troparion of St. John of Shanghai and San Francisco",
        text: "Lo, thy care for thy flock in its sojourn hath prefigured the supplications which thou dost ever offer up for the whole world. Thus do we believe, having come to know thy love, O Holy Hierarch John the Wonderworker. Wholly sanctified by God through the ministry of the all-pure Mysteries, and thyself ever strengthened thereby, thou didst hasten to the suffering, O most gladsome healer. Hasten now also to the aid of us who honor thee with all our heart.",
      },
    ],
  },
  // Jul 10 — Anthony of the Caves
  {
    date: "07-10",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Anthony",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Anthony",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 4",
        title: "Troparion of the Venerable Anthony of the Caves",
        text: "Having departed from the tumults of the world, with faith thou didst leave thy fatherland, and didst follow Christ, settling in the holy mountain of Athos; and thence, by the command of the Mother of God, thou didst come to the mountains of Kiev. There thou didst end thy life in fastings, fathering many monks who came to thee. Wherefore, having received from God the gift of wonders, O Venerable Anthony, pray for our souls.",
      },
    ],
  },
  // Jul 12 — Paisios the Athonite
  {
    date: "07-12",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Paisios",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Paisios",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 5",
        title: "Troparion of the Venerable Paisios the Athonite",
        text: "The dweller of Mount Athos and the boast of Cappadocia, the new gift of God to the faithful — let us honor him with hymns, O lovers of the saints; for the Paraclete enriched him with the multitude of His gifts, and thou hast become a shelter for all who hasten to thee, O blessed Paisios, our Holy Father.",
      },
    ],
  },
  // Jul 18 — Elizabeth the New Martyr
  {
    date: "07-18",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 3,
        verseStart: 23,
        verseEnd: 29,
        label: "Epistle of the New Martyr Elizabeth",
      },
      {
        kind: "gospel",
        bookSlug: "mark",
        bookName: "Mark",
        chapter: 5,
        verseStart: 24,
        verseEnd: 34,
        label: "Gospel of the New Martyr Elizabeth",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 1",
        title: "Troparion of the New Martyr Grand Duchess Elizabeth",
        text: "Emulating the Lord's self-abasement on the earth, O Grand Duchess Elizabeth, thou didst give up the comforts of palaces to dwell in the slums, console the suffering, and labor as a sister of mercy among the poor; entering thus into the joy of the bridegroom Christ, with the sister Varvara thou wast crowned with martyrdom by the godless. With them pray to the lover of mankind, that He save our souls.",
      },
    ],
  },
  // Aug 28 — Moses the Black
  {
    date: "08-28",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 5,
        verseStart: 22,
        verseEnd: 26,
        label: "Epistle of the Venerable Moses",
      },
      {
        kind: "gospel",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapter: 11,
        verseStart: 27,
        verseEnd: 30,
        label: "Gospel of the Venerable Moses",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 1",
        title: "Troparion of the Venerable Moses the Black",
        text: "Thou didst forsake Egypt's wickedness and didst draw nigh unto God, O Venerable Father Moses; thou didst earnestly take up the cross of asceticism, and didst become a wonderworker, the shepherd of lions and of the souls who came to thee. Pray for those who keep thy memory, that Christ may grant us His great mercy.",
      },
    ],
  },
  // Sep 9 — Synaxis of Joachim and Anna
  {
    date: "09-09",
    lectionary: [
      {
        kind: "epistle",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 4,
        verseStart: 22,
        verseEnd: 31,
        label: "Epistle of the Ancestors of God",
      },
      {
        kind: "gospel",
        bookSlug: "luke",
        bookName: "Luke",
        chapter: 8,
        verseStart: 16,
        verseEnd: 21,
        label: "Gospel of the Ancestors of God",
      },
    ],
    hymns: [
      {
        type: "troparion",
        tone: "Tone 2",
        title: "Troparion of the Ancestors of God Joachim and Anna",
        text: "O Joachim and Anna, righteous ancestors of God, ye have received from God the freedom that ye sought through long childlessness — for from your loins was sprung the Virgin who bore the Lord. Pray with her, that He grant us great mercy.",
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
