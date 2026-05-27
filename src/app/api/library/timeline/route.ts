import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { parseEra, type TimelineEntry } from "@theosis/core";
import { getAllPeopleFromAll } from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";
import { toAbsoluteIconUrl } from "@/lib/content/icon-url";

// Patristic timeline — every catalogued Person with a parseable era,
// already bucketed (year resolved, icon URL absolute). Mobile clients
// render this without owning the era-parser, but the parser still lives
// in @theosis/core for any client that wants to bucket a fresh Person
// without round-tripping.

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("host") ?? url.host;
  const origin = `${proto}://${host}`;

  // Same union as the web /library/timeline page used — seed + ingested +
  // calendar — so the mobile gets every Person with any catalog presence.
  const people = getAllPeopleFromAll();

  const entries: TimelineEntry[] = [];
  for (const person of people) {
    const parsed = parseEra(person.eraLabel);
    if (!parsed) continue;
    entries.push({
      personId: person.id,
      personSlug: person.slug,
      name: person.name,
      honorific: person.honorific,
      kind: person.kind,
      eraLabel: person.eraLabel,
      year: parsed.year,
      icon: toAbsoluteIconUrl(getIconForPerson(person), origin),
    });
  }

  // Sort by year ascending, then by name within a year — keeps the
  // century buckets deterministic across requests.
  entries.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(
    { entries },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
