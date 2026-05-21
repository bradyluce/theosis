import { LibraryExplorer } from "@/features/library/library-explorer";
import { getAllTopics } from "@/lib/content";
import {
  getAllPeopleFromAll,
  getAllSourcesFromAll,
  getAllWorksFromAll,
} from "@/lib/content/commentary-loader";

export default function LibraryPage() {
  const people = getAllPeopleFromAll();
  const works = getAllWorksFromAll();
  const topics = getAllTopics();
  const sources = getAllSourcesFromAll();

  return (
    <LibraryExplorer
      people={people}
      works={works}
      topics={topics}
      sources={sources}
    />
  );
}
