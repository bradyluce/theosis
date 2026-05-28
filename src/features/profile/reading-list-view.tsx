"use client";

import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  CaretLeft,
  Check,
  Star,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import type {
  ReadingListItem,
  ReadingListStatus,
} from "@/domain/user/types";
import type { Person, Work } from "@theosis/core";
import { useStudyState } from "@/lib/user/use-study-state";
import { cn } from "@/lib/utils";

type Props = {
  works: Work[];
  peopleById: Record<string, Person | undefined>;
};

const STATUSES: ReadingListStatus[] = ["reading", "read-later", "read"];
const STATUS_LABEL: Record<ReadingListStatus, string> = {
  reading: "Reading",
  "read-later": "Read Later",
  read: "Read",
};
const STATUS_ICON: Record<ReadingListStatus, React.ReactNode> = {
  reading: <BookOpen size={16} weight="fill" />,
  "read-later": <Bookmark size={16} weight="fill" />,
  read: <Check size={16} weight="bold" />,
};

// Reading list page rendered at /you/reading-list. Reads the list off the
// study store and joins each entry against the merged works catalogue
// (server-passed via props so client doesn't need server-only modules).
export function ReadingListView({ works, peopleById }: Props) {
  const list = useStudyState((state) => state.readingList ?? []);
  const setStatus = useStudyState((state) => state.setReadingListStatus);
  const remove = useStudyState((state) => state.removeFromReadingList);

  const workById = useMemo(() => {
    const m = new Map<string, Work>();
    for (const w of works) m.set(w.id, w);
    return m;
  }, [works]);

  const grouped = useMemo(() => {
    const out: Record<ReadingListStatus, ReadingListItem[]> = {
      reading: [],
      "read-later": [],
      read: [],
    };
    for (const item of list) out[item.status].push(item);
    for (const status of STATUSES) {
      out[status].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    }
    return out;
  }, [list]);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="pt-2">
        <Link
          href="/you"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
        >
          <CaretLeft size={14} weight="bold" /> You
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Reading list
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          My library queue
        </h1>
        <p className="text-sm text-ink-muted">
          Works you&apos;ve queued, are reading, or have finished. Move between
          categories from each row&apos;s actions, or from the button on a work
          page.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-[14px] border border-line/40 bg-surface px-4 py-10 text-center">
          <p className="font-serif text-lg text-ink">Nothing here yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Open any work in the library and tap &quot;Read Later&quot; to add it.
          </p>
          <Link
            href="/library"
            className="mt-4 inline-block rounded-full border border-accent/40 bg-accent-soft px-5 py-2 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent/20"
          >
            Browse the library
          </Link>
        </div>
      ) : null}

      {STATUSES.map((status) => {
        const items = grouped[status];
        if (items.length === 0) return null;
        return (
          <section key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
                {STATUS_ICON[status]}
              </span>
              <h2 className="font-serif text-2xl tracking-tight text-ink">
                {STATUS_LABEL[status]}
              </h2>
              <span className="font-mono text-xs text-ink-soft">
                {items.length}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((item) => {
                const work = workById.get(item.workId);
                if (!work) return null;
                const author = peopleById[work.personId];
                return (
                  <li
                    key={item.id}
                    className="flex items-stretch gap-3 rounded-[14px] border border-line/40 bg-surface p-4"
                  >
                    <Link
                      href={`/library/works/${work.slug}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-accent/20 bg-accent-soft text-accent">
                        <Star size={18} weight="fill" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                          {work.workType} · {work.lengthLabel}
                        </p>
                        <p className="line-clamp-1 font-serif text-base font-medium tracking-tight text-ink">
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
                    <div className="flex shrink-0 flex-col gap-1">
                      {STATUSES.filter((s) => s !== status).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(work.id, s)}
                          className={cn(
                            "rounded-full border border-line/40 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-ink-soft transition-colors duration-200 hover:border-accent/40 hover:text-accent",
                          )}
                        >
                          → {STATUS_LABEL[s]}
                        </button>
                      ))}
                      <button
                        onClick={() => remove(work.id)}
                        className="rounded-full px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-ink-soft transition-colors duration-200 hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
