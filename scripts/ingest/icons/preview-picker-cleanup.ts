// Preview-only: shows exactly what the patron-picker cleanup removes from the
// live library-people list, mirroring src/app/api/library/people/route.ts
// (icon-aware: any record with a resolved icon is always kept). Run with the
// react-server condition so server-only modules load under tsx:
//   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/ingest/icons/preview-picker-cleanup.ts

import { getLibraryPeopleFromAll } from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";
import {
  isPickerClutter,
  buildRichNameSet,
  isStubDuplicate,
} from "@/lib/content/picker-cleanup";

function main() {
  const people = getLibraryPeopleFromAll().map((p) => ({
    person: p,
    name: p.name,
    summary: p.summary,
    hasIcon: Boolean(getIconForPerson(p)),
  }));
  const rich = buildRichNameSet(people);
  const drops: Record<string, string[]> = {
    event: [],
    artifact: [],
    relational: [],
    stubDup: [],
  };
  let kept = 0;
  for (const item of people) {
    if (item.hasIcon) {
      kept++;
      continue;
    }
    const reason = isPickerClutter(item.name);
    if (reason) {
      drops[reason].push(item.name);
      continue;
    }
    if (isStubDuplicate(item, rich)) {
      drops.stubDup.push(`${item.person.id}  ::  ${item.name}`);
      continue;
    }
    kept++;
  }
  for (const key of ["event", "artifact", "relational", "stubDup"] as const) {
    console.log(`\n=== ${key} (${drops[key].length}) ===`);
    for (const n of drops[key]) console.log("  " + n);
  }
  const total = Object.values(drops).reduce((a, v) => a + v.length, 0);
  console.log(
    `\nTOTAL removed: ${total} of ${people.length}  =>  ${kept} remain`,
  );
}

main();
