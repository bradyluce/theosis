import { useQuery } from "@tanstack/react-query";
import type { LibraryPerson } from "@theosis/core";

import { getApi } from "@/lib/api";

// Shape of the icon attached to library people by /api/library/people.
// Mirrors the subset we render; full IconRef has more fields but they
// don't matter for avatars.
export type PatronIcon = {
  src: string;
  alt: string;
};

// Resolves the user's patron saint slug to their full library Person record
// (or null). Backed by the same React Query cache used by the Library tab,
// saint-picker, onboarding, etc. — so by the time the user lands on Daily,
// the list is usually already warm and there's no network wait. Returns null
// when the user hasn't picked a patron yet or the list hasn't loaded. This is
// the shared resolver; usePatronIcon and the name-day check both build on it.
export function usePatronPerson(
  patronSaintSlug: string | undefined,
): LibraryPerson | null {
  const api = getApi();
  const { data } = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
    // Don't block the avatar render — show the letter fallback while
    // the list loads, swap to the icon when it arrives.
    enabled: Boolean(patronSaintSlug),
  });

  if (!patronSaintSlug || !data) return null;
  return data.people.find((p) => p.slug === patronSaintSlug) ?? null;
}

// Resolves the user's patron saint slug to their icon (or null). Returns null
// when the user hasn't picked a patron yet or that saint has no curated icon.
// Callers fall back to a letter avatar in that case.
export function usePatronIcon(
  patronSaintSlug: string | undefined,
): PatronIcon | null {
  const person = usePatronPerson(patronSaintSlug);
  if (!person?.icon) return null;
  return { src: person.icon.src, alt: person.icon.alt };
}
