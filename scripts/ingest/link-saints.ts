// One-shot script: add saintIds to menaion.json entries by date.
// Reads content/normalized/calendar/menaion.json, augments entries listed in
// the SAINT_LINKS table, writes back. Run with: tsx scripts/ingest/link-saints.ts
//
// Safe to re-run: the script overwrites the saintIds field if present.

import fs from "node:fs";
import path from "node:path";

type MenaionEntry = {
  monthDay: string;
  title: string;
  summary: string;
  also?: string[];
  feastRank?: string;
  saintIds?: string[];
};

type MenaionFile = {
  _meta: unknown;
  entries: Record<string, MenaionEntry>;
};

// Maps Gregorian MM-DD -> ids of Person records (in seed/library.ts) for that day.
const SAINT_LINKS: Record<string, string[]> = {
  "01-01": ["basil-the-great"],
  "01-07": ["john-the-forerunner"],
  "01-17": ["anthony-the-great"],
  "01-18": ["athanasius-the-great"],
  "01-21": ["maximus-the-confessor"],
  "01-25": ["gregory-the-theologian"],
  "01-28": ["ephraim-the-syrian"],
  "01-29": ["ignatius-of-antioch"],
  "01-30": ["basil-the-great", "gregory-the-theologian", "john-chrysostom"],
  "02-14": ["cyril-equal-to-apostles"],
  "02-23": ["polycarp-of-smyrna"],
  "02-24": ["john-the-forerunner"],
  "03-09": ["forty-martyrs-of-sebaste"],
  "03-30": ["john-climacus"],
  "04-01": ["mary-of-egypt"],
  "04-23": ["george-the-trophy-bearer"],
  "04-25": ["apostle-mark"],
  "05-02": ["athanasius-the-great"],
  "05-08": ["apostle-john-the-theologian"],
  "05-09": ["nicholas-of-myra"],
  "05-11": ["cyril-equal-to-apostles", "methodius-equal-to-apostles"],
  "05-15": ["pachomius-the-great"],
  "05-21": ["constantine-the-great", "helen-equal-to-apostles"],
  "05-25": ["john-the-forerunner"],
  "06-09": ["cyril-of-alexandria"],
  "06-24": ["john-the-forerunner"],
  "06-29": ["apostle-peter", "apostle-paul"],
  "07-22": ["mary-magdalene"],
  "07-25": ["joachim-and-anna"],
  "08-29": ["john-the-forerunner"],
  "09-09": ["joachim-and-anna"],
  "09-23": ["john-the-forerunner"],
  "09-26": ["apostle-john-the-theologian"],
  "10-06": ["apostle-thomas"],
  "10-18": ["apostle-luke"],
  "10-26": ["demetrius-of-thessalonica"],
  "11-13": ["john-chrysostom"],
  "11-16": ["apostle-matthew"],
  "11-30": ["apostle-andrew"],
  "12-05": ["sabbas-the-sanctified"],
  "12-06": ["nicholas-of-myra"],
  "12-12": ["spyridon-of-trimythous"],
  "12-20": ["ignatius-of-antioch"],
};

function main() {
  const filePath = path.join(process.cwd(), "content/normalized/calendar/menaion.json");
  const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as MenaionFile;

  let updated = 0;
  let skipped = 0;

  for (const [monthDay, saintIds] of Object.entries(SAINT_LINKS)) {
    const entry = file.entries[monthDay];
    if (!entry) {
      console.warn(`  ! no menaion entry for ${monthDay} — skipping`);
      skipped += 1;
      continue;
    }
    entry.saintIds = saintIds;
    updated += 1;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  console.log(`Updated ${updated} entries (${skipped} skipped).`);
}

main();
