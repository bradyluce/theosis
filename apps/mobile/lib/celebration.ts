import { useMemo } from "react";
import type { DailyResponse, LibraryPerson } from "@theosis/core";

// Name-day + birthday detection for the Daily celebration banner.
//
// Name day = the displayed date is a day the user's patron saint is
// commemorated. Two signals are combined for coverage:
//   A. The patron appears in the composed daily commemoration the backend
//      already returns for this date. This handles movable feasts, co-saints
//      promoted into additionalCommemorations, and the user's calendar
//      system automatically — but only fires for saints curated into the
//      Menaion.
//   B. The patron's fixed feast-day label ("December 6", "May 8 and
//      September 26", …) matches the displayed month/day. This covers the
//      many patron saints not yet in the curated Menaion.
//
// Birthday = the stored birthday's month/day matches the displayed date.

export type MonthDay = { month: number; day: number };

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

// Pull every "<Month> <day>" pair out of a feast-day label. Movable feasts
// ("Second Sunday of Great Lent") and empty labels yield []. Tolerates the
// "and" / comma joiners used for saints with multiple commemorations, and
// naturally handles leap-day feasts ("February 29").
export function parseFeastDayLabel(
  label: string | null | undefined,
): MonthDay[] {
  if (!label) return [];
  const out: MonthDay[] = [];
  const re = /([A-Za-z]+)\s+(\d{1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(label)) !== null) {
    const month = MONTHS[m[1].toLowerCase()];
    const day = Number(m[2]);
    if (month && day >= 1 && day <= 31) out.push({ month, day });
  }
  return out;
}

// "YYYY-MM-DD" → { month, day }. Returns null for empty / malformed input.
export function monthDayFromIso(
  iso: string | null | undefined,
): MonthDay | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { month: Number(m[2]), day: Number(m[3]) };
}

function sameMonthDay(a: MonthDay | null, b: MonthDay | null): boolean {
  return !!a && !!b && a.month === b.month && a.day === b.day;
}

// Display name for the banner, mirroring how the patron picker formats it:
// honorific + the first comma-delimited segment of the name.
function patronDisplayName(p: LibraryPerson): string {
  const base = p.name.split(",")[0];
  return p.honorific ? `${p.honorific} ${base}` : base;
}

export type Celebration = {
  isNameDay: boolean;
  isBirthday: boolean;
  patronName: string | null;
};

export function useCelebration({
  dateIso,
  patron,
  daily,
  birthday,
}: {
  // The day currently shown on Daily, as "YYYY-MM-DD".
  dateIso: string | null | undefined;
  patron: LibraryPerson | null;
  daily: DailyResponse | undefined;
  // Stored birthday, "YYYY-MM-DD" (or "" / undefined when unset).
  birthday: string | null | undefined;
}): Celebration {
  return useMemo(() => {
    const today = monthDayFromIso(dateIso);

    // --- Name day ---
    let isNameDay = false;
    if (patron) {
      // Signal A — patron is in the composed commemoration for this date.
      const ids = new Set<string>();
      if (daily) {
        for (const id of daily.daily.saintIds ?? []) ids.add(id);
        for (const c of daily.daily.additionalCommemorations ?? []) {
          if (c.saintId) ids.add(c.saintId);
        }
        for (const s of daily.saints ?? []) ids.add(s.id);
      }
      const signalA = ids.has(patron.id) || ids.has(patron.slug);
      // Signal B — patron's fixed feast label matches the displayed day.
      const signalB = parseFeastDayLabel(patron.feastDayLabel).some((md) =>
        sameMonthDay(md, today),
      );
      isNameDay = signalA || signalB;
    }

    // --- Birthday ---
    const isBirthday = sameMonthDay(monthDayFromIso(birthday), today);

    return {
      isNameDay,
      isBirthday,
      patronName: patron ? patronDisplayName(patron) : null,
    };
  }, [dateIso, patron, daily, birthday]);
}
