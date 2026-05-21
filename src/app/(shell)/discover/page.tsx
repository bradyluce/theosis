import type { IconRef } from "@theosis/core";
import { getAllPeople } from "@/lib/content";
import { getIconForPerson } from "@/lib/content/icon-store";
import { SearchExperience } from "@/features/search/search-experience";

type DiscoverPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const resolved = await searchParams;
  // Pre-resolve person icons so SearchExperience can render thumbnails on
  // person search results — see SearchExperience for the lookup-by-id pattern.
  const personIcons: Record<string, IconRef> = {};
  for (const person of getAllPeople()) {
    const icon = getIconForPerson(person);
    if (icon) personIcons[person.id] = icon;
  }

  return (
    <SearchExperience
      initialQuery={resolved.q ?? ""}
      personIcons={personIcons}
    />
  );
}
