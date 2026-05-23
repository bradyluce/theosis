import type { Person } from "@theosis/core";

// Heuristic for "this Person is a canonized saint" that's broader than
// Person.kind === "saint" alone. Many of the patristic corpus's saints
// were ingested with kind="father" (because the parser categorises by
// role, not canonisation status) — but they're still saints. The
// canonisation signal is more reliably carried by:
//   - an honorific marker (St., Saint, Holy, Blessed, Venerable)
//   - a feast day label (only canonised persons have one)
//   - kind="saint" (when the seed explicitly classified them this way)
//
// Used by:
//   - getLibraryPeopleFromAll (commentary-loader) — which Persons to
//     surface in the Library people grid
//   - LibraryExplorer's "Saints" tab — which Persons count as saints
//     for tab-level filtering (so Augustine, Chrysostom, Bede, etc.
//     surface here despite having kind="father")
const SAINT_HONORIFIC_PATTERN = /\b(st\.?|saint|holy|blessed|venerable)\b/i;

export function isCanonizedSaint(person: Person): boolean {
  if (person.kind === "saint") return true;
  if (person.feastDayLabel && person.feastDayLabel.trim().length > 0) return true;
  if (
    person.honorific &&
    SAINT_HONORIFIC_PATTERN.test(person.honorific.trim())
  ) {
    return true;
  }
  return false;
}
