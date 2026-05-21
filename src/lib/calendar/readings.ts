import type { ReadingAssignment, ScriptureReference } from "@theosis/core";
import { createReference } from "@/lib/content/reference";
import { gregorianMonthDay, resolvePaschalAnchor } from "@/lib/calendar/paschalion";
import type {
  CalendarData,
  CalendarSystem,
  LectionarySlot,
} from "@/lib/calendar/types";

type Options = { calendarSystem?: CalendarSystem };

// Compose the day's lectionary readings. Movable readings (pdist-keyed) are
// listed first; fixed-cycle additions (MM-DD-keyed) follow. Unlike the movable
// *commemoration* lookup (which is bounded to the Triodion/Pentecostarion span),
// readings extend through the whole post-Pentecost Sunday cycle — the pdist
// lookup is unbounded, and absence is the only signal of "no appointed reading."
export function composeDailyReadings(
  date: Date,
  data: CalendarData,
  options: Options = {},
): ReadingAssignment[] {
  const calendarSystem = options.calendarSystem ?? "new";
  const isoDate = formatIso(date);

  const slots: LectionarySlot[] = [];

  const { pdist } = resolvePaschalAnchor(date);
  const movable = data.lectionary.movable[String(pdist)];
  if (movable) slots.push(...movable);

  const menaionKey = calendarSystem === "new" ? gregorianMonthDay(date) : julianKey(date);
  const fixed = data.lectionary.fixed[menaionKey];
  // Byzantine typikon: during Holy Week and the Pentecostarion (Lazarus
  // Saturday through Pentecost = pdist -8 to 49), the movable readings
  // supersede ordinary saint commemorations and the saint's readings are
  // deferred. Polyeleos/vigil/great-rank feasts are the exception — they
  // retain their readings even within the paschal cycle.
  // Outside this window (Triodion through post-Pentecost weekdays), the
  // saint's readings layer with the day's weekday/Sunday reading as usual.
  const inPaschalCycle = pdist >= -8 && pdist <= 49;
  const fixedFeastRank = data.menaion[menaionKey]?.feastRank;
  const isMajorFixedFeast =
    fixedFeastRank === "great" ||
    fixedFeastRank === "vigil" ||
    fixedFeastRank === "polyeleos";
  if (fixed && !(inPaschalCycle && movable && !isMajorFixedFeast)) {
    slots.push(...fixed);
  }

  return slots.map((slot, index) => slotToReadingAssignment(slot, isoDate, index));
}

function slotToReadingAssignment(
  slot: LectionarySlot,
  isoDate: string,
  index: number,
): ReadingAssignment {
  const scripture: ScriptureReference = createReference(
    slot.bookSlug,
    slot.bookName,
    slot.chapter,
    slot.verseStart,
    slot.verseEnd,
  );
  return {
    id: `reading-${isoDate}-${slot.kind}-${index}`,
    label: slot.label,
    contextLabel: "Liturgy",
    scripture,
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
