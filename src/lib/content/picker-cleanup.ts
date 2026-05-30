// ---------------------------------------------------------------------------
// Library / patron-picker cleanup
//
// The menaion-derived calendar corpus (content/normalized/calendar/people.json)
// contributes thousands of Person records. Most are real saints, but a tail of
// them are NOT something a user would ever choose as a patron:
//   - event/feast records ("Glorification of St. Herman", "Repose of …"),
//   - parser artifacts whose honorific got split off ("and Unmercenaries …",
//     "the Blind Man healed by St. Panteleimon"),
//   - secondary "disciple of"/"household of" commemorations, and
//   - bare placeholder stubs that duplicate a richer curated record (e.g. the
//     stub "Paul, Apostle to the Nations" alongside the seeded apostle-paul
//     that has a real biography and icon).
//
// These helpers filter that clutter out of the library-people list (which backs
// both the Library grid and the mobile patron picker) WITHOUT touching the
// calendar data itself — daily commemorations still resolve every person by id
// through getPersonByIdFromAll.
//
// Safety principle: the cleanup must NEVER hide a real, venerable saint.
// Two guards enforce that:
//   1. A record that has a resolved icon is ALWAYS kept. A curated icon is a
//      strong signal the person is real and venerable (e.g. St. Helen, "Moses
//      the Black of Scetis", "Elizabeth, Mother of the Forerunner").
//   2. The relational rule is intentionally narrow — it omits mother/wife/etc.,
//      because real patrons carry those descriptors (St. Monica, "mother of
//      Augustine"; St. Emilia, "mother of Basil the Great"). Only the
//      essentially-always-secondary "disciple of"/"household of"/"healed by"
//      forms are removed.
// ---------------------------------------------------------------------------

// Placeholder summaries stamped on bare calendar stubs. A record carrying one
// of these has no curated biography — it is a candidate for de-duplication, but
// only when a richer same-named record exists (see isStubDuplicate).
const STUB_SUMMARY = /^Commemorated (in the Orthodox Synaxarion\.|on [A-Z][a-z]+ \d+\.?)$/;

// Feast/event records — not persons. Names that begin with one of these nouns
// followed by "of" describe a liturgical event, not someone to venerate.
const EVENT_NAME =
  /^(glorification|repose|translation|uncovering|finding|appearance|commemoration|dedication|consecration|opening|return|recovery|miracle|synaxis|veneration|procession|deposition|enshrinement|naming) of\b/i;

// Parser artifacts: a real name never begins with a lowercase connector or
// article. These are rows where the leading honorific ("Holy", "Sts.") was
// stripped mid-phrase, leaving a fragment ("and Unmercenaries …", "the Blind
// Man …"). Case-sensitive on purpose so a legitimately-capitalized title like
// "The Three Holy Hierarchs" is preserved.
const ARTIFACT_NAME = /^(and|the|with|of|who|those) /;

// Secondary commemorations defined only by discipleship/relation to a more
// famous saint ("Anastasius, Disciple of Maximus the Confessor"). Deliberately
// NARROW: omits mother/wife/sister/etc. so real patrons who carry such a
// descriptor are never hidden.
const RELATIONAL_NAME = /,\s*(disciple|disciples|household) of\b|\bhealed by\b/i;

export type ClutterReason = "event" | "artifact" | "relational";

// Returns the clutter category for a name, or null if it isn't clutter.
export function isPickerClutter(name: string): ClutterReason | null {
  if (EVENT_NAME.test(name)) return "event";
  if (ARTIFACT_NAME.test(name)) return "artifact";
  if (RELATIONAL_NAME.test(name)) return "relational";
  return null;
}

// Normalize a name to a comparison key for stub de-duplication. Strips a single
// leading honorific/qualifier token and all punctuation, then collapses
// whitespace. KEEPS place/epithet words ("of Rome", "of St. Petersburg") so
// distinct saints who share a first name do NOT collapse together.
export function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(holy|the|sts?\.?|saint|venerable|blessed|righteous|new)\s+/, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Minimal shape the cleanup needs from a record.
export type PickerCandidate = {
  name: string;
  summary?: string | null;
};

function isStubSummary(item: PickerCandidate): boolean {
  return STUB_SUMMARY.test((item.summary ?? "").trim());
}

// Build the set of normalized name keys that belong to a "rich" (non-stub)
// record. A stub whose key is in this set is a duplicate of a curated saint.
export function buildRichNameSet(items: PickerCandidate[]): Set<string> {
  const rich = new Set<string>();
  for (const item of items) {
    if (!isStubSummary(item)) rich.add(normalizeNameKey(item.name));
  }
  return rich;
}

// A record is a redundant stub iff it carries a placeholder summary AND a
// non-stub record with the same normalized name exists. Only ever drops stubs;
// never collapses two distinct saints (the guard requires a rich twin).
export function isStubDuplicate(
  item: PickerCandidate,
  richNames: Set<string>,
): boolean {
  if (!isStubSummary(item)) return false;
  return richNames.has(normalizeNameKey(item.name));
}

// Apply the full cleanup. `hasIcon` is consulted so that any record with a
// resolved icon is unconditionally kept (guard #1 above). Drops clutter
// (event / artifact / disciple) and icon-less stub duplicates.
export function filterPickerPeople<T extends PickerCandidate>(
  items: T[],
  hasIcon: (item: T) => boolean,
): T[] {
  return items.filter((item) => {
    // Content-less placeholder records — whose entire summary is
    // "Commemorated on <Month> <day>." or "Commemorated in the Orthodox
    // Synaxarion." — are dropped from the picker and Library grid even when
    // they carry an icon. Surfacing a pickable patron whose whole biography is
    // "Commemorated on January 3" reads as filler. (Previously any icon kept a
    // record unconditionally, leaking ~1,100 bio-less calendar/seed stubs.)
    // The records aren't deleted: daily commemorations still resolve every
    // person by id through getPersonByIdFromAll.
    if (isStubSummary(item)) return false;
    if (hasIcon(item)) return true; // keep any real (non-stub) record with an icon
    if (isPickerClutter(item.name)) return false;
    return true;
  });
}
