"use client";

import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/primitives/button";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { searchTheosis } from "@/features/search/search-engine";
import { useStudyState } from "@/lib/user/use-study-state";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, terms: string[]): ReactNode {
  if (terms.length === 0) {
    return text;
  }

  const expression = new RegExp(
    `(${terms.map((term) => escapeRegExp(term)).join("|")})`,
    "gi",
  );
  const parts = text.split(expression);

  return parts.map((part, index) => {
    const match = terms.some((term) => part.toLowerCase() === term.toLowerCase());

    return match ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-accent-soft px-1 text-inherit"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

export function SearchExperience({ initialQuery }: { initialQuery: string }) {
  const recentSearches = useStudyState((state) => state.recentSearches);
  const addRecentSearch = useStudyState((state) => state.addRecentSearch);
  const [query, setQuery] = useState(
    initialQuery || recentSearches[0]?.query || "",
  );
  const deferredQuery = useDeferredValue(query.trim());
  const searchModel = useMemo(
    () => searchTheosis(deferredQuery),
    [deferredQuery],
  );

  function submitQuery(nextQuery: string) {
    if (!nextQuery.trim()) {
      return;
    }

    addRecentSearch(nextQuery.trim());
    setQuery(nextQuery);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Search"
        title="Search"
        description="Search any verse, saint, Father, work, or theological topic, with direct commentary ranked ahead of merely related material."
      />

      <Surface className="space-y-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitQuery(query);
          }}
          className="space-y-4"
        >
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search John 1:1, theosis, Gregory Palamas, or Homilies on John"
              className="w-full rounded-[12px] border border-line bg-surface-strong px-11 py-4 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink-soft focus:border-line-strong"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {["John 1:1", "theosis", "Gregory Palamas"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => submitQuery(item)}
                className="rounded-full border border-line bg-background px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:text-ink"
              >
                {item}
              </button>
            ))}
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {recentSearches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setQuery(item.query)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:text-ink"
            >
              {item.query}
            </button>
          ))}
        </div>
      </Surface>

      {deferredQuery ? (
        <>
          <Surface tone="accent" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill variant="accent">
                {searchModel.intent.kind === "reference"
                  ? "Verse reference detected"
                  : "Keyword search"}
              </Pill>
              <Pill variant="subtle">{searchModel.results.length} results</Pill>
            </div>
            <p className="text-sm leading-7 text-ink-muted">
              Direct commentary is intentionally ranked above related writings so
              verse-first interpretation remains the primary experience.
            </p>
          </Surface>

          <div className="grid gap-4">
            {searchModel.results.map((result) => (
              <Link
                key={result.id}
                href={result.href}
                onClick={() => addRecentSearch(query.trim())}
                className="rounded-[12px] border border-line bg-surface px-5 py-5 transition-colors duration-200 hover:bg-surface-strong"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>{result.kicker}</Pill>
                  <Pill variant="subtle">{result.kind}</Pill>
                </div>
                <h2 className="mt-3 font-serif text-3xl tracking-tight text-ink">
                  {highlightText(result.title, result.highlightTerms)}
                </h2>
                <p className="mt-2 text-sm leading-7 text-ink-muted">
                  {highlightText(result.snippet, result.highlightTerms)}
                </p>
              </Link>
            ))}

            {searchModel.results.length === 0 ? (
              <Surface tone="quiet" className="space-y-2">
                <h2 className="font-serif text-3xl tracking-tight text-ink">
                  No seeded results matched this query.
                </h2>
                <p className="text-sm leading-7 text-ink-muted">
                  The search engine is ready for a larger corpus once ingestion
                  starts. Try a verse reference, saint name, or topic such as
                  &quot;theosis.&quot;
                </p>
              </Surface>
            ) : null}
          </div>
        </>
      ) : (
        <Surface tone="quiet" className="space-y-2">
          <h2 className="font-serif text-3xl tracking-tight text-ink">
            Start with a verse, a Father, or a topic.
          </h2>
          <p className="text-sm leading-7 text-ink-muted">
            The search surface is seeded for verse references, saint names, work
            titles, and theological topics. Recent searches persist locally.
          </p>
        </Surface>
      )}
    </div>
  );
}
