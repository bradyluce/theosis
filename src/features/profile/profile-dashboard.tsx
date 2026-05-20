"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { getAllSaints, getPersonById, getVerseById } from "@/lib/content";
import { useStudyState } from "@/lib/user/use-study-state";
import { PatronSaintPicker } from "@/features/profile/patron-saint-picker";

export function ProfileDashboard() {
  const savedVerses = useStudyState((state) => state.savedVerses);
  const highlights = useStudyState((state) => state.highlights);
  const notes = useStudyState((state) => state.notes);
  const favoritePeople = useStudyState((state) => state.favoritePeople);
  const recentSearches = useStudyState((state) => state.recentSearches);
  const readingHistory = useStudyState((state) => state.readingHistory);
  const preferences = useStudyState((state) => state.preferences);

  const resolvedSavedVerses = useMemo(
    () =>
      savedVerses
        .map((item) => getVerseById(item.verseId))
        .filter((value): value is NonNullable<ReturnType<typeof getVerseById>> => Boolean(value)),
    [savedVerses],
  );

  const resolvedFavorites = useMemo(
    () =>
      favoritePeople
        .map((item) => getPersonById(item.personId))
        .filter((value): value is NonNullable<ReturnType<typeof getPersonById>> => Boolean(value)),
    [favoritePeople],
  );

  const patronSaint = getPersonById(preferences.patronSaintPersonId);
  const allSaints = useMemo(() => getAllSaints(), []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile"
        title="Profile"
        description="Local-first study state for saved verses, notes, highlights, favorites, reading history, and future account-backed preferences."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Surface className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Saved verses
          </p>
          <p className="font-serif text-3xl tracking-tight text-ink">
            {savedVerses.length}
          </p>
        </Surface>
        <Surface className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Notes
          </p>
          <p className="font-serif text-3xl tracking-tight text-ink">{notes.length}</p>
        </Surface>
        <Surface className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Highlights
          </p>
          <p className="font-serif text-3xl tracking-tight text-ink">
            {highlights.length}
          </p>
        </Surface>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface className="space-y-4">
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Saved study
            </p>
            <h2 className="font-serif text-3xl tracking-tight text-ink">
              Verses and notes
            </h2>
          </div>
          <div className="grid gap-3">
            {resolvedSavedVerses.map((verse) => (
              <Link
                key={verse.id}
                href={`/bible/${verse.translationId}/${verse.bookSlug}/${verse.chapterNumber}#${verse.id}`}
                className="rounded-[12px] border border-line bg-background px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
              >
                <Pill variant="subtle">{verse.referenceLabel}</Pill>
                <p className="mt-3 font-serif text-2xl leading-9 tracking-tight text-ink">
                  {verse.text}
                </p>
              </Link>
            ))}
            {resolvedSavedVerses.length === 0 ? (
              <p className="text-sm leading-7 text-ink-muted">
                Save verses from the reader to populate this section.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-[12px] border border-line bg-background px-4 py-4"
              >
                <Pill>{note.title}</Pill>
                <p className="mt-3 text-sm leading-7 text-ink-muted">{note.body}</p>
              </div>
            ))}
          </div>
        </Surface>

        <div className="space-y-4">
          <Surface className="space-y-4">
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Favorite figures
              </p>
              <h2 className="font-serif text-3xl tracking-tight text-ink">
                People you return to
              </h2>
            </div>
            <div className="grid gap-3">
              {resolvedFavorites.map((person) => (
                <Link
                  key={person.id}
                  href={`/library/people/${person.slug}`}
                  className="rounded-[12px] border border-line bg-background px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
                >
                  <Pill>{person.kind}</Pill>
                  <h3 className="mt-3 font-serif text-2xl tracking-tight text-ink">
                    {person.name}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-ink-muted">
                    {person.summary}
                  </p>
                </Link>
              ))}
            </div>
          </Surface>

          <Surface className="space-y-4">
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Activity
              </p>
              <h2 className="font-serif text-3xl tracking-tight text-ink">
                Searches and reading history
              </h2>
            </div>
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
            <div className="grid gap-3">
              {readingHistory.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-[12px] border border-line bg-background px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
                >
                  <p className="font-medium text-ink">{item.label}</p>
                  <p className="mt-1 text-sm text-ink-soft">{item.href}</p>
                </Link>
              ))}
            </div>
          </Surface>

          <Surface className="space-y-4">
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Preferences
              </p>
              <h2 className="font-serif text-3xl tracking-tight text-ink">
                Personal setup
              </h2>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[12px] border border-line bg-background px-4 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                  Calendar
                </p>
                <p className="mt-2 text-sm leading-7 text-ink-muted">
                  {preferences.calendarPreference === "new-calendar"
                    ? "New calendar"
                    : "Old calendar"}
                </p>
              </div>
              <PatronSaintPicker
                saints={allSaints}
                currentPatronId={preferences.patronSaintPersonId}
              />
              {patronSaint ? (
                <Link
                  href={`/library/people/${patronSaint.slug}`}
                  className="rounded-[12px] border border-line bg-background px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                    About {patronSaint.honorific ? `${patronSaint.honorific} ` : ""}{patronSaint.name.split(",")[0]}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-ink-muted">
                    {patronSaint.summary}
                  </p>
                </Link>
              ) : null}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
