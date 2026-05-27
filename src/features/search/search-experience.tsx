"use client";

import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  type ReactNode,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import type { IconRef } from "@theosis/core";
import type { SearchIntent, SearchResult } from "@/domain/search/types";
import { useStudyState } from "@/lib/user/use-study-state";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, terms: string[]): ReactNode {
  if (terms.length === 0) return text;
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
        className="rounded bg-accent/30 px-1 text-ink"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

// Curated discover tiles — scholarly gold-on-dark. No category colors.
const TOPIC_TILES: Array<{ query: string; label: string }> = [
  { query: "theosis", label: "Theosis" },
  { query: "prayer", label: "Prayer" },
  { query: "incarnation", label: "Incarnation" },
  { query: "asceticism", label: "Asceticism" },
  { query: "martyrdom", label: "Martyrs" },
  { query: "light", label: "Divine Light" },
];

type SearchExperienceProps = {
  initialQuery: string;
  personIcons?: Record<string, IconRef>;
};

// Extract the personId from a search result id of shape "person-<id>".
// Returns undefined for any other result kind.
function personIdFromResultId(id: string): string | undefined {
  return id.startsWith("person-") ? id.slice("person-".length) : undefined;
}

export function SearchExperience({
  initialQuery,
  personIcons,
}: SearchExperienceProps) {
  const recentSearches = useStudyState((state) => state.recentSearches);
  const addRecentSearch = useStudyState((state) => state.addRecentSearch);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query.trim());
  const [fetchedModel, setFetchedModel] = useState<{
    intent: SearchIntent | null;
    results: SearchResult[];
  } | null>(null);
  const isSearching = deferredQuery.length > 0;
  // Empty query → empty results without touching state (avoids cascading
  // renders flagged by react-hooks/set-state-in-effect).
  const searchModel = isSearching
    ? (fetchedModel ?? { intent: null, results: [] })
    : { intent: null, results: [] };

  useEffect(() => {
    if (!deferredQuery) return;
    let canceled = false;
    fetch(`/api/search?q=${encodeURIComponent(deferredQuery)}`)
      .then((response) => response.json())
      .then((data: { intent: SearchIntent | null; results: SearchResult[] }) => {
        if (!canceled) setFetchedModel(data);
      })
      .catch(() => {
        if (!canceled) setFetchedModel({ intent: null, results: [] });
      });
    return () => {
      canceled = true;
    };
  }, [deferredQuery]);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Title */}
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink pt-2">
        Discover
      </h1>

      {/* Search bar */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim()) addRecentSearch(query.trim());
        }}
      >
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Scripture, Fathers, topics"
            className="w-full rounded-full border border-line/60 bg-surface px-11 py-3 text-base text-ink outline-none placeholder:text-ink-soft focus:border-line-strong"
          />
        </div>
      </form>

      {isSearching ? (
        // Results state
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
            {searchModel.results.length}{" "}
            {searchModel.results.length === 1 ? "result" : "results"}
            {searchModel.intent?.kind === "reference" ? " · verse reference" : ""}
          </p>
          {searchModel.results.length === 0 ? (
            <div className="rounded-[14px] border border-line/40 bg-surface px-4 py-8 text-center">
              <p className="text-sm text-ink-soft">
                No results. Try a verse reference, saint name, or topic.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {searchModel.results.map((result) => {
                const personId = personIdFromResultId(result.id);
                const icon = personId ? personIcons?.[personId] : undefined;
                return (
                  <li key={result.id}>
                    <Link
                      href={result.href}
                      onClick={() => addRecentSearch(query.trim())}
                      className="flex items-start gap-3 rounded-[14px] border border-line/40 bg-surface px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
                    >
                      {icon ? (
                        <Image
                          src={icon.src}
                          alt={icon.alt}
                          width={icon.width}
                          height={icon.height}
                          className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
                        />
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                          <span>{result.kicker}</span>
                          <span>·</span>
                          <span>{result.kind}</span>
                        </div>
                        <p className="font-serif text-lg leading-tight tracking-tight text-ink">
                          {highlightText(result.title, result.highlightTerms)}
                        </p>
                        <p className="line-clamp-2 text-sm text-ink-muted">
                          {highlightText(result.snippet, result.highlightTerms)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        // Browse state
        <div className="space-y-6">
          {/* Topical grid */}
          <section className="space-y-3">
            <h2 className="font-serif text-2xl tracking-tight text-ink">
              Browse by topic
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TOPIC_TILES.map((tile) => (
                <button
                  key={tile.query}
                  onClick={() => setQuery(tile.query)}
                  className="flex h-24 flex-col items-start justify-end rounded-[14px] border border-accent/20 bg-surface p-4 text-left transition-colors duration-200 hover:border-accent/40 hover:bg-surface-strong"
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] text-accent">
                    Topic
                  </span>
                  <span className="mt-1 font-serif text-lg tracking-tight text-ink">
                    {tile.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Recent */}
          {recentSearches.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-serif text-2xl tracking-tight text-ink">
                Recent
              </h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setQuery(item.query)}
                    className="rounded-full border border-line-strong/60 bg-surface px-4 py-1.5 text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {/* Try these */}
          <section className="space-y-3">
            <h2 className="font-serif text-2xl tracking-tight text-ink">
              Try these
            </h2>
            <div className="space-y-2">
              {["John 1:1", "Gregory Palamas", "Confessions", "Theotokos"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="flex w-full items-center gap-3 rounded-[14px] border border-line/40 bg-surface px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-strong"
                  >
                    <MagnifyingGlass size={16} className="text-ink-soft" />
                    <span className="text-sm text-ink">{suggestion}</span>
                  </button>
                ),
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
