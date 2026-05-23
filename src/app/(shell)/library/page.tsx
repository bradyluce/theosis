import type { IconRef } from "@theosis/core";
import { LibraryExplorer } from "@/features/library/library-explorer";
import { getAllTopics } from "@/lib/content";
import {
  getAllSourcesFromAll,
  getAllWorksFromAll,
  getLibraryPeopleFromAll,
} from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";

export default function LibraryPage() {
  // Library landing lists only Fathers with long-form chapters or
  // canonized status. Citation-only authors (e.g. HCF-only commenters
  // who never authored a multi-chapter work and aren't recognised as
  // saints) still resolve via getPersonById from commentary entries —
  // they just don't crowd the Library people grid.
  const people = getLibraryPeopleFromAll();
  const works = getAllWorksFromAll();
  const topics = getAllTopics();
  const sources = getAllSourcesFromAll();
  // Resolve icons server-side so LibraryExplorer (client) can render them
  // without importing the server-only icon-store.
  const personIcons: Record<string, IconRef> = {};
  for (const person of people) {
    const icon = getIconForPerson(person);
    if (icon) personIcons[person.id] = icon;
  }

  return (
    <LibraryExplorer
      people={people}
      works={works}
      topics={topics}
      sources={sources}
      personIcons={personIcons}
    />
  );
}
