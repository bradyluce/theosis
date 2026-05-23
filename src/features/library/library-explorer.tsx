"use client";

import Image from "next/image";
import Link from "next/link";
import { CaretRight, MagnifyingGlass, Star } from "@phosphor-icons/react";
import { useDeferredValue, useMemo, useState } from "react";
import type {
  IconRef,
  Person,
  SourceRecord,
  TopicTag,
  Work,
} from "@theosis/core";
import { isCanonizedSaint } from "@/lib/content/saint-predicate";
import { cn } from "@/lib/utils";

// Sort key for the people grid: bare name without honorific or
// articles, so "St. Augustine" sorts with the A's, not under "S".
function displayNameForSort(person: Person): string {
  return person.name
    .replace(/^(St\.?|Saint|Holy|Blessed|Venerable|The)\s+/i, "")
    .trim()
    .toLowerCase();
}

type LibraryTab = "all" | "fathers" | "saints" | "works" | "saved" | "completed";

type LibraryExplorerProps = {
  people: Person[];
  works: Work[];
  topics: TopicTag[];
  sources: SourceRecord[];
  personIcons?: Record<string, IconRef>;
};

// Compact native-select with the dark scholarly treatment.
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[10px] border border-line/60 bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 hover:border-line-strong focus:border-line-strong"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LibraryExplorer({
  people,
  works,
  topics,
  sources,
  personIcons,
}: LibraryExplorerProps) {
  const [tab, setTab] = useState<LibraryTab>("all");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [era, setEra] = useState("all");
  const [personKind, setPersonKind] = useState("all");
  const [workType, setWorkType] = useState("all");
  const [length, setLength] = useState("all");
  const [source, setSource] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const sourceById = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    for (const src of sources) map.set(src.id, src);
    return map;
  }, [sources]);

  const eraOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...people.map((p) => p.eraLabel),
          ...works.map((w) => w.eraLabel),
        ]),
      ),
    [people, works],
  );

  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          works
            .map((work) => sourceById.get(work.sourceId)?.collection)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [works, sourceById],
  );

  const featuredFather = useMemo(
    () =>
      people.find((p) => p.id === "john-chrysostom") ??
      people.find((p) => p.kind === "father"),
    [people],
  );

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      if (tab === "works") return false;
      if (tab === "fathers" && person.kind !== "father") return false;
      // Saints tab uses the broader canonisation heuristic so Doctors
      // of the Church like Augustine (kind="father", honorific "St.")
      // and English saints like Bede the Venerable also surface here.
      if (tab === "saints" && !isCanonizedSaint(person)) return false;
      if (personKind !== "all" && person.kind !== personKind) return false;
      if (topic !== "all" && !person.topicSlugs.includes(topic)) return false;
      if (era !== "all" && person.eraLabel !== era) return false;
      if (deferredQuery.length === 0) return true;
      return `${person.name} ${person.summary} ${person.topicSlugs.join(" ")}`
        .toLowerCase()
        .includes(deferredQuery);
    });
  }, [people, tab, personKind, topic, era, deferredQuery]);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      if (tab !== "all" && tab !== "works") return false;
      const sourceLabel = sourceById.get(work.sourceId)?.collection ?? "";
      if (topic !== "all" && !work.topicSlugs.includes(topic)) return false;
      if (era !== "all" && work.eraLabel !== era) return false;
      if (workType !== "all" && work.workType !== workType) return false;
      if (length !== "all" && work.lengthLabel !== length) return false;
      if (source !== "all" && sourceLabel !== source) return false;
      if (deferredQuery.length === 0) return true;
      return `${work.title} ${work.summary} ${work.topicSlugs.join(" ")}`
        .toLowerCase()
        .includes(deferredQuery);
    });
  }, [works, tab, topic, era, workType, length, source, deferredQuery, sourceById]);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Top icon row */}
      <div className="flex justify-end pt-2">
        <button
          aria-label="Toggle filters"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border border-line/60 bg-surface text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink",
            showFilters && "border-accent/40 text-accent",
          )}
        >
          <MagnifyingGlass size={18} />
        </button>
      </div>

      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
        Library
      </h1>

      {/* Pill tabs */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabPill active={tab === "all"} onClick={() => setTab("all")} label="My Library" />
        <TabPill active={tab === "fathers"} onClick={() => setTab("fathers")} label="Fathers" />
        <TabPill active={tab === "saints"} onClick={() => setTab("saints")} label="Saints" />
        <TabPill active={tab === "works"} onClick={() => setTab("works")} label="Works" />
        <TabPill active={tab === "saved"} onClick={() => setTab("saved")} label="Saved" />
        <TabPill active={tab === "completed"} onClick={() => setTab("completed")} label="Completed" />
      </div>

      {/* Search input */}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Fathers, saints, works, and topics"
          className="w-full rounded-full border border-line/60 bg-surface px-10 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-line-strong"
        />
      </div>

      {/* Filter dropdowns — toggle visibility via magnifier icon */}
      {showFilters ? (
        <div className="grid grid-cols-2 gap-3 rounded-[14px] border border-line/40 bg-surface p-4 sm:grid-cols-3">
          <FilterSelect
            label="Topic"
            value={topic}
            onChange={setTopic}
            options={[
              { value: "all", label: "All topics" },
              ...topics.map((item) => ({ value: item.slug, label: item.label })),
            ]}
          />
          <FilterSelect
            label="Era"
            value={era}
            onChange={setEra}
            options={[
              { value: "all", label: "All eras" },
              ...eraOptions.map((item) => ({ value: item, label: item })),
            ]}
          />
          {tab !== "works" ? (
            <FilterSelect
              label="Figure type"
              value={personKind}
              onChange={setPersonKind}
              options={[
                { value: "all", label: "All figures" },
                { value: "father", label: "Father" },
                { value: "saint", label: "Saint" },
                { value: "theologian", label: "Theologian" },
              ]}
            />
          ) : null}
          {tab !== "saints" ? (
            <>
              <FilterSelect
                label="Work type"
                value={workType}
                onChange={setWorkType}
                options={[
                  { value: "all", label: "All works" },
                  { value: "commentary", label: "Commentary" },
                  { value: "homily", label: "Homily" },
                  { value: "treatise", label: "Treatise" },
                  { value: "life", label: "Life" },
                  { value: "letter", label: "Letter" },
                ]}
              />
              <FilterSelect
                label="Length"
                value={length}
                onChange={setLength}
                options={[
                  { value: "all", label: "All lengths" },
                  { value: "short", label: "Short" },
                  { value: "medium", label: "Medium" },
                  { value: "long", label: "Long" },
                ]}
              />
              <FilterSelect
                label="Source"
                value={source}
                onChange={setSource}
                options={[
                  { value: "all", label: "All sources" },
                  ...sourceOptions.map((item) => ({ value: item, label: item })),
                ]}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {/* Featured hero — scholarly gold-accent surface, no colored gradient */}
      {tab !== "works" && deferredQuery.length === 0 && featuredFather ? (
        <Link
          href={`/library/people/${featuredFather.slug}`}
          className="block overflow-hidden rounded-[20px] border border-accent/20 bg-surface p-6"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            Featured · {featuredFather.kind === "father" ? "Father" : featuredFather.kind}
          </p>
          <h2 className="mt-4 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            {featuredFather.honorific
              ? `${featuredFather.honorific} ${featuredFather.name.split(",")[0]}`
              : featuredFather.name.split(",")[0]}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
            {featuredFather.summary}
          </p>
          <p className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-accent">
            Read more <CaretRight size={12} weight="bold" />
          </p>
        </Link>
      ) : null}

      {/* People section */}
      {tab !== "works" && filteredPeople.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl tracking-tight text-ink">
              {tab === "fathers"
                ? "Fathers of the Church"
                : tab === "saints"
                  ? "Saints"
                  : "Fathers, saints & theologians"}
            </h2>
            <button
              onClick={() => setTab(tab === "fathers" || tab === "saints" ? tab : "fathers")}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              See All →
            </button>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* All-tab keeps a 24-card preview ordered by source priority
                (seed first). Dedicated Fathers/Saints tabs sort the full
                list alphabetically by display name so users browsing by
                category get a predictable A→Z scroll. */}
            {(tab === "all"
              ? filteredPeople.slice(0, 24)
              : [...filteredPeople].sort((a, b) =>
                  displayNameForSort(a).localeCompare(displayNameForSort(b)),
                )
            ).map((person) => {
              const icon = personIcons?.[person.id];
              return (
                <Link
                  key={person.id}
                  href={`/library/people/${person.slug}`}
                  className="flex w-44 shrink-0 flex-col gap-3 rounded-[16px] border border-line/40 bg-surface p-4 transition-colors duration-200 hover:bg-surface-strong"
                >
                  {icon ? (
                    <div className="relative h-28 overflow-hidden rounded-[12px] border border-line/60 bg-surface">
                      <Image
                        src={icon.src}
                        alt={icon.alt}
                        width={icon.width}
                        height={icon.height}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-[12px] border border-accent/20 bg-accent-soft font-serif text-3xl text-accent">
                      {person.name
                        .replace(/^(St\.|the |of )/, "")
                        .trim()
                        .slice(0, 1)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                      {person.eraLabel}
                    </p>
                    <p className="line-clamp-2 font-serif text-base font-medium leading-tight text-ink">
                      {person.honorific
                        ? `${person.honorific} ${person.name.split(",")[0]}`
                        : person.name.split(",")[0]}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Works section */}
      {tab !== "saints" && filteredWorks.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl tracking-tight text-ink">
              Works
            </h2>
            <button
              onClick={() => setTab("works")}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              See All →
            </button>
          </div>
          <div className="grid gap-3">
            {filteredWorks.slice(0, 20).map((work) => {
              const author = people.find((p) => p.id === work.personId);
              const authorIcon = author ? personIcons?.[author.id] : undefined;
              return (
                <Link
                  key={work.id}
                  href={`/library/works/${work.slug}`}
                  className="flex items-center gap-4 rounded-[14px] border border-line/40 bg-surface p-4 transition-colors duration-200 hover:bg-surface-strong"
                >
                  {authorIcon ? (
                    <Image
                      src={authorIcon.src}
                      alt={authorIcon.alt}
                      width={authorIcon.width}
                      height={authorIcon.height}
                      className="h-14 w-14 shrink-0 rounded-[10px] border border-line/60 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-accent/20 bg-accent-soft text-accent">
                      <Star size={20} weight="fill" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                      {work.workType} · {work.lengthLabel}
                    </p>
                    <p className="line-clamp-1 font-serif text-lg tracking-tight text-ink">
                      {work.title}
                    </p>
                    {author ? (
                      <p className="text-xs text-ink-muted">
                        {author.honorific
                          ? `${author.honorific} ${author.name.split(",")[0]}`
                          : author.name.split(",")[0]}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {filteredPeople.length === 0 && filteredWorks.length === 0 ? (
        <div className="rounded-[14px] border border-line/40 bg-surface px-4 py-8 text-center">
          <p className="text-sm text-ink-soft">No results for this filter.</p>
        </div>
      ) : null}
    </div>
  );
}

function TabPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors duration-200",
        active
          ? "border-ink bg-ink text-background"
          : "border-line-strong/60 bg-transparent text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
