import type { HymnText } from "@/domain/content/types";
import { gregorianMonthDay, resolvePaschalAnchor } from "@/lib/calendar/paschalion";
import type { CalendarData, CalendarSystem, HymnSlot } from "@/lib/calendar/types";

type Options = { calendarSystem?: CalendarSystem };

// Compose the day's hymns (troparia + kontakia). Movable-cycle hymns layer
// before fixed-cycle hymns. Pdist lookup is unbounded so that post-Pentecost
// cycle hymns (when added) can resolve outside the Triodion/Pentecostarion
// span; absence is the only signal of "no hymn appointed."
export function composeDailyHymns(
  date: Date,
  data: CalendarData,
  options: Options = {},
): HymnText[] {
  const calendarSystem = options.calendarSystem ?? "new";
  const isoDate = formatIso(date);

  const slots: HymnSlot[] = [];

  const { pdist } = resolvePaschalAnchor(date);
  const movable = data.hymns.movable[String(pdist)];
  if (movable) slots.push(...movable);

  const menaionKey = calendarSystem === "new" ? gregorianMonthDay(date) : julianKey(date);
  const fixed = data.hymns.fixed[menaionKey];
  // Same rule as readings: during Holy Week + Bright Week + Pentecostarion
  // (pdist -8 to 49), movable hymns supersede the saint's troparion —
  // unless the saint's feast is polyeleos/vigil/great rank.
  const inPaschalCycle = pdist >= -8 && pdist <= 49;
  const fixedFeastRank = data.menaion[menaionKey]?.feastRank;
  const isMajorFixedFeast =
    fixedFeastRank === "great" ||
    fixedFeastRank === "vigil" ||
    fixedFeastRank === "polyeleos";
  if (fixed && !(inPaschalCycle && movable && !isMajorFixedFeast)) {
    slots.push(...fixed);
  }

  return slots.map((slot, index) => slotToHymnText(slot, isoDate, index));
}

function slotToHymnText(slot: HymnSlot, isoDate: string, index: number): HymnText {
  return {
    id: `hymn-${isoDate}-${slot.type}-${index}`,
    type: slot.type,
    title: slot.title,
    tone: slot.tone,
    text: slot.text,
    sourceId: "source-calendar-normalized",
  };
}

function formatIso(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
