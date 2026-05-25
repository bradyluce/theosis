// Generate Person stubs from the Menaion so every commemorated saint
// becomes a clickable Library entry — not just the ones we hand-seeded
// or ingested as commentary authors.
//
// Input:
//   content/normalized/calendar/menaion.json
//
// Output:
//   content/normalized/calendar/people.json   (committed)
//
// The output is loaded by commentary-loader.ts and merged with the
// seed/catalog people. Existing Persons (seed library + ingested
// catalogs) ALWAYS win — calendar-derived stubs only fill gaps.
//
// Two sources of names within each menaion day:
//   1. The day's primary commemoration (entry.title + entry.summary,
//      with canonical IDs declared in entry.saintIds).
//   2. The day's "also" sub-commemorations (entry.also[].name, with
//      optional summary). These have no ID, so we slugify from name.
//
// Idempotent: re-running overwrites the output file.

import fs from "node:fs";
import path from "node:path";
import type { Person } from "@theosis/core";

const REPO_ROOT = path.resolve(__dirname, "../..");
const MENAION_PATH = path.join(
  REPO_ROOT,
  "content/normalized/calendar/menaion.json",
);
const OUTPUT_PATH = path.join(
  REPO_ROOT,
  "content/normalized/calendar/people.json",
);

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Honorific prefixes we recognize and strip before slugifying. Order
// matters — multi-word patterns must come before single-word ones so
// "Translation of the relics of X" matches before "of".
const HONORIFIC_PATTERNS: RegExp[] = [
  /^Translation of the relics of\s+/i,
  /^Translation of the Relics of\s+/i,
  /^Synaxis of\s+/i,
  /^Uncovering of the relics of\s+/i,
  /^Equal[- ]to[- ]the[- ][Aa]postles?\s+/i,
  /^New Hieromartyrs?\s+/i,
  /^New Monk[- ]martyrs?\s+/i,
  /^New[- ][Mm]artyrs?\s+/i,
  /^Right[- ]believing\s+/i,
  /^Hieromartyrs?\s+/i,
  /^Greatmartyr\s+/i,
  /^Great[- ][Mm]artyrs?\s+/i,
  /^Holy [Ff]athers?\s+/i,
  /^Holy [Mm]artyrs?\s+/i,
  /^Holy\s+/i,
  /^Venerable Hieromartyrs?\s+/i,
  /^Venerables?\s+/i,
  /^Martyrs?\s+/i,
  /^Confessors?\s+/i,
  /^Apostles?\s+/i,
  /^Prophet(?:ess)?\s+/i,
  /^Hieromonks?\s+/i,
  /^Hieroconfessors?\s+/i,
  /^Sts?\.\s+/i,
  /^Saints?\s+/i,
];

interface MenaionEntry {
  monthDay: string;
  title: string;
  summary?: string;
  saintIds?: string[];
  also?: Array<{ name: string; summary?: string }>;
}

interface MenaionFile {
  entries: Record<string, MenaionEntry>;
}

interface PersonStub extends Person {
  source: "menaion";
  feastDays: string[]; // collected days when a Person is commemorated more than once
}

function monthDayToLabel(md: string): string {
  const [m, d] = md.split("-").map(Number);
  if (!m || !d) return md;
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

function stripHonorific(name: string): { honorific?: string; rest: string } {
  for (const pattern of HONORIFIC_PATTERNS) {
    const match = name.match(pattern);
    if (match) {
      return {
        honorific: match[0].trim().replace(/[.,;:]$/, ""),
        rest: name.replace(pattern, ""),
      };
    }
  }
  return { rest: name };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Take the first segment of a title joined by `;` — used to derive a
// readable name for the primary saintId. Multi-saint titles like
// "St. Meletius...; St. Alexis..." parse to just "St. Meletius..."
// since the second saint appears separately in `also[]`.
function primaryNameFromTitle(title: string): string {
  return title.split(/;/)[0].trim();
}

function makeStub(args: {
  id: string;
  name: string;
  summary: string;
  feastDay: string;
}): PersonStub {
  const { honorific, rest } = stripHonorific(args.name);
  const cleanName = rest.trim() || args.name;
  return {
    id: args.id,
    slug: args.id,
    name: cleanName,
    honorific,
    kind: "saint",
    eraLabel: "",
    summary:
      args.summary && args.summary.trim().length > 0
        ? args.summary.trim()
        : "Commemorated in the Orthodox Synaxarion.",
    traditions: ["Orthodox"],
    topicSlugs: [],
    featuredWorkIds: [],
    feastDayLabel: args.feastDay,
    source: "menaion",
    feastDays: [args.feastDay],
  };
}

function main() {
  const raw = fs.readFileSync(MENAION_PATH, "utf8");
  const menaion: MenaionFile = JSON.parse(raw);

  const byId = new Map<string, PersonStub>();
  let primaryCount = 0;
  let alsoCount = 0;

  for (const entry of Object.values(menaion.entries)) {
    const feastDay = monthDayToLabel(entry.monthDay);

    // Primary commemoration(s) — use the saintIds[] declared in
    // menaion as canonical, with the first segment of the title as
    // the human-readable name.
    const primaryName = primaryNameFromTitle(entry.title);
    const primarySummary = entry.summary ?? "";
    for (const id of entry.saintIds ?? []) {
      if (!id) continue;
      const existing = byId.get(id);
      if (existing) {
        if (!existing.feastDays.includes(feastDay)) {
          existing.feastDays.push(feastDay);
          existing.feastDayLabel = existing.feastDays.join("; ");
        }
        continue;
      }
      byId.set(
        id,
        makeStub({
          id,
          name: primaryName,
          summary: primarySummary,
          feastDay,
        }),
      );
      primaryCount++;
    }

    // also[] sub-commemorations — slugify each name to derive an ID.
    for (const also of entry.also ?? []) {
      if (!also?.name) continue;
      const { rest } = stripHonorific(also.name);
      const slug = slugify(rest || also.name);
      if (!slug) continue;
      const existing = byId.get(slug);
      if (existing) {
        if (!existing.feastDays.includes(feastDay)) {
          existing.feastDays.push(feastDay);
          existing.feastDayLabel = existing.feastDays.join("; ");
        }
        // If existing has no summary but this also-entry does, fill it in.
        if (
          (!existing.summary ||
            existing.summary === "Commemorated in the Orthodox Synaxarion.") &&
          also.summary
        ) {
          existing.summary = also.summary.trim();
        }
        continue;
      }
      byId.set(
        slug,
        makeStub({
          id: slug,
          name: also.name,
          summary: also.summary ?? "",
          feastDay,
        }),
      );
      alsoCount++;
    }
  }

  const people = Array.from(byId.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const output = {
    _meta: {
      description:
        "Person stubs generated from the Orthodox Menaion. One Person per primary saintId and per `also[]` sub-commemoration. Used as a backfill layer by commentary-loader.ts — seed-library and ingested-catalog Persons take precedence on ID collision. Regenerate with `tsx scripts/normalize/normalize-menaion-people.ts`.",
      generatedFrom: "content/normalized/calendar/menaion.json",
      totalPeople: people.length,
      fromPrimaryCommemorations: primaryCount,
      fromAlsoCommemorations: alsoCount,
    },
    people: people.map((p) => {
      // Strip the script-internal helper fields before emitting; keep only
      // the Person fields the loader and types know about.
      const { source: _source, feastDays: _feastDays, ...person } = p;
      return person;
    }),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(`Wrote ${people.length} Person stubs to ${OUTPUT_PATH}`);
  console.log(`  - ${primaryCount} from primary commemorations`);
  console.log(`  - ${alsoCount} from "also" sub-commemorations`);
}

main();
