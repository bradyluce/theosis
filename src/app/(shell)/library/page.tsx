import type { IconRef } from "@/domain/content/types";
import { LibraryExplorer } from "@/features/library/library-explorer";
import { getAllTopics } from "@/lib/content";
import {
  getAllPeopleFromAll,
  getAllSourcesFromAll,
  getAllWorksFromAll,
} from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";

export default function LibraryPage() {
  const people = getAllPeopleFromAll();
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
