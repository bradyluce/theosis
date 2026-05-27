import Link from "next/link";
import { CaretRight, Clock } from "@phosphor-icons/react/dist/ssr";
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
    <div className="space-y-4">
      <Link
        href="/library/timeline"
        className="flex items-center gap-3 rounded-[14px] border border-line/40 bg-surface px-4 py-3 transition-colors hover:bg-surface-strong"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
          <Clock size={18} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
            Across the centuries
          </p>
          <p className="font-serif text-base tracking-tight text-ink">
            Patristic timeline
          </p>
        </div>
        <CaretRight size={14} weight="bold" className="shrink-0 text-ink-soft" />
      </Link>

      <LibraryExplorer
        people={people}
        works={works}
        topics={topics}
        sources={sources}
        personIcons={personIcons}
      />
    </div>
  );
}
