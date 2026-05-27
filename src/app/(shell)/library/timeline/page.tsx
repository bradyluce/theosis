import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { TimelineView } from "@/features/library/timeline/timeline-view";
import { parseEra } from "@/features/library/timeline/era-parser";
import { getAllPeople } from "@/lib/content";
import { getIconForPerson } from "@/lib/content/icon-store";

export const metadata = {
  title: "Patristic timeline",
};

export default function TimelinePage() {
  // Resolve everyone with a parseable era on the server so the client view
  // ships only the rendered subset (drop unknowns, attach icons).
  const entries = getAllPeople()
    .map((person) => {
      const parsed = parseEra(person.eraLabel);
      if (!parsed) return null;
      return {
        person,
        icon: getIconForPerson(person),
        year: parsed.year,
        eraLabel: person.eraLabel,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="pt-2">
        <Link
          href="/library"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
        >
          <CaretLeft size={14} weight="bold" /> Library
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Across the centuries
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">
          Patristic timeline
        </h1>
        <p className="text-sm leading-7 text-ink-muted">
          Every Father and saint in the library, arranged by century.
          Tap a century to jump there, tap a name to read more.
        </p>
      </header>

      <TimelineView people={entries} />
    </div>
  );
}
