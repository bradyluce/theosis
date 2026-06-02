// One-shot migration: convert MenaionEntry.also from `string[]` to `Commemoration[]`.
// Reads content/normalized/calendar/menaion.json, transforms any entry whose
// `also` is a string array into the richer record shape, writes back.
//
// Safe to re-run: skips entries whose `also` is already in the new shape.

import fs from "node:fs";
import path from "node:path";

type Commemoration = { name: string; summary?: string; saintId?: string };
type MenaionEntry = {
  monthDay: string;
  title: string;
  summary: string;
  also?: unknown;
  feastRank?: string;
  saintIds?: string[];
};
type MenaionFile = { _meta: unknown; entries: Record<string, MenaionEntry> };

function isCommemorationArray(value: unknown): value is Commemoration[] {
  return Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null && "name" in v);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function main() {
  const filePath = path.join(process.cwd(), "content/normalized/calendar/menaion.json");
  const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as MenaionFile;

  let migrated = 0;
  let alreadyNew = 0;
  let untouched = 0;

  for (const entry of Object.values(file.entries)) {
    if (entry.also === undefined) {
      untouched += 1;
      continue;
    }
    if (isCommemorationArray(entry.also)) {
      alreadyNew += 1;
      continue;
    }
    if (isStringArray(entry.also)) {
      entry.also = entry.also.map((name) => ({ name }));
      migrated += 1;
      continue;
    }
    throw new Error(`unexpected shape for entry.also at ${entry.monthDay}`);
  }

  fs.writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  console.log(`migrated: ${migrated}  already-new: ${alreadyNew}  no-also: ${untouched}`);
}

main();
