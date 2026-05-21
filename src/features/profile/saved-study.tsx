"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { getVerseById } from "@/lib/content";
import { useStudyState } from "@/lib/user/use-study-state";
import { ProfileSubPageHeader } from "@/features/profile/sub-page-header";

export function SavedStudy() {
  const savedVerses = useStudyState((state) => state.savedVerses);
  const notes = useStudyState((state) => state.notes);
  const highlights = useStudyState((state) => state.highlights);

  const resolvedSavedVerses = useMemo(
    () =>
      savedVerses
        .map((item) => getVerseById(item.verseId))
        .filter((value): value is NonNullable<ReturnType<typeof getVerseById>> => Boolean(value)),
    [savedVerses],
  );

  return (
    <div className="space-y-6">
      <ProfileSubPageHeader eyebrow="Profile" title="Saved study" />

      <Surface className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Saved verses
          </p>
          <h2 className="font-serif text-2xl tracking-tight text-ink">
            {savedVerses.length} {savedVerses.length === 1 ? "verse" : "verses"}
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
              <p className="mt-3 font-serif text-xl leading-8 tracking-tight text-ink">
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
      </Surface>

      <Surface className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Notes
          </p>
          <h2 className="font-serif text-2xl tracking-tight text-ink">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </h2>
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
          {notes.length === 0 ? (
            <p className="text-sm leading-7 text-ink-muted">
              No notes yet. Open a verse in the reader to add one.
            </p>
          ) : null}
        </div>
      </Surface>

      <Surface className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Highlights
          </p>
          <h2 className="font-serif text-2xl tracking-tight text-ink">
            {highlights.length} {highlights.length === 1 ? "highlight" : "highlights"}
          </h2>
        </div>
        {highlights.length === 0 ? (
          <p className="text-sm leading-7 text-ink-muted">
            Highlight verses from the reader to populate this section.
          </p>
        ) : (
          <ul className="space-y-2">
            {highlights.map((highlight) => (
              <li
                key={highlight.id}
                className="rounded-[12px] border border-line bg-background px-4 py-3"
              >
                <Pill variant="subtle">{highlight.targetType}</Pill>
                <p className="mt-2 text-sm leading-7 text-ink-muted">
                  {highlight.excerpt}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
