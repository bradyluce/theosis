// Audit how many menaion days name a saint in the title or as an additional
// commemoration but lack a saintId linking to a Person record. These are the
// days where the icon system can't bind a saint icon via person.id — only via
// the slug-name-in-title fallback or a feast-title regex.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const MENAION_PATH = path.join(REPO_ROOT, "content/normalized/calendar/menaion.json");

type MenaionEntry = {
  monthDay: string;
  title: string;
  saintIds?: string[];
  additionalCommemorations?: Array<{
    name: string;
    summary?: string;
    saintId?: string;
  }>;
};

function nameSuggestsSaint(s: string): boolean {
  // Anything starting with "St.", "Holy", "Apostle", "Prophet", "Martyr", etc.
  // or containing the word "saint" / "great-martyr" / "hieromartyr" etc.
  return /\b(st\.?|saint|holy|apostle|prophet|martyr|hieromartyr|venerable|great-martyr|virgin-martyr|equal-to-the-apostles|righteous|hieromonk|blessed|empress|emperor|king|queen|abbot|abbess|monk|nun)\b/i.test(
    s,
  );
}

function main() {
  const raw = fs.readFileSync(MENAION_PATH, "utf8");
  const menaion = JSON.parse(raw) as { entries: Record<string, MenaionEntry> };
  const entries = Object.values(menaion.entries);

  let total = 0;
  let primaryNoId = 0;
  let primaryWithId = 0;
  let primaryNeitherNamed = 0;

  let additionalTotal = 0;
  let additionalNoId = 0;
  let additionalWithId = 0;

  const primaryGapSamples: Array<{ monthDay: string; title: string }> = [];

  for (const e of entries) {
    total++;
    const hasPrimaryId = (e.saintIds ?? []).length > 0;
    const titleNamesSaint = nameSuggestsSaint(e.title);
    if (hasPrimaryId) primaryWithId++;
    else if (titleNamesSaint) {
      primaryNoId++;
      if (primaryGapSamples.length < 12) {
        primaryGapSamples.push({ monthDay: e.monthDay, title: e.title });
      }
    } else {
      primaryNeitherNamed++;
    }

    for (const a of e.additionalCommemorations ?? []) {
      additionalTotal++;
      if (a.saintId) additionalWithId++;
      else additionalNoId++;
    }
  }

  console.log("== Menaion saint-id coverage ==\n");
  console.log(`Total days: ${total}`);
  console.log("");
  console.log("Primary commemoration:");
  console.log(`  with saintId           : ${primaryWithId}`);
  console.log(`  title NAMES a saint but no saintId: ${primaryNoId}`);
  console.log(`  title is a feast (no saint expected): ${primaryNeitherNamed}`);
  console.log("");
  console.log("Additional commemorations (across all days):");
  console.log(`  total items            : ${additionalTotal}`);
  console.log(`  with saintId           : ${additionalWithId}`);
  console.log(`  without saintId        : ${additionalNoId}`);
  console.log("");
  console.log("Sample primary gaps (title clearly names a saint, no saintId):");
  for (const s of primaryGapSamples) {
    console.log(`  ${s.monthDay}  ${s.title}`);
  }
}

main();
