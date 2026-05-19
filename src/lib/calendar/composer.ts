import type { DailyCommemoration } from "@/domain/content/types";
import {
  getPaschaDate,
  gregorianMonthDay,
  resolvePaschalAnchor,
} from "@/lib/calendar/paschalion";
import type {
  CalendarData,
  CalendarSystem,
  Jurisdiction,
  MenaionEntry,
  MovableCycleEntry,
} from "@/lib/calendar/types";

const PASCHAL_CYCLE_MIN_PDIST = -77; // Sunday of Zacchaeus
const PASCHAL_CYCLE_MAX_PDIST = 56; // Sunday of All Saints

export type ComposeOptions = {
  jurisdiction?: Jurisdiction;
  calendarSystem?: CalendarSystem;
};

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

  return {
    id: `daily-${isoDate}`,
    isoDate,
    title,
    summary,
    saintIds: [], // Saint Person records are populated in Phase E (editorial).
    feastLabel,
    fastLabel: undefined, // Fasting rules are a Phase B/F slice.
    readingIds: [], // Lectionary mapping is the next slice (Phase A.2).
    hymnIds: [], // Hymn corpus arrives in Phase D.
    lifeExcerpt,
    sourceId: "source-calendar-normalized",
  };
}

function lookupMenaion(
  date: Date,
  calendarSystem: CalendarSystem,
  data: CalendarData,
): MenaionEntry | undefined {
  // For New Calendar (OCA/GOARCH/Antiochian), today's civil Gregorian MM-DD is
  // the Menaion lookup key directly — they kept the Menaion date numbers when
  // they adopted the Gregorian for daily reckoning.
  //
  // Old Calendar mode (deferred) would subtract 13 days first via
  // `julianMonthDay(date)`. The data shape is identical either way.
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
    const alsoLine = menaion ? ` Today the Menaion also commemorates ${menaion.title}.` : "";
    return {
      title: movable.title,
      summary: movable.summary,
      lifeExcerpt: movable.summary + alsoLine,
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

function formatIso(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Inline the Julian-key computation to avoid a circular import path back through
// the public paschalion surface; this is the same arithmetic as
// `paschalion.julianMonthDay()`.
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
