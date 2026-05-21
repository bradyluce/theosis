"use client";

import Link from "next/link";
import { Surface } from "@/components/primitives/surface";
import { useStudyState } from "@/lib/user/use-study-state";
import { ProfileSubPageHeader } from "@/features/profile/sub-page-header";

export function ActivityList() {
  const recentSearches = useStudyState((state) => state.recentSearches);
  const readingHistory = useStudyState((state) => state.readingHistory);

  return (
    <div className="space-y-6">
      <ProfileSubPageHeader eyebrow="Profile" title="Activity" />

      <Surface className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Recent searches
          </p>
          <h2 className="font-serif text-2xl tracking-tight text-ink">
            {recentSearches.length}{" "}
            {recentSearches.length === 1 ? "search" : "searches"}
          </h2>
        </div>
        {recentSearches.length === 0 ? (
          <p className="text-sm leading-7 text-ink-muted">
            Recent searches will appear here once you start searching.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <Link
                key={item.id}
                href={`/search?q=${encodeURIComponent(item.query)}`}
                className="rounded-full border border-line bg-background px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:text-ink"
              >
                {item.query}
              </Link>
            ))}
          </div>
        )}
      </Surface>

      <Surface className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Reading history
          </p>
          <h2 className="font-serif text-2xl tracking-tight text-ink">
            {readingHistory.length}{" "}
            {readingHistory.length === 1 ? "item" : "items"}
          </h2>
        </div>
        {readingHistory.length === 0 ? (
          <p className="text-sm leading-7 text-ink-muted">
            Reading history will appear here as you open chapters and works.
          </p>
        ) : (
          <div className="grid gap-3">
            {readingHistory.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-[12px] border border-line bg-background px-4 py-3 transition-colors duration-200 hover:bg-surface-strong"
              >
                <p className="text-sm font-medium text-ink">{item.label}</p>
              </Link>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
