import { gregorianMonthDay, resolvePaschalAnchor } from "@/lib/calendar/paschalion";
import type { CalendarSystem } from "@/lib/calendar/types";

type Options = { calendarSystem?: CalendarSystem };

// Resolve the day's principal fast label, or `undefined` for no fast.
//
// The rules are an opinionated simplification of the Orthodox typikon —
// they cover the major fasting seasons and the weekly Wed/Fri pattern with
// the well-known fast-free exceptions. Refinements (e.g. wine-and-oil vs.
// strict distinctions, Annunciation in Lent, Theophany eve) belong in a
// later slice that splits the single string label into a richer record.
export function composeDailyFast(date: Date, options: Options = {}): string | undefined {
  const calendarSystem = options.calendarSystem ?? "new";
  const monthDay = calendarSystem === "new" ? gregorianMonthDay(date) : julianKey(date);
  const [monthStr, dayStr] = monthDay.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  const weekday = date.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const { pdist } = resolvePaschalAnchor(date);

  // 1. Fast-free seasons. These override the weekly Wed/Fri rule.
  if (pdist >= 1 && pdist <= 6) return undefined; // Bright Week
  if (pdist >= 50 && pdist <= 56) return undefined; // Week of Pentecost through All Saints
  if (pdist >= -70 && pdist <= -64) return undefined; // Week of the Publican and Pharisee
  if ((month === 12 && day >= 25) || (month === 1 && day <= 4)) return undefined; // Sviatki

  // 2. Major fasting seasons, ordered from highest precedence outward from Pascha.
  if (pdist >= -6 && pdist <= -1) return "Holy Week";
  if (pdist >= -48 && pdist <= -7) return "Great Lent";
  if (pdist >= -55 && pdist <= -49) return "Cheesefare Week";
  // Apostles' Fast: Monday after All Saints (pdist 57) through June 28 (Greg).
  // If Pascha is so late that pdist 57 falls after June 28, no Apostles' Fast.
  if (pdist >= 57 && (month < 6 || (month === 6 && day <= 28))) {
    return "Apostles' Fast";
  }
  if (month === 8 && day >= 1 && day <= 14) return "Dormition Fast";
  if ((month === 11 && day >= 15) || (month === 12 && day <= 24)) return "Nativity Fast";

  // 3. Weekly Wednesday and Friday fast.
  if (weekday === 3 || weekday === 5) return "Wednesday and Friday Fast";

  return undefined;
}

function julianKey(date: Date): string {
  const MS_PER_DAY = 86_400_000;
  const julian = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      13 * MS_PER_DAY,
  );
  const month = String(julian.getUTCMonth() + 1).padStart(2, "0");
  const day = String(julian.getUTCDate()).padStart(2, "0");
  return `${month}-${day}`;
}
