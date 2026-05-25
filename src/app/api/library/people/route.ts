import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { IconRef, Person } from "@theosis/core";
import { getLibraryPeopleFromAll } from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";
import { toAbsoluteIconUrl } from "@/lib/content/icon-url";

// List Library-worthy Persons (canonized saints OR authors of any
// Work with a real title) with their resolved icon inlined. Mobile
// Library tab renders this as a grid. Citation-only HCF Persons whose
// only Work is "Untitled commentary" are excluded — they still
// resolve via direct /library/people/<slug> lookups for commentary
// attribution but don't clutter the browse grid.
//
// Icon URLs are absolutized (so the phone can reach them over LAN) and
// cache-busted via toAbsoluteIconUrl — see that helper for details.

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

export type LibraryPerson = Person & { icon: IconRef | null };

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("host") ?? url.host;
  const origin = `${proto}://${host}`;

  const people = getLibraryPeopleFromAll();
  const enriched: LibraryPerson[] = people.map((person) => ({
    ...person,
    icon: toAbsoluteIconUrl(getIconForPerson(person), origin),
  }));

  // Sort by name for the Library list. Stable, predictable.
  enriched.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(
    { people: enriched },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
