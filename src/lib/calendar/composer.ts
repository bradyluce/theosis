import type { DailyCommemoration, DailyCommemorationItem } from "@theosis/core";
import { composeDailyFast } from "@/lib/calendar/fasts";
import {
  getPaschaDate,
  gregorianMonthDay,
  resolvePaschalAnchor,
} from "@/lib/calendar/paschalion";
import type {
  CalendarData,
  CalendarSystem,
  MenaionEntry,
  MovableCycleEntry,
} from "@/lib/calendar/types";

const PASCHAL_CYCLE_MIN_PDIST = -77; // Sunday of Zacchaeus
const PASCHAL_CYCLE_MAX_PDIST = 56; // Sunday of All Saints

export type ComposeOptions = {
  calendarSystem?: CalendarSystem;
  // Display label for the user's jurisdiction (e.g. "ROCOR"), folded into the
  // composed `calendarLabel`. The Menaion is pan-Orthodox, so jurisdiction
  // does not by itself change which saints are commemorated — `calendarSystem`
  // is what shifts the fixed-feast dates (New = civil Gregorian; Old = Julian,
  // 13 days later on the civil calendar). jurisdictionLabel only annotates the
  // calendar the day was reckoned on so the UI can name it honestly.
  jurisdictionLabel?: string;
};

// Build the human-readable calendar label surfaced on the Daily screen.
function buildCalendarLabel(
  calendarSystem: CalendarSystem,
  jurisdictionLabel?: string,
): string {
  const system =
    calendarSystem === "old"
      ? "Old Calendar (Julian)"
      : "New Calendar (Revised Julian)";
  return jurisdictionLabel ? `${system} · ${jurisdictionLabel}` : system;
}

// Compose the day's commemoration from the normalized calendar data.
// Defaults: New Calendar + OCA jurisdiction (the US English mainstream).
//
// Composition rule (first-slice — simple priority):
//   1. If a movable entry exists AND today is within the paschal cycle:
//        movable wins as the primary title/summary.
//        Menaion entry (if any) is folded into the summary as "also commemorated".
//   2. Otherwise: Menaion entry is the primary.
//   3. If neither exists: produce a quiet, dateless fallback rather than crashing.
//
// More nuanced rules (Great Feasts of Menaion taking precedence over ordinary
// movable Sundays, Kyriopascha collisions, etc.) are deferred to a later slice.
export function composeDailyCommemoration(
  date: Date,
  data: CalendarData,
  options: ComposeOptions = {},
): DailyCommemoration {
  const calendarSystem: CalendarSystem = options.calendarSystem ?? "new";
  const isoDate = formatIso(date);

  const menaionEntry = lookupMenaion(date, calendarSystem, data);
  const movableEntry = lookupMovable(date, data);

  const { title, summary, lifeExcerpt, feastLabel } = pickPrimary(
    movableEntry,
    menaionEntry,
  );

  // Union saint-Person ids from both layers (de-duped, preserving order).
  const saintIds = uniquePreservingOrder([
    ...(movableEntry?.saintIds ?? []),
    ...(menaionEntry?.saintIds ?? []),
  ]);

  // Co-commemorations:
  //   - If movable wins primary AND there's a Menaion entry, the Menaion's
  //     title becomes a co-commemoration (the day's saint still matters
  //     alongside the great feast).
  //   - Plus everything in menaion.also, de-duped against the primary.
  const additionalCommemorations = collectAdditionalCommemorations(
    menaionEntry,
    /* primaryName */ title,
    /* movableIsPrimary */ Boolean(movableEntry),
  );

  return {
    id: `daily-${isoDate}`,
    isoDate,
    title,
    summary,
    saintIds,
    additionalCommemorations,
    feastLabel,
    fastLabel: composeDailyFast(date, { calendarSystem }),
    readingIds: [], // Lectionary is composed separately via composeDailyReadings.
    hymnIds: [], // Hymns are composed separately via composeDailyHymns.
    lifeExcerpt,
    sourceId: "source-calendar-normalized",
    calendarLabel: buildCalendarLabel(calendarSystem, options.jurisdictionLabel),
  };
}

function lookupMenaion(
  date: Date,
  calendarSystem: CalendarSystem,
  data: CalendarData,
): MenaionEntry | undefined {
  // New Calendar (OCA/GOARCH/Antiochian): today's civil Gregorian MM-DD is the
  // Menaion lookup key directly — these jurisdictions kept the Menaion date
  // numbers when they adopted the Gregorian for daily reckoning.
  //
  // Old Calendar (ROCOR/Serbian/Georgian/Moscow): the fixed feast falls 13 days
  // later on the civil calendar, so we look up the Menaion key for `date − 13
  // days` (computeJulianKey). The Menaion data is identical either way — only
  // the lookup key shifts. The movable (Paschal) cycle is unaffected because
  // the app already reckons Pascha on the Julian computus for every system.
  const key =
    calendarSystem === "new"
      ? gregorianMonthDay(date)
      : computeJulianKey(date);
  return data.menaion[key];
}

function lookupMovable(date: Date, data: CalendarData): MovableCycleEntry | undefined {
  const { pdist } = resolvePaschalAnchor(date);
  if (pdist < PASCHAL_CYCLE_MIN_PDIST || pdist > PASCHAL_CYCLE_MAX_PDIST) {
    return undefined;
  }
  return data.movableCycle[String(pdist)];
}

function pickPrimary(
  movable: MovableCycleEntry | undefined,
  menaion: MenaionEntry | undefined,
): {
  title: string;
  summary: string;
  lifeExcerpt: string;
  feastLabel: string | undefined;
} {
  if (movable) {
    return {
      title: movable.title,
      summary: movable.summary,
      lifeExcerpt: movable.summary,
      feastLabel: movable.feastRank === "great" ? movable.title : undefined,
    };
  }

  if (menaion) {
    return {
      title: menaion.title,
      summary: menaion.summary,
      lifeExcerpt: menaion.summary,
      feastLabel: menaion.feastRank === "great" ? menaion.title : undefined,
    };
  }

  return {
    title: "A quiet day in the Church year",
    summary: "No commemoration entry is yet available for this date.",
    lifeExcerpt: "Calendar coverage is being filled in incrementally; full-year content arrives in a later slice.",
    feastLabel: undefined,
  };
}

function uniquePreservingOrder<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function collectAdditionalCommemorations(
  menaionEntry: MenaionEntry | undefined,
  primaryName: string,
  movableIsPrimary: boolean,
): DailyCommemorationItem[] {
  if (!menaionEntry) return [];

  const seen = new Set<string>([primaryName]);
  const out: DailyCommemorationItem[] = [];

  // When a movable feast outranks the Menaion entry, promote the Menaion's
  // own title into the additional list so the day's saint isn't lost.
  if (movableIsPrimary && !seen.has(menaionEntry.title)) {
    seen.add(menaionEntry.title);
    const saintId = menaionEntry.saintIds?.[0];
    out.push({ name: menaionEntry.title, summary: menaionEntry.summary, saintId });
  }

  for (const item of menaionEntry.also ?? []) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    out.push({ name: item.name, summary: item.summary, saintId: item.saintId });
  }

  return out;
}

function formatIso(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Inline the Julian-key computation to avoid a circular import path back through
// the public paschalion surface; this is the same arithmetic as
// `paschalion.julianMonthDay()`. The Julian calendar runs exactly 13 days behind
// the Gregorian across the app's entire supported range (the daily route and the
// Paschalion both clamp to 1900–2099, well inside the 1 Mar 1900 – 28 Feb 2100
// window where the offset is 13 days), so the constant is exact for every date
// this app composes.
function computeJulianKey(date: Date): string {
  const MS_PER_DAY = 86_400_000;
  const julian = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      13 * MS_PER_DAY,
  );
  const month = String(julian.getUTCMonth() + 1).padStart(2, "0");
  const day = String(julian.getUTCDate()).padStart(2, "0");
  return `${month}-${day}`;
}

// Re-export the year's Pascha for callers that want to display it directly.
export { getPaschaDate };
