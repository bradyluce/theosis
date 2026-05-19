// Orthodox Paschalion: pure functions, no I/O.
//
// Pascha is computed by the Julian rule for all canonical Orthodox jurisdictions
// (Finnish/Estonian Orthodox use Western Easter — out of scope).
//
// Algorithm: Gauss's Easter computation (1800), Julian variant. The Julian result
// is converted to Gregorian by adding 13 days, valid for 1900-2099.

const MS_PER_DAY = 86_400_000;
const JULIAN_TO_GREGORIAN_DAYS = 13;
const MIN_SUPPORTED_YEAR = 1900;
const MAX_SUPPORTED_YEAR = 2099;

function assertSupportedYear(year: number): void {
  if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) {
    throw new RangeError(
      `Paschalion year ${year} out of supported range ${MIN_SUPPORTED_YEAR}-${MAX_SUPPORTED_YEAR}; the +13-day Julian/Gregorian correction is only valid in this window.`,
    );
  }
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function startOfUtcDay(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function daysBetween(from: Date, to: Date): number {
  const a = startOfUtcDay(from).getTime();
  const b = startOfUtcDay(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

// Gauss algorithm for Julian Pascha — returns the Gregorian Date.
export function getPaschaDate(year: number): Date {
  assertSupportedYear(year);

  const g = year % 19;
  const i = (19 * g + 15) % 30;
  const j = (year + Math.floor(year / 4) + i) % 7;
  const l = i - j;

  const julianMonth = 3 + Math.floor((l + 40) / 44);
  const julianDay = l + 28 - 31 * Math.floor(julianMonth / 4);

  // julianMonth/julianDay are dates on the Julian calendar. Convert to Gregorian.
  const asGregorianMidnight = utcDate(year, julianMonth - 1, julianDay);
  return new Date(asGregorianMidnight.getTime() + JULIAN_TO_GREGORIAN_DAYS * MS_PER_DAY);
}

// Convert a Gregorian Date to its Julian-calendar month-day string ("MM-DD").
// Used as the Menaion lookup key — the Menaion is dated in Julian terms,
// even for jurisdictions that observe it on the corresponding Gregorian day.
export function julianMonthDay(date: Date): string {
  assertSupportedYear(date.getUTCFullYear());
  const julianMidnight = new Date(
    startOfUtcDay(date).getTime() - JULIAN_TO_GREGORIAN_DAYS * MS_PER_DAY,
  );
  const month = String(julianMidnight.getUTCMonth() + 1).padStart(2, "0");
  const day = String(julianMidnight.getUTCDate()).padStart(2, "0");
  return `${month}-${day}`;
}

// The Gregorian month-day ("MM-DD") of `date`. For a New Calendar jurisdiction
// this is the Menaion lookup key (the Menaion entry for "May 21" is celebrated
// on Gregorian May 21 by OCA/GOARCH/Antiochian).
export function gregorianMonthDay(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}-${day}`;
}

// Days from Pascha of the same Gregorian year. Negative before Pascha, positive after.
// Outside the paschal cycle (roughly -77 to +56 — Zacchaeus through All Saints),
// callers should treat the result as "no movable-cycle alignment".
export function paschalDayOffset(date: Date): number {
  const year = date.getUTCFullYear();
  return daysBetween(getPaschaDate(year), date);
}

// Resolve the paschal-cycle anchor for `date`: which year's Pascha it belongs to
// and the signed day offset within that cycle. The cycle's natural span is
// roughly Zacchaeus Sunday (pdist=-77) through All Saints Sunday (pdist=+56);
// dates outside that window receive their nearest Pascha's anchor anyway, and
// the composer decides whether the movable-cycle lookup applies.
export function resolvePaschalAnchor(date: Date): { paschaYear: number; pdist: number } {
  const year = date.getUTCFullYear();
  const thisYearPascha = getPaschaDate(year);
  const pdistThis = daysBetween(thisYearPascha, date);

  // If we're very early in the year, the previous year's Pascha may be closer.
  if (pdistThis < -77 && year > MIN_SUPPORTED_YEAR) {
    const prevPascha = getPaschaDate(year - 1);
    const pdistPrev = daysBetween(prevPascha, date);
    return { paschaYear: year - 1, pdist: pdistPrev };
  }

  return { paschaYear: year, pdist: pdistThis };
}
