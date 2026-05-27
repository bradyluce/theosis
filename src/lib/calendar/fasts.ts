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
    "No meat, poultry, or meat products. No dairy or eggs. No fish. Wine and olive oil only on Saturdays and Sundays. Fish is permitted on Annunciation (Mar 25) and Palm Sunday alone. The deepest fast in the Church year — forty days of preparation for Pascha.",
  standard:
    "No meat, poultry, or dairy throughout. No fish on weekdays. Fish, wine, and olive oil permitted on Saturdays, Sundays, Annunciation, and Palm Sunday. The discipline most committed Orthodox households keep for Lent.",
  relaxed:
    "No meat or poultry throughout. Many also abstain from dairy and eggs. Fish, wine, and oil are permitted. A simpler keeping of the Great Fast — consult your priest for your personal rule.",
};

const holyWeekGuidance: Record<FastSeverity, string> = {
  strict:
    "The strictest week of the year. No meat, poultry, dairy, eggs, or fish. No wine or oil. Many abstain from food entirely on Holy Friday until the burial Vespers. Eat little; pray much; keep the services.",
  standard:
    "No meat, poultry, dairy, eggs, or fish. No wine or oil on weekdays. Many keep Holy Friday more deeply — fasting until the bringing-out of the shroud in the afternoon. Walk with Christ through every service if you can.",
  relaxed:
    "No meat, poultry, or dairy. Many also abstain from fish. Hold Holy Friday more closely than ordinary days — at minimum, no meat or dairy from waking until the evening service.",
};

const cheesefareGuidance: Record<FastSeverity, string> = {
  strict:
    "Meatfare has ended — no meat or poultry. Dairy and eggs are still permitted through Sunday. Fish too. A gentle ramp into the Great Fast: each day this week tasted of the discipline ahead while keeping the comforts that fall away on Monday.",
  standard:
    "No meat or poultry. Dairy, eggs, and fish are still permitted through Sunday. The Church eases us into the fast — taste the milk and cheese while you can, and use this week to set your house in order.",
  relaxed:
    "No meat or poultry — but dairy, eggs, and fish are all still permitted through Sunday. Sometimes called Maslenitsa in the Slavic tradition: enjoy the dairy in moderation, and prepare your heart for Lent.",
};

const apostlesGuidance: Record<FastSeverity, string> = {
  strict:
    "No meat, poultry, or meat products. No dairy or eggs. Fish permitted on most days (not Wed/Fri). Wine and oil follow Typikon rules — generally permitted except on strict-fast days. A summer fast preparing us for the feast of Saints Peter and Paul (June 29).",
  standard:
    "No meat, poultry, or dairy. Fish, wine, and oil permitted on most days. Wednesday and Friday are kept more strictly — no fish, oil, or wine. The Apostles' Fast prepares us for the chief feast of the Twelve.",
  relaxed:
    "No meat or poultry. Many also abstain from dairy. Fish, wine, and oil are permitted. The Apostles' Fast lengthens with a late Pascha and disappears when Pascha is very late — it's the most flexible of the four great fasts.",
};

const dormitionGuidance: Record<FastSeverity, string> = {
  strict:
    "No meat, poultry, dairy, eggs, or fish — strict as Great Lent. Fish, wine, and oil are permitted only on the Transfiguration (Aug 6). Two weeks of preparation for the Theotokos' falling-asleep (Aug 15).",
  standard:
    "No meat, poultry, dairy, or eggs. No fish on weekdays. Fish, wine, and oil permitted on Saturdays, Sundays, and the Transfiguration (Aug 6). The shortest of the four great fasts, but kept with full Lenten weight.",
  relaxed:
    "No meat or poultry. Many also abstain from dairy. Fish, wine, and oil are permitted. Fourteen days of quiet preparation for the Dormition of the Mother of God.",
};

const nativityGuidance: Record<FastSeverity, string> = {
  strict:
    "No meat, poultry, dairy, or eggs. No fish on Wed/Fri. Wine and oil permitted on most days. The last week (Dec 20–24) is kept as strictly as Great Lent — no fish, no oil, no wine on weekdays. Forty days for the coming of Christ in the flesh.",
  standard:
    "No meat, poultry, or dairy. Fish, wine, and oil permitted on most days; Wed/Fri kept more strictly with no fish. The last week before Christmas (Dec 20–24) deepens — keep it more closely if you can.",
  relaxed:
    "No meat or poultry. Many also abstain from dairy. Fish, wine, and oil are permitted throughout. Forty days of quiet preparation for the Nativity — the Christian Advent.",
};

// Weekly Wed/Fri guidance. Includes the same kind of specificity as the
// seasonal fasts: what's off the table (and what isn't), with the day's
// meaning kept short at the end. Wednesday recalls Christ's betrayal;
// Friday, His Crucifixion.
const weeklyGuidance: Record<FastSeverity, string> = {
  strict:
    "No meat, poultry, or meat products. No dairy or eggs. No fish. No wine or olive oil. The Typikon standard for ordinary Wednesdays and Fridays — kept by monastics and many laity. The day is held as a small Holy Friday.",
  standard:
    "No meat, poultry, or meat products. No dairy or eggs. No fish. Wine and olive oil are permitted in most parishes. The discipline kept by most committed Orthodox households on Wednesday (the betrayal) and Friday (the Crucifixion).",
  relaxed:
    "No meat or poultry. Many also abstain from dairy and eggs. Wine, oil, and fish are permitted. A simpler keeping of the weekly fast — consult your priest for the right level for you. The day still recalls the betrayal (Wednesday) and the Crucifixion (Friday).",
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
