import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { IconRef, Person, TopicPageResponse, Work } from "@theosis/core";
import {
  getAllPeopleFromAll,
  getAllWorksFromAll,
} from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";
import { toAbsoluteIconUrl } from "@/lib/content/icon-url";
import { getTopicPageBySlug } from "@/lib/content/queries";
import { resolveRequestOrigin } from "@/lib/request-origin";

// Full topic landing page. Resolves the curated Father IDs and Work slugs
// against the live people/works catalog so the client gets enriched records
// (with icons for Fathers, full Work metadata) — saves it the round-trip.

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

function withIcon(person: Person, origin: string) {
  return { ...person, icon: toAbsoluteIconUrl(getIconForPerson(person), origin) };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const topic = getTopicPageBySlug(slug);
  if (!topic) {
    return NextResponse.json({ error: `Topic not found: ${slug}` }, { status: 404 });
  }

  const origin = resolveRequestOrigin(request);

  const allPeople = getAllPeopleFromAll();
  const peopleById = new Map(allPeople.map((p) => [p.id, p]));

  const fathers: Array<Person & { icon: IconRef | null }> = topic.keyFathers
    .map((id) => peopleById.get(id))
    .filter((p): p is Person => Boolean(p))
    .map((p) => withIcon(p, origin));

  const saints: Array<Person & { icon: IconRef | null }> = topic.relatedSaints
    .map((id) => peopleById.get(id))
    .filter((p): p is Person => Boolean(p))
    .map((p) => withIcon(p, origin));

  const allWorks = getAllWorksFromAll();
  const worksBySlug = new Map(allWorks.map((w) => [w.slug, w]));
  const works: Work[] = topic.keyWorks
    .map((slug) => worksBySlug.get(slug))
    .filter((w): w is Work => Boolean(w));

  const payload: TopicPageResponse = { topic, fathers, works, saints };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
