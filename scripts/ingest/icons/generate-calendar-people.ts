// Generate minimal Person seed records for every saint in calendar_icons.tsv
// that doesn't already have a Person in src/lib/content/seed/library.ts. The
// generated entries are placeholders — id, slug, name, kind, feastDayLabel —
// enough for the icon to bind via the icon-{personId} convention and for the
// saint to surface on the library's saints page. Editorial summaries / eras
// can be filled in later by hand.
//
// Appends to the end of the `people` array in library.ts (just before the
// closing `];`). Idempotent: re-running only adds slugs still missing.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const TSV_PATH = path.join(REPO_ROOT, "calendar_icons.tsv");
const SEED_PATH = path.join(REPO_ROOT, "src/lib/content/seed/library.ts");

type TsvRow = { date: string; slug: string; label: string; resolved: boolean };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseTsv(): TsvRow[] {
  const raw = fs.readFileSync(TSV_PATH, "utf8");
  const rows: TsvRow[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const cols = line.split("|").map((c) => c.trim());
    const [date, slug, label, commonsFile] = cols;
    if (!slug) continue;
    rows.push({
      date: date ?? "",
      slug,
      label: label ?? slug,
      resolved: !!commonsFile && commonsFile !== "NONE",
    });
  }
  return rows;
}

function existingPersonIds(): Set<string> {
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  const ids = new Set<string>();
  const re = /\bid:\s*"([a-z0-9-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) ids.add(m[1]);
  return ids;
}

function formatDate(mmdd: string): string {
  const [m, d] = mmdd.split("-").map((n) => Number.parseInt(n, 10));
  if (!m || !d || m < 1 || m > 12) return mmdd;
  return `${MONTHS[m - 1]} ${d}`;
}

// Try to recover a clean honorific + bare name from the label. Labels look
// like "Martyr Gordius", "St. Sylvester, Pope of Rome", "Holy Prophet Hosea",
// "Great-martyr Procopius", "Apostle Andronicus of the Seventy".
function splitHonorific(label: string): { honorific: string; name: string } {
  // Strip leading "Holy " (it's a flavor word, not the honorific we want stored).
  let s = label.replace(/^Holy\s+/i, "");
  // Common Orthodox honorific prefixes — recognize and split off.
  const re = /^(St\.?|Saint|Sts\.?|Apostle|Apostles|Prophet|Martyr|Hieromartyr|Great-?martyr|Virgin-?martyr|Venerable|Blessed|Hieromonk|Righteous|Equal-to-the-Apostles|Passion-Bearer)\s+/i;
  const m = re.exec(s);
  if (m) {
    return { honorific: m[1].replace(/^Sts?\.?$/i, "St."), name: s.slice(m[0].length).trim() };
  }
  return { honorific: "", name: s };
}

function inferKind(label: string): "saint" | "father" {
  // Default to saint. Only flag a few labels we know are theologian/father.
  // For the calendar-day batch these are essentially all saints/martyrs.
  return /\b(St\.?|Apostle|Prophet|Martyr|Hieromartyr|Great-martyr|Virgin-martyr|Venerable|Blessed|Righteous|Passion-Bearer|Equal-to-the-Apostles)\b/i.test(
    label,
  )
    ? "saint"
    : "saint";
}

// Strip trailing ", X of Y" qualifiers from a label to get a tidy summary noun.
function summarize(label: string, date: string): string {
  const cleanedDate = formatDate(date);
  // "Commemorated <date>." — minimal placeholder; editorial summaries can
  // replace this later via library.ts edits.
  return `Commemorated on ${cleanedDate}.`;
}

function formatPersonRecord(row: TsvRow): string {
  const { honorific, name } = splitHonorific(row.label);
  const kind = inferKind(row.label);
  const summary = summarize(row.label, row.date);
  const feast = formatDate(row.date);
  const safeName = name.replace(/"/g, '\\"');
  const safeHonorific = honorific.replace(/"/g, '\\"');
  const honorificLine = safeHonorific ? `    honorific: "${safeHonorific}",\n` : "";
  return [
    "  {",
    `    id: "${row.slug}",`,
    `    slug: "${row.slug}",`,
    `    name: "${safeName}",`,
    honorificLine.trimEnd(),
    `    kind: "${kind}",`,
    `    eraLabel: "Early Church",`,
    `    summary: "${summary}",`,
    `    traditions: [],`,
    `    topicSlugs: [],`,
    `    featuredWorkIds: [],`,
    `    feastDayLabel: "${feast}",`,
    "  },",
  ]
    .filter((l) => l.length > 0)
    .join("\n");
}

function main() {
  const rows = parseTsv();
  const existing = existingPersonIds();
  // Only generate for resolved (icon-present) slugs we don't already have.
  const toAdd = rows.filter((r) => r.resolved && !existing.has(r.slug));
  // Dedupe by slug (TSV may have multiple rows for shared group icons).
  const seen = new Set<string>();
  const unique: TsvRow[] = [];
  for (const r of toAdd) {
    if (seen.has(r.slug)) continue;
    seen.add(r.slug);
    unique.push(r);
  }
  console.log(`TSV has ${rows.length} rows; ${toAdd.length} need new Person records (${unique.length} after dedupe).`);
  if (unique.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Build the TS source for all new records.
  const records = unique.map(formatPersonRecord).join("\n");
  const banner =
    "\n  // ---- Auto-generated calendar-day saints (placeholder records).\n  // Generated by scripts/ingest/icons/generate-calendar-people.ts from\n  // calendar_icons.tsv. Each entry binds icon-{personId} via convention;\n  // replace eraLabel/summary with editorial prose as time allows.\n";
  const insert = banner + records + "\n";

  // Splice into library.ts before the closing "];" of the `people` array.
  const seedRaw = fs.readFileSync(SEED_PATH, "utf8");
  // Conservative locator: find the FIRST closing "];" after "export const people".
  const anchor = "export const people: Person[] = [";
  const startIdx = seedRaw.indexOf(anchor);
  if (startIdx === -1) {
    console.error("Couldn't locate `export const people: Person[] = [` in library.ts");
    process.exit(1);
  }
  // Find the matching closing bracket by walking forward.
  let depth = 1;
  let i = startIdx + anchor.length;
  while (i < seedRaw.length && depth > 0) {
    if (seedRaw[i] === "[") depth++;
    else if (seedRaw[i] === "]") depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) {
    console.error("Couldn't find matching closing bracket for people array");
    process.exit(1);
  }
  // Insert just before the closing bracket.
  const before = seedRaw.slice(0, i);
  const after = seedRaw.slice(i);
  const updated = before + insert + after;
  fs.writeFileSync(SEED_PATH, updated, "utf8");

  console.log(`Inserted ${unique.length} new Person records into library.ts.`);
  console.log("Sample:");
  for (const r of unique.slice(0, 8)) {
    console.log(`  ${r.slug.padEnd(40)}  ${r.label}`);
  }
}

main();
