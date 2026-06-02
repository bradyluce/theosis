// One-off fix for hymn text bug introduced by mass-fill-fixed-feasts.ts:
// the template interpolation used the saint's full title (e.g., "Martyr
// Thalleleus") as the "noun" inside templates that already started with
// the type word (e.g., "Thy Martyr ${noun}"). Result: duplicate words
// like "Thy Martyr Martyr Thalleleus". This script strips the leading
// type-word from inside the templates.
//
// Run with: tsx scripts/ingest/fix-duplicate-word-hymns.ts

import fs from "node:fs";
import path from "node:path";

type HymnSlot = {
  type: "troparion" | "kontakion";
  tone: string;
  title: string;
  text: string;
};

// Words that may double up when both the title and the template start
// with the type designation. The replacement strips the duplicate.
const DUPLICATE_PATTERNS: Array<[RegExp, string]> = [
  // Singular and plural "Martyr/Martyrs" duplications
  [/Thy Martyr Martyrs? /g, "Thy Martyrs "],
  [/Thy Martyrs Martyr /g, "Thy Martyrs "],
  [/Thy Martyrs Martyrs /g, "Thy Martyrs "],
  [/Thy Martyr Great-martyr /g, "Thy Great-martyr "],
  [/Thy Martyr Great martyr /g, "Thy Great-martyr "],
  [/Thy Martyr Hieromartyr /g, "Thy Hieromartyr "],
  [/Thy Martyrs Hieromartyrs? /g, "Thy Hieromartyrs "],
  [/Thy Martyr Virgin-martyr /g, "Thy Virgin-martyr "],
  [/Thy Great-martyr Great-martyr /g, "Thy Great-martyr "],
  [/Thy Great-martyr Martyr /g, "Thy Great-martyr "],
  [/Thy Great-martyr Hieromartyr /g, "Thy Hieromartyr "],
  // Title-prefix duplications inside saint names
  [/Thy Martyr Holy Prophet /g, "The holy prophet "],
  [/Thy Martyr Prophet /g, "The holy prophet "],
  [/Thy Martyr Apostle /g, "The holy apostle "],
  [/Thy Martyr Holy Apostle /g, "The holy apostle "],
  // "Thy lamb" templates (female virgin-martyrs)
  [/Thy lamb (Martyr|Virgin-martyr|Great-martyr|Hieromartyr|Holy Martyr|St\.) /g, "Thy lamb "],
  // Apostle templates
  [/O Holy Apostle Apostle /g, "O Holy Apostle "],
  [/O Holy Apostle Holy Apostles? /g, "O Holy Apostle "],
  [/O Holy Apostle Apostles /g, "O Holy Apostles "],
  // Hierarch templates
  [/Holy Father Hieromartyr /g, "Holy Hieromartyr "],
  [/Holy Father St\. /g, "Holy Father "],
  [/Holy Father Bishop /g, "Holy Hierarch "],
  [/Holy Father Patriarch /g, "Holy Patriarch "],
  [/Holy Father Archbishop /g, "Holy Archbishop "],
  [/Holy Father Metropolitan /g, "Holy Metropolitan "],
  // Prophet templates
  [/thy prophet Holy Prophet /g, "thy prophet "],
  [/thy prophet Prophet /g, "thy prophet "],
  // Venerable templates
  [/O Venerable St\. /g, "O Venerable "],
  [/O Venerable Venerable /g, "O Venerable "],
  // Wonderworker templates
  [/O Wonderworker St\. /g, "O Wonderworker "],
  [/O Wonderworker Wonderworker /g, "O Wonderworker "],
];

// Title-string duplications (less common but possible).
const TITLE_PATTERNS: Array<[RegExp, string]> = [
  [/Troparion of Martyr Martyr /g, "Troparion of Martyr "],
  [/Troparion of Great-martyr Great-martyr /g, "Troparion of Great-martyr "],
  [/Troparion of Holy Apostle Apostle /g, "Troparion of Holy Apostle "],
];

function fixText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of DUPLICATE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function fixTitle(title: string): string {
  let result = title;
  for (const [pattern, replacement] of TITLE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function main() {
  const hymnPath = path.join(process.cwd(), "content/normalized/calendar/hymns.json");
  const raw = JSON.parse(fs.readFileSync(hymnPath, "utf8")) as {
    movable: Record<string, HymnSlot[]>;
    fixed: Record<string, HymnSlot[]>;
    _meta?: unknown;
  };

  let fixed = 0;

  for (const slotArrays of [raw.movable, raw.fixed]) {
    for (const [date, slots] of Object.entries(slotArrays)) {
      for (const slot of slots) {
        const newText = fixText(slot.text);
        const newTitle = fixTitle(slot.title);
        if (newText !== slot.text) {
          slot.text = newText;
          fixed += 1;
        }
        if (newTitle !== slot.title) {
          slot.title = newTitle;
        }
      }
    }
  }

  fs.writeFileSync(hymnPath, JSON.stringify(raw, null, 2) + "\n");
  console.log(`Fixed ${fixed} hymn slots with duplicate-word patterns.`);
}

main();
