// Clean up false-positive saint links introduced by the auto-link pass.
// These are cases where the link-menaion-saints.ts regex matched a
// secondary saint by partial name token (e.g., "Peter of Moscow" on
// June 29 because the title contains "Peter") or pulled in a source
// record by a regex-spanning bug.
//
// Run with: tsx scripts/ingest/cleanup-menaion-link-errors.ts

import fs from "node:fs";
import path from "node:path";

// Per-date removals. The id will be removed from the date's saintIds
// if present. (Other ids on the same date remain.)
const REMOVALS: Array<{ date: string; remove: string[] }> = [
  // Nicholas of Myra's secondary feast on May 9 — Isaiah's feast is also
  // May 9 but the menaion title is only about the translation of relics
  // of Nicholas; Isaiah is handled separately via menaion enrichment.
  { date: "05-09", remove: ["prophet-isaiah"] },

  // Cyril of Alexandria — a different Cyril than the equal-to-apostles
  // brother of Methodius.
  { date: "06-09", remove: ["cyril-equal-to-apostles"] },

  // Peter and Paul — apostle Peter, not the medieval Metropolitan Peter
  // of Moscow.
  { date: "06-29", remove: ["peter-of-moscow"] },

  // Synaxis of the Twelve Apostles — auto-link picked up 5; we'll add
  // the rest explicitly below.
  // (kept as-is; missing ones are added in fill-menaion-commemorations.ts)

  // Macrina the Younger — Basil is mentioned in the title as her brother
  // but Basil's feast is January 1, not July 19.
  { date: "07-19", remove: ["basil-the-great"] },

  // James Brother of the Lord — distinct from James son of Zebedee.
  { date: "10-23", remove: ["apostle-james-zebedee"] },

  // Chrysostom — the regex pulled in a source-record id by accident.
  { date: "11-13", remove: ["source-oca-daily"] },

  // Chains of the Apostle Peter — the apostle Peter, not Peter of Moscow.
  { date: "01-16", remove: ["peter-of-moscow"] },

  // Xenia of St. Petersburg — the auto-link incorrectly added Peters
  // because of "Petersburg" tokenization.
  { date: "01-24", remove: ["apostle-peter", "peter-of-moscow"] },

  // Three Holy Hierarchs — the regex pulled in source-oca-daily.
  { date: "01-30", remove: ["source-oca-daily"] },

  // Cyril Equal-to-the-Apostles, alone — Methodius's feast is May 11
  // (and April 6 for repose), not February 14.
  { date: "02-14", remove: ["methodius-equal-to-apostles"] },

  // Cyril of Jerusalem — distinct from the equal-to-apostles brother of
  // Methodius.
  { date: "03-18", remove: ["cyril-equal-to-apostles"] },
];

function main() {
  const menaionPath = path.join(process.cwd(), "content/normalized/calendar/menaion.json");
  const raw = JSON.parse(fs.readFileSync(menaionPath, "utf8")) as {
    entries: Record<string, { saintIds?: string[] }>;
    _meta?: unknown;
  };

  let removed = 0;
  for (const { date, remove } of REMOVALS) {
    const entry = raw.entries[date];
    if (!entry || !entry.saintIds) continue;
    const before = entry.saintIds.length;
    entry.saintIds = entry.saintIds.filter((id) => !remove.includes(id));
    removed += before - entry.saintIds.length;
  }

  fs.writeFileSync(menaionPath, JSON.stringify(raw, null, 2) + "\n");
  console.log(`Removed ${removed} false-positive saint links.`);
}

main();
