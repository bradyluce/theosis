import { ReadingListView } from "@/features/profile/reading-list-view";
import type { Person } from "@theosis/core";
import {
  getAllPeopleFromAll,
  getAllWorksFromAll,
} from "@/lib/content/commentary-loader";

export default function ReadingListPage() {
  const works = getAllWorksFromAll();
  const people = getAllPeopleFromAll();

  // Build the person-by-id map on the server so the client just gets a plain
  // record — keeps the loader (which is server-only) out of the client bundle.
  const peopleById: Record<string, Person | undefined> = {};
  for (const p of people) peopleById[p.id] = p;

  return <ReadingListView works={works} peopleById={peopleById} />;
}
