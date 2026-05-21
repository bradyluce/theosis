"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { getPersonById } from "@/lib/content";
import { useStudyState } from "@/lib/user/use-study-state";
import { ProfileSubPageHeader } from "@/features/profile/sub-page-header";

export function FavoritesList() {
  const favoritePeople = useStudyState((state) => state.favoritePeople);

  const resolvedFavorites = useMemo(
    () =>
      favoritePeople
        .map((item) => getPersonById(item.personId))
        .filter((value): value is NonNullable<ReturnType<typeof getPersonById>> => Boolean(value)),
    [favoritePeople],
  );

  return (
    <div className="space-y-6">
      <ProfileSubPageHeader eyebrow="Profile" title="Favorites" />

      <Surface className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            People you return to
          </p>
          <h2 className="font-serif text-2xl tracking-tight text-ink">
            {resolvedFavorites.length}{" "}
            {resolvedFavorites.length === 1 ? "favorite" : "favorites"}
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
              <h3 className="mt-3 font-serif text-xl tracking-tight text-ink">
                {person.name}
              </h3>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                {person.summary}
              </p>
            </Link>
          ))}
          {resolvedFavorites.length === 0 ? (
            <p className="text-sm leading-7 text-ink-muted">
              No favorites yet. Open a Father, saint, or theologian in the library
              and add them.
            </p>
          ) : null}
        </div>
      </Surface>
    </div>
  );
}
