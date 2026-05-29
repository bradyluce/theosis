// One-off audit: dump every library-worthy Person (exactly what the mobile
// saint-picker shows via /api/library/people) with their resolved icon status.
// Output is a TSV to stdout: name<TAB>slug<TAB>kind<TAB>feastDayLabel<TAB>hasIcon
//
// Run: npx tsx scripts/ingest/icons/dump-patron-audit.ts > patron-audit.tsv

import { getLibraryPeopleFromAll } from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";

function main() {
  const people = getLibraryPeopleFromAll();
  people.sort((a, b) => a.name.localeCompare(b.name));
  const rows: string[] = [];
  rows.push(["name", "slug", "kind", "era", "feastDay", "hasIcon"].join("\t"));
  for (const p of people) {
    const icon = getIconForPerson(p);
    rows.push(
      [
        p.name,
        p.slug,
        p.kind ?? "",
        p.eraLabel ?? "",
        p.feastDayLabel ?? "",
        icon ? "Y" : "N",
      ].join("\t"),
    );
  }
  console.log(rows.join("\n"));
  const withIcon = people.filter((p) => getIconForPerson(p)).length;
  console.error(
    `\n${people.length} library people; ${withIcon} have icons, ${people.length - withIcon} do not.`,
  );
}

main();
