// Fast-label resolution shared by the Daily screen and the on-device
// notification scheduler, so the wording stays identical in both places.
//
// The API supplies a label during seasonal fasts (Lent, Apostles',
// Dormition, Nativity); we use it directly. For ordinary time we fall back
// to the weekly Wed/Fri rule, modulated by the user's fasting level.
//
// fastingLevel:
//   strict   — every fast labeled prominently; Wed/Fri count as fasts.
//   standard — Wed/Fri labeled (default behavior).
//   relaxed  — show only seasonal fasts; on plain Wed/Fri render the
//              soft "Fast Free" treatment (so the chip doesn't shout).

export type FastingLevel = "strict" | "standard" | "relaxed";

export function resolveFastLabel(
  isoDate: string,
  providedLabel: string | undefined,
  fastingLevel: FastingLevel | undefined,
): { label: string; isFastFree: boolean } {
  if (providedLabel) return { label: providedLabel, isFastFree: false };
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun … 3=Wed, 5=Fri, 6=Sat
  if (fastingLevel === "relaxed") {
    // No seasonal fast label and the user has opted out of weekly
    // fasts — render the soft chip.
    return { label: "Fast Free", isFastFree: true };
  }
  if (dow === 3) return { label: "Wednesday Fast", isFastFree: false };
  if (dow === 5) return { label: "Friday Fast", isFastFree: false };
  return { label: "Fast Free", isFastFree: true };
}
