import type {
  DailyFastDetail,
  FastDetail,
  FastFreeDetail,
  FastFreeKind,
  FastKind,
  FastSeverity,
} from "@theosis/core";
import { gregorianMonthDay, resolvePaschalAnchor } from "@/lib/calendar/paschalion";
import type { CalendarSystem } from "@/lib/calendar/types";

// Re-export so existing call sites that imported these from
// "@/lib/calendar" keep working.
export type {
  DailyFastDetail,
  FastDetail,
  FastFreeDetail,
  FastFreeKind,
  FastKind,
  FastSeverity,
};

type Options = { calendarSystem?: CalendarSystem };

// Resolve the day's principal fast label, or `undefined` for no fast.
//
// The rules are an opinionated simplification of the Orthodox typikon —
// they cover the major fasting seasons and the weekly Wed/Fri pattern with
// the well-known fast-free exceptions. Refinements (e.g. wine-and-oil vs.
// strict distinctions, Annunciation in Lent, Theophany eve) belong in a
// later slice that splits the single string label into a richer record.
export function composeDailyFast(date: Date, options: Options = {}): string | undefined {
  const detail = composeDailyFastDetail(date, options);
  return detail?.kind === "fast" ? detail.name : undefined;
}

// Richer companion to composeDailyFast. Returns either a fast (with
// dayOfFast/totalDays/guidance) or a fast-free season (Bright Week,
// Christmastide, etc.) so the UI can celebrate those too. Returns
// undefined for plain non-fasting days.
export function composeDailyFastDetail(
  date: Date,
  options: Options = {},
): DailyFastDetail | undefined {
  const calendarSystem = options.calendarSystem ?? "new";
  const monthDay = calendarSystem === "new" ? gregorianMonthDay(date) : julianKey(date);
  const [monthStr, dayStr] = monthDay.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  const weekday = date.getUTCDay();
  const { pdist } = resolvePaschalAnchor(date);

  // 1. Fast-free seasons surface explicitly so the UI can mark them.
  if (pdist >= 1 && pdist <= 6) {
    return {
      kind: "fast-free",
      name: "Bright Week",
      reason: "Fast-free in the joy of the Resurrection.",
      fastFreeKind: "bright-week",
    };
  }
  if (pdist >= 50 && pdist <= 56) {
    return {
      kind: "fast-free",
      name: "Week after Pentecost",
      reason: "Fast-free through Sunday of All Saints.",
      fastFreeKind: "pentecost-week",
    };
  }
  if (pdist >= -70 && pdist <= -64) {
    return {
      kind: "fast-free",
      name: "Week of the Publican and the Pharisee",
      reason: "Fast-free in answer to the Pharisee's boast.",
      fastFreeKind: "publican-pharisee",
    };
  }
  if ((month === 12 && day >= 25) || (month === 1 && day <= 4)) {
    return {
      kind: "fast-free",
      name: "Sviatki",
      reason: "Fast-free between the Nativity and the Theophany.",
      fastFreeKind: "sviatki",
    };
  }

  // 2. Major fasting seasons, ordered from highest precedence outward from Pascha.
  if (pdist >= -6 && pdist <= -1) {
    return {
      kind: "fast",
      name: "Holy Week",
      fastKind: "holy-week",
      dayOfFast: pdist + 7,
      totalDays: 6,
      guidance: holyWeekGuidance,
    };
  }
  if (pdist >= -48 && pdist <= -7) {
    return {
      kind: "fast",
      name: "Great Lent",
      fastKind: "great-lent",
      dayOfFast: pdist + 49,
      totalDays: 42,
      guidance: greatLentGuidance,
    };
  }
  if (pdist >= -55 && pdist <= -49) {
    return {
      kind: "fast",
      name: "Cheesefare Week",
      fastKind: "cheesefare",
      dayOfFast: pdist + 56,
      totalDays: 7,
      guidance: cheesefareGuidance,
    };
  }
  if (pdist >= 57 && (month < 6 || (month === 6 && day <= 28))) {
    const start = paschalDateOfPdist(date, 57);
    const dayOfFast = daysBetween(start, date) + 1;
    const totalDays = daysBetween(start, new Date(Date.UTC(date.getUTCFullYear(), 5, 28))) + 1;
    return {
      kind: "fast",
      name: "Apostles' Fast",
      fastKind: "apostles",
      dayOfFast,
      totalDays,
      guidance: apostlesGuidance,
    };
  }
  if (month === 8 && day >= 1 && day <= 14) {
    return {
      kind: "fast",
      name: "Dormition Fast",
      fastKind: "dormition",
      dayOfFast: day,
      totalDays: 14,
      guidance: dormitionGuidance,
    };
  }
  if ((month === 11 && day >= 15) || (month === 12 && day <= 24)) {
    const dayOfFast = month === 11 ? day - 14 : 16 + day;
    return {
      kind: "fast",
      name: "Nativity Fast",
      fastKind: "nativity",
      dayOfFast,
      totalDays: 40,
      guidance: nativityGuidance,
    };
  }

  // 3. Weekly Wednesday and Friday fast.
  if (weekday === 3 || weekday === 5) {
    return {
      kind: "fast",
      name: weekday === 3 ? "Wednesday Fast" : "Friday Fast",
      fastKind: "weekly",
      guidance: weeklyGuidance,
    };
  }

  return undefined;
}

// --- Guidance text ---------------------------------------------------------
// Short, plain prose. Avoid prescription — we point at the typikon and the
// reader's priest. "Strict" approximates the Typikon, "standard" approximates
// what most parishes teach catechumens, "relaxed" is the pastoral minimum.

const greatLentGuidance: Record<FastSeverity, string> = {
  strict:
    "Abstain from meat, dairy, eggs, and fish. Wine and oil are permitted on Saturdays and Sundays; fish only on Annunciation and Palm Sunday.",
  standard:
    "Abstain from meat and dairy throughout. Fish, wine, and oil are permitted on weekends and feast days.",
  relaxed:
    "Abstain from meat and dairy. The fast is medicine — keep what you can and consult your priest for your personal rule.",
};

const holyWeekGuidance: Record<FastSeverity, string> = {
  strict:
    "The strictest week of the year. No meat, dairy, fish, wine, or oil. Many abstain from food entirely on Holy Friday until the burial Vespers.",
  standard:
    "Strict fast throughout. No meat, dairy, or fish. Many fast more deeply on Holy Friday in keeping with the day.",
  relaxed:
    "Strict fast — abstain from meat and dairy. Hold Holy Friday more closely than ordinary days.",
};

const cheesefareGuidance: Record<FastSeverity, string> = {
  strict:
    "Meatfare has ended; dairy is still permitted through Sunday. A gentle ramp into the Great Fast.",
  standard:
    "Meatfare has ended; dairy is still permitted through Sunday. A gentle ramp into the Great Fast.",
  relaxed:
    "Meatfare has ended; dairy is still permitted through Sunday. A gentle ramp into the Great Fast.",
};

const apostlesGuidance: Record<FastSeverity, string> = {
  strict:
    "Abstain from meat, dairy, and eggs. Fish, wine, and oil follow weekday rules in the Typikon.",
  standard:
    "Abstain from meat and dairy. Fish, wine, and oil permitted on most days; Wednesdays and Fridays kept more strictly.",
  relaxed:
    "Abstain from meat. The Apostles' Fast prepares us for the feast of Peter and Paul.",
};

const dormitionGuidance: Record<FastSeverity, string> = {
  strict:
    "Strict fast, like Great Lent. No meat, dairy, eggs, or fish — except on Transfiguration (Aug 6).",
  standard:
    "Abstain from meat and dairy. Fish, wine, and oil permitted on the Transfiguration (Aug 6) and weekends.",
  relaxed:
    "Abstain from meat. Two weeks of preparation for the falling-asleep of the Mother of God.",
};

const nativityGuidance: Record<FastSeverity, string> = {
  strict:
    "Abstain from meat, dairy, and eggs. Fish permitted most days outside the final week; the last week mirrors Great Lent.",
  standard:
    "Abstain from meat and dairy. Fish, wine, and oil permitted most days; the last week (Dec 20–24) is kept more strictly.",
  relaxed:
    "Abstain from meat. Forty days of quiet preparation for the Nativity of Christ.",
};

const weeklyGuidance: Record<FastSeverity, string> = {
  strict:
    "Strict fast — abstain from meat, dairy, fish, wine, and oil.",
  standard:
    "Abstain from meat and dairy. Fish, wine, and oil permitted in most parish practice.",
  relaxed:
    "Abstain from meat. Wednesday recalls the betrayal; Friday, the Crucifixion.",
};

// --- helpers ---------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / MS_PER_DAY);
}

// Return the Gregorian Date that corresponds to `pdist` days after the Pascha
// belonging to `date`'s paschal-cycle anchor. Used to anchor "day 1 of the
// Apostles' Fast" without re-running the Pascha computation in the UI.
function paschalDateOfPdist(date: Date, targetPdist: number): Date {
  const { pdist } = resolvePaschalAnchor(date);
  const dayOffset = targetPdist - pdist;
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(base + dayOffset * MS_PER_DAY);
}

function julianKey(date: Date): string {
  const julian = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      13 * MS_PER_DAY,
  );
  const month = String(julian.getUTCMonth() + 1).padStart(2, "0");
  const day = String(julian.getUTCDate()).padStart(2, "0");
  return `${month}-${day}`;
}
