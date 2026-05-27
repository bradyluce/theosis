"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import type { IconRef, Person } from "@theosis/core";
import {
  centuryFromYear,
  centuryFullLabel,
  centuryLabel,
} from "@theosis/core";
import { cn } from "@/lib/utils";

type TimelinePerson = {
  person: Person;
  icon: IconRef | undefined;
  year: number;
  eraLabel: string;
};

type TimelineViewProps = {
  people: TimelinePerson[];
};

// BC centuries (negative) render first in reading order — 20th BC down
// to 1st BC — then 1st AD onward.
const CENTURY_BC_FROM = 20;
const CENTURY_BC_TO = 1;
const CENTURY_AD_FROM = 1;
const CENTURY_AD_TO = 21;

function orderedCenturies(): number[] {
  const bc = Array.from(
    { length: CENTURY_BC_FROM - CENTURY_BC_TO + 1 },
    (_, i) => -(CENTURY_BC_FROM - i),
  );
  const ad = Array.from(
    { length: CENTURY_AD_TO - CENTURY_AD_FROM + 1 },
    (_, i) => CENTURY_AD_FROM + i,
  );
  return [...bc, ...ad];
}

export function TimelineView({ people }: TimelineViewProps) {
  // Group by century, sorted by year within each century.
  const buckets = useMemo(() => {
    const byCentury = new Map<number, TimelinePerson[]>();
    for (const entry of people) {
      const c = centuryFromYear(entry.year);
      let arr = byCentury.get(c);
      if (!arr) {
        arr = [];
        byCentury.set(c, arr);
      }
      arr.push(entry);
    }
    for (const arr of byCentury.values()) {
      arr.sort((a, b) => a.year - b.year);
    }
    return byCentury;
  }, [people]);

  // Filter: "saints only" toggle.
  const [saintsOnly, setSaintsOnly] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setSaintsOnly((v) => !v)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
            saintsOnly
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-line/60 bg-surface text-ink-soft hover:text-ink",
          )}
        >
          {saintsOnly ? "Saints only" : "All voices"}
        </button>
      </div>

      {/* Sticky century strip — tap to scroll. Hidden on the smallest
          screens where the section headers do the same job. */}
      <CenturyStrip buckets={buckets} />

      <div className="space-y-10">
        {orderedCenturies().map((c) => {
          const entries = (buckets.get(c) ?? []).filter((entry) =>
            saintsOnly ? entry.person.kind === "saint" : true,
          );
          if (entries.length === 0) return null;
          return <CenturySection key={c} century={c} entries={entries} />;
        })}
      </div>
    </div>
  );
}

function CenturyStrip({
  buckets,
}: {
  buckets: Map<number, TimelinePerson[]>;
}) {
  const centuries = orderedCenturies().filter(
    (c) => (buckets.get(c)?.length ?? 0) > 0,
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
      <div className="inline-flex min-w-full items-end gap-2 pb-2">
        {centuries.map((c) => {
          const count = buckets.get(c)?.length ?? 0;
          return (
            <a
              key={c}
              href={`#century-${c}`}
              className="flex flex-col items-center gap-1 rounded-[10px] border border-line/40 bg-surface px-3 py-2 text-center transition-colors hover:bg-surface-strong"
            >
              <span className="font-serif text-base text-ink">
                {centuryLabel(c)}
              </span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-ink-soft">
                {c < 0 ? "BC · " : ""}
                {count} {count === 1 ? "voice" : "voices"}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function CenturySection({
  century,
  entries,
}: {
  century: number;
  entries: TimelinePerson[];
}) {
  // Featured: the first ~6 with an icon; the rest go in the compact list.
  const featured = entries.filter((e) => e.icon).slice(0, 6);
  const remaining = entries.filter((e) => !featured.includes(e));

  return (
    <section id={`century-${century}`} className="space-y-4 scroll-mt-16">
      <header className="flex items-baseline gap-3 border-b border-line/40 pb-2">
        <h2 className="font-serif text-3xl tracking-tight text-ink">
          {centuryFullLabel(century)}
        </h2>
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          {century < 0
            ? "Before Christ"
            : century > 20
              ? "Modern"
              : century > 14
                ? "Early modern"
                : century > 4
                  ? "Byzantine"
                  : "Patristic"}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          {entries.length} {entries.length === 1 ? "voice" : "voices"}
        </span>
      </header>

      {featured.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {featured.map((entry) => (
            <FeaturedCard key={entry.person.id} entry={entry} />
          ))}
        </div>
      ) : null}

      {remaining.length > 0 ? (
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {remaining.map((entry) => (
            <li key={entry.person.id}>
              <Link
                href={`/library/people/${entry.person.slug}`}
                className="flex items-baseline justify-between gap-3 rounded-[10px] px-2 py-1.5 text-sm transition-colors hover:bg-surface-strong"
              >
                <span className="truncate font-serif tracking-tight text-ink">
                  {entry.person.honorific
                    ? `${entry.person.honorific} ${entry.person.name}`
                    : entry.person.name}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  {entry.eraLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function FeaturedCard({ entry }: { entry: TimelinePerson }) {
  const { person, icon, eraLabel } = entry;
  return (
    <Link
      href={`/library/people/${person.slug}`}
      className="group flex items-center gap-3 rounded-[14px] border border-line/40 bg-surface p-3 transition-colors hover:bg-surface-strong"
    >
      {icon ? (
        <Image
          src={icon.src}
          alt={icon.alt}
          width={icon.width}
          height={icon.height}
          className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft font-serif text-base text-accent">
          {(person.honorific ?? person.name).replace(/^(St\.|the |of )/, "").trim().slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-sm tracking-tight text-ink">
          {person.honorific ? `${person.honorific} ${person.name}` : person.name}
        </p>
        <p className="truncate text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          {eraLabel}
        </p>
      </div>
      <CaretRight
        size={12}
        weight="bold"
        className="shrink-0 text-ink-soft transition-colors group-hover:text-ink"
      />
    </Link>
  );
}
