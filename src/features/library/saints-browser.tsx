"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import type { IconRef, Person } from "@theosis/core";

type Props = {
  saints: Person[];
  icons?: Record<string, IconRef>;
};

// Searchable browse view for the saint corpus. Used as the standalone
// /library/saints page and as a candidate-list pattern that the patron
// saint picker (in Profile) also draws from conceptually.
export function SaintsBrowser({ saints, icons }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return saints;
    return saints.filter(
      (saint) =>
        saint.name.toLowerCase().includes(needle) ||
        saint.eraLabel.toLowerCase().includes(needle) ||
        saint.feastDayLabel?.toLowerCase().includes(needle) ||
        saint.traditions.some((t) => t.toLowerCase().includes(needle)) ||
        saint.summary.toLowerCase().includes(needle),
    );
  }, [saints, query]);

  return (
    <div className="space-y-6">
      <Surface className="space-y-3">
        <label className="block text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
          Search
        </label>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, era, region, or feast day"
          className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-1 focus:ring-gold"
        />
        <p className="text-xs text-ink-soft">
          {filtered.length} of {saints.length} {saints.length === 1 ? "saint" : "saints"}
        </p>
      </Surface>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((saint) => {
          const icon = icons?.[saint.id];
          return (
            <Link
              key={saint.id}
              href={`/library/people/${saint.slug}`}
              className="block rounded-[12px] border border-line bg-background px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <Pill variant="subtle">{saint.eraLabel}</Pill>
                {icon ? (
                  <Image
                    src={icon.src}
                    alt={icon.alt}
                    width={icon.width}
                    height={icon.height}
                    className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : null}
              </div>
              <h3 className="mt-3 font-serif text-2xl tracking-tight text-ink">
                {saint.name}
              </h3>
              {saint.feastDayLabel ? (
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-soft">
                  {saint.feastDayLabel}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                {saint.summary}
              </p>
            </Link>
          );
        })}
        {filtered.length === 0 ? (
          <Surface>
            <p className="text-sm text-ink-soft">No saints match your search.</p>
          </Surface>
        ) : null}
      </div>
    </div>
  );
}
