"use client";

import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useDeferredValue, useMemo, useState } from "react";
import { Pill } from "@/components/primitives/pill";
import { SegmentedControl } from "@/components/primitives/segmented-control";
import { Surface } from "@/components/primitives/surface";
import {
  getAllPeople,
  getAllTopics,
  getAllWorks,
  getSourceById,
} from "@/lib/content";
import { cn } from "@/lib/utils";

const people = getAllPeople();
const works = getAllWorks();
const topics = getAllTopics();
const eraOptions = Array.from(
  new Set([...people.map((person) => person.eraLabel), ...works.map((work) => work.eraLabel)]),
);
const sourceOptions = Array.from(
  new Set(
    works
      .map((work) => getSourceById(work.sourceId)?.collection)
      .filter((value): value is string => Boolean(value)),
  ),
);

// Compact native-select wrapper used by the library's filter row. A native
// dropdown gives us the "press to pick" UX the user asked for without
// requiring custom popover state, and is fully accessible / mobile-friendly.
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
      <span className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 hover:border-line-strong focus:border-line-strong"
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

export function LibraryExplorer() {
  const [collection, setCollection] = useState("all");
  const [personKind, setPersonKind] = useState("all");
  const [topic, setTopic] = useState("all");
  const [era, setEra] = useState("all");
  const [source, setSource] = useState("all");
  const [workType, setWorkType] = useState("all");
  const [length, setLength] = useState("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const matchesCollection = collection !== "works";
      const matchesKind = personKind === "all" || person.kind === personKind;
      const matchesTopic =
        topic === "all" || person.topicSlugs.includes(topic);
      const matchesEra = era === "all" || person.eraLabel === era;
      const matchesQuery =
        deferredQuery.length === 0 ||
        `${person.name} ${person.summary} ${person.topicSlugs.join(" ")}`.toLowerCase().includes(
          deferredQuery,
        );

      return (
        matchesCollection &&
        matchesKind &&
        matchesTopic &&
        matchesEra &&
        matchesQuery
      );
    });
  }, [collection, deferredQuery, era, personKind, topic]);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const sourceLabel = getSourceById(work.sourceId)?.collection ?? "";
      const matchesCollection = collection !== "people";
      const matchesTopic = topic === "all" || work.topicSlugs.includes(topic);
      const matchesEra = era === "all" || work.eraLabel === era;
      const matchesSource = source === "all" || sourceLabel === source;
      const matchesType = workType === "all" || work.workType === workType;
      const matchesLength = length === "all" || work.lengthLabel === length;
      const matchesQuery =
        deferredQuery.length === 0 ||
        `${work.title} ${work.summary} ${work.topicSlugs.join(" ")}`
          .toLowerCase()
          .includes(deferredQuery);

      return (
        matchesCollection &&
        matchesTopic &&
        matchesEra &&
        matchesSource &&
        matchesType &&
        matchesLength &&
        matchesQuery
      );
    });
  }, [collection, deferredQuery, era, length, source, topic, workType]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Surface className="space-y-4">
          <Pill>Browse the corpus</Pill>
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Fathers, saints, works, and topics"
              className="w-full rounded-[12px] border border-line bg-surface-strong px-10 py-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink-soft focus:border-line-strong"
            />
          </div>
          <SegmentedControl
            items={[
              { value: "all", label: "All" },
              { value: "people", label: "People" },
              { value: "works", label: "Works" },
            ]}
            value={collection}
            onChange={setCollection}
          />
        </Surface>

        <Surface className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Figures
            </p>
            <p className="font-serif text-3xl tracking-tight text-ink">
              {people.length}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Works
            </p>
            <p className="font-serif text-3xl tracking-tight text-ink">
              {works.length}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Topics
            </p>
            <p className="font-serif text-3xl tracking-tight text-ink">
              {topics.length}
            </p>
          </div>
        </Surface>
      </div>

      <Surface className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        {collection !== "works" ? (
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
        {collection !== "people" ? (
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
      </Surface>

      <Surface className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Topics in circulation
            </p>
            <h2 className="font-serif text-3xl tracking-tight text-ink">
              Study themes
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((item) => (
            <div
              key={item.slug}
              id={`topic-${item.slug}`}
              className="rounded-[12px] border border-line bg-background px-4 py-4"
            >
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Topic
              </p>
              <h3 className="mt-1 font-serif text-2xl tracking-tight text-ink">
                {item.label}
              </h3>
              <p className="mt-2 text-sm leading-7 text-ink-muted">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </Surface>

      {collection !== "works" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                People
              </p>
              <h2 className="font-serif text-3xl tracking-tight text-ink">
                Fathers, saints, and theologians
              </h2>
            </div>
            <p className="text-sm text-ink-muted">{filteredPeople.length} shown</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredPeople.map((person) => (
              <Link
                key={person.id}
                href={`/library/people/${person.slug}`}
                className="rounded-[12px] border border-line bg-surface px-5 py-5 transition-colors duration-200 hover:bg-surface-strong"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Pill>{person.kind}</Pill>
                    <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                      {person.eraLabel}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-3xl tracking-tight text-ink">
                      {person.honorific ? `${person.honorific} ${person.name}` : person.name}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-ink-muted">
                      {person.summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {person.topicSlugs.slice(0, 3).map((slug) => {
                      const topicItem = topics.find((item) => item.slug === slug);
                      return topicItem ? (
                        <Pill key={slug} variant="subtle">
                          {topicItem.label}
                        </Pill>
                      ) : null;
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {collection !== "people" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Works
              </p>
              <h2 className="font-serif text-3xl tracking-tight text-ink">
                Readable source material
              </h2>
            </div>
            <p className="text-sm text-ink-muted">{filteredWorks.length} shown</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredWorks.map((work) => {
              const person = people.find((item) => item.id === work.personId);
              const sourceLabel = getSourceById(work.sourceId)?.collection ?? "Seeded";

              return (
                <Link
                  key={work.id}
                  href={`/library/works/${work.slug}`}
                  className="rounded-[12px] border border-line bg-surface px-5 py-5 transition-colors duration-200 hover:bg-surface-strong"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Pill>{work.workType}</Pill>
                      <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                        {work.lengthLabel}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-serif text-3xl tracking-tight text-ink">
                        {work.title}
                      </h3>
                      <p className="mt-1 text-sm text-ink-soft">
                        {person?.name} / {sourceLabel}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-ink-muted">
                        {work.summary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {work.topicSlugs.slice(0, 3).map((slug) => {
                        const topicItem = topics.find((item) => item.slug === slug);
                        return topicItem ? (
                          <Pill key={slug} variant="subtle">
                            {topicItem.label}
                          </Pill>
                        ) : null;
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
