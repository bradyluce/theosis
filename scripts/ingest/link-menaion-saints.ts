// Auto-link menaion entries to saint Person records by name matching.
// Where the menaion title contains a name that matches an existing
// Person record, add the personId to the entry's saintIds. This makes
// the saint links clickable in the Daily page UI for many more days.
//
// Idempotent — skips entries that already have the linkage. Only adds,
// never removes.
//
// Run with: tsx scripts/ingest/link-menaion-saints.ts

import fs from "node:fs";
import path from "node:path";

type Person = {
  id: string;
  name: string;
  honorific?: string;
};

type MenaionEntry = {
  monthDay: string;
  title: string;
  summary?: string;
  saintIds?: string[];
  also?: Array<{ name: string; summary?: string; saintId?: string }>;
};

// Extract a simplified set of identifying name-tokens for matching from
// a person's name. E.g., "Peter, Chief of the Apostles" -> ["peter"].
// "Nicholas the Wonderworker" -> ["nicholas", "wonderworker"]. The match
// is restrictive: we want the menaion title to contain ALL the tokens.
function nameTokens(person: Person): string[] {
  // Take the part of the name before the first comma (which usually
  // separates the proper name from the descriptor) and split it on spaces.
  const primary = person.name.split(",")[0];
  const tokens = primary
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .filter((t) => !["the", "and", "of", "to", "for"].includes(t));
  return tokens;
}

// Check whether a menaion title-string matches a person's name well
// enough to link them. Heuristic: every distinctive token of the person
// must appear in the title. We use a list of distinctive tokens so that
// e.g. "Holy Apostle Philip the Deacon" doesn't match "Apostle Philip
// (one of the Twelve)" since the former has "Deacon" as a distinctive
// token. The match has to handle the apostle Philip ambiguity through
// title disambiguation.
function matchesPersonInTitle(person: Person, title: string): boolean {
  const tokens = nameTokens(person);
  if (tokens.length === 0) return false;
  const lowerTitle = title.toLowerCase();
  return tokens.every((t) => lowerTitle.includes(t));
}

function main() {
  const dir = path.join(process.cwd(), "content/normalized/calendar");
  const menaionPath = path.join(dir, "menaion.json");

  // Read the library.ts file and extract person records by regex (the
  // ts file isn't parseable by the JSON loader). We need id and name.
  const libraryPath = path.join(process.cwd(), "src/lib/content/seed/library.ts");
  const libraryText = fs.readFileSync(libraryPath, "utf8");

  // Match patterns like:
  //   id: "apostle-peter",
  //   slug: "apostle-peter",
  //   name: "Peter, Chief of the Apostles",
  const personRegex = /id:\s*"([a-z0-9-]+)",[\s\S]*?name:\s*"([^"]+)",[\s\S]*?kind:\s*"(saint|father|theologian)"/g;
  const persons: Person[] = [];
  let m: RegExpExecArray | null;
  while ((m = personRegex.exec(libraryText)) !== null) {
    persons.push({ id: m[1], name: m[2] });
  }
  console.log(`Loaded ${persons.length} person records`);

  const menaionRaw = JSON.parse(fs.readFileSync(menaionPath, "utf8"));
  const menaion: Record<string, MenaionEntry> = menaionRaw.entries;

  let linksAdded = 0;
  let entriesUpdated = 0;

  for (const [date, entry] of Object.entries(menaion)) {
    const existingIds = new Set(entry.saintIds ?? []);
    const matches: string[] = [];

    for (const person of persons) {
      if (existingIds.has(person.id)) continue;
      if (matchesPersonInTitle(person, entry.title)) {
        matches.push(person.id);
      }
    }

    if (matches.length === 0) continue;

    // Add the matches. Prefer to put them in saintIds (which the composer
    // promotes into the day's primary listing).
    const newIds = Array.from(new Set([...(entry.saintIds ?? []), ...matches]));
    entry.saintIds = newIds;
    linksAdded += matches.length;
    entriesUpdated += 1;
  }

  menaionRaw.entries = menaion;
  fs.writeFileSync(menaionPath, JSON.stringify(menaionRaw, null, 2) + "\n");

  console.log(`Updated ${entriesUpdated} menaion entries with ${linksAdded} new saintId links.`);
}

main();
