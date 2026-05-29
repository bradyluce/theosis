// Match the curated patron reference list against the live library people
// (patron-audit.tsv produced by dump-patron-audit.ts) and report:
//   - MISSING: no library person matches this patron
//   - NO ICON: a person matches but has no resolved icon
//   - OK: matched and has an icon
//
// Run: npx tsx scripts/ingest/icons/audit-patrons.ts
//   (expects patron-audit.tsv in repo root)

import fs from "node:fs";
import path from "node:path";
import { PATRON_REFERENCE, type PatronRef } from "./patron-reference";

type Row = { name: string; slug: string; kind: string; hasIcon: boolean };

function loadRows(): Row[] {
  const tsv = fs.readFileSync(
    path.join(process.cwd(), "patron-audit.tsv"),
    "utf8",
  );
  const lines = tsv.split(/\r?\n/).filter(Boolean);
  lines.shift(); // header
  return lines.map((l) => {
    const [name, slug, kind, , , hasIcon] = l.split("\t");
    return { name, slug, kind, hasIcon: hasIcon === "Y" };
  });
}

function matchRow(ref: PatronRef, rows: Row[]): Row | null {
  for (const row of rows) {
    const n = row.name.toLowerCase();
    if (ref.any?.some((t) => n.includes(t.toLowerCase()))) return row;
    if (ref.all && ref.all.every((t) => n.includes(t.toLowerCase()))) return row;
  }
  return null;
}

function main() {
  const rows = loadRows();
  const missing: PatronRef[] = [];
  const noIcon: Array<{ ref: PatronRef; row: Row }> = [];
  const ok: Array<{ ref: PatronRef; row: Row }> = [];

  for (const ref of PATRON_REFERENCE) {
    if (ref.any?.[0] === "__none__") continue;
    const row = matchRow(ref, rows);
    if (!row) missing.push(ref);
    else if (!row.hasIcon) noIcon.push({ ref, row });
    else ok.push({ ref, row });
  }

  console.log(`\n==== MISSING from library (${missing.length}) ====`);
  for (const r of missing)
    console.log(`  ${r.era === "modern" ? "[M] " : "    "}${r.name}`);

  console.log(`\n==== PRESENT but NO ICON (${noIcon.length}) ====`);
  for (const { ref, row } of noIcon)
    console.log(
      `  ${ref.era === "modern" ? "[M] " : "    "}${ref.name}  ←  ${row.name} (${row.slug})`,
    );

  console.log(`\n==== OK — present + icon (${ok.length}) ====`);
  for (const { ref, row } of ok)
    console.log(`      ${ref.name}  ←  ${row.name}`);

  console.log(
    `\nTotals: ${PATRON_REFERENCE.length} refs | ${missing.length} missing | ${noIcon.length} no-icon | ${ok.length} ok`,
  );
}

main();
