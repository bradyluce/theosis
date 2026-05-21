import type { IconRef } from "@/domain/content/types";
import { getAllPeople } from "@/lib/content";
import { getIconForPerson } from "@/lib/content/icon-store";
import { SearchExperience } from "@/features/search/search-experience";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  // Pre-resolve icons for every Person — search returns person hits as
  // "person-<personId>" so the client component can look up an icon by id
  // without needing access to the server-only icon-store.
  const personIcons: Record<string, IconRef> = {};
  for (const person of getAllPeople()) {
    const icon = getIconForPerson(person);
    if (icon) personIcons[person.id] = icon;
  }

  return (
    <SearchExperience
      initialQuery={resolvedSearchParams.q ?? ""}
      personIcons={personIcons}
    />
  );
}
