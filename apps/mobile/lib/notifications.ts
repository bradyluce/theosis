// On-device notification scheduling. No backend, no push tokens, no APNs —
// everything here is a *local* scheduled notification laid down by the app
// itself (expo-notifications). The model:
//
//   • Two recurring DAILY triggers — morning / evening prayer reminders.
//   • A rolling window of dated, one-per-day content notifications built from
//     /api/daily (today's feast + fast + any name-day / birthday greeting),
//     scheduled at the user's morning time.
//
// We deliberately consolidate the day's editorial content into a SINGLE dated
// notification per day so we stay far under iOS's hard cap of 64 pending
// scheduled notifications (≈ window days + 2 recurring). The window is
// re-laid each time the app opens (see rescheduleAll callers), so a daily
// user always has fresh content queued; someone who doesn't open the app for
// longer than the window simply stops getting content notifications until
// they return — an acceptable tradeoff for a no-backend design.
//
// SDK 54: local notifications work in Expo Go and dev builds (only *remote*
// push needs a dev build). See https://docs.expo.dev/versions/v54.0.0/sdk/notifications/.

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type {
  DailyResponse,
  LibraryPerson,
  ReadingAssignment,
} from "@theosis/core";

import { getApi } from "./api";
import { resolveFastLabel } from "./fasting";
import { monthDayFromIso, parseFeastDayLabel, type MonthDay } from "./celebration";
import {
  type NotificationPrefs,
  type PrayerReminderPref,
  type ProfilePrefs,
  getNotificationPrefs,
  getProfilePrefs,
  setNotificationPrefs,
} from "./preferences";

const CHANNEL_ID = "daily";
// How many days ahead to pre-schedule content notifications. Kept well under
// the iOS 64-pending cap (this + 2 recurring prayer triggers).
const CONTENT_WINDOW_DAYS = 14;

// ---------------------------------------------------------------------------
// Handler + channel + permissions
// ---------------------------------------------------------------------------

let handlerConfigured = false;

// Call once at startup (module scope in _layout). Decides how a notification
// renders while the app is foregrounded — banner + list, no sound/badge (these
// are gentle reminders, not alarms).
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    // expo-notifications is a native module. If a JS-only OTA update lands on a
    // binary built before it was added, the native module is absent and this
    // throws — swallow so the app still boots. Notifications stay inert until
    // the next native build ships.
    console.warn("[notifications] handler setup skipped:", err);
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Daily life of the Church",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });
}

// Is the OS permission currently granted (or provisionally granted on iOS)?
export async function getPermissionStatus(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted;
  } catch {
    return false; // native module absent (pre-notifications OTA binary)
  }
}

// Request permission if not already granted. Returns whether we ended up
// granted. Safe to call repeatedly — the OS only prompts the first time.
export async function ensurePermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false; // native module absent (pre-notifications OTA binary)
  }
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

function localIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function sameMonthDay(a: MonthDay | null, b: MonthDay | null): boolean {
  return !!a && !!b && a.month === b.month && a.day === b.day;
}

// The whole schedule, rebuilt from scratch. Idempotent: we own every pending
// notification, so we cancel all then re-lay. Call on launch (guarded by the
// caller on scheduledThrough) and after any settings change.
//
// Serialized through a single promise chain so rapid setting toggles can't
// interleave one run's cancel-all with another run's scheduling.
let rescheduleChain: Promise<void> = Promise.resolve();
export function rescheduleAll(): Promise<void> {
  rescheduleChain = rescheduleChain
    .then(runReschedule, runReschedule)
    .catch((err) => {
      // Any failure (incl. a missing native module on a pre-notifications OTA
      // binary) must not bubble up and crash a caller — degrade to a no-op.
      console.warn("[notifications] reschedule skipped:", err);
    });
  return rescheduleChain;
}

async function runReschedule(): Promise<void> {
  // Clean slate — we manage the entire pending set.
  await Notifications.cancelAllScheduledNotificationsAsync();

  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return;
  if (!(await getPermissionStatus())) return;

  await ensureAndroidChannel();

  // 1) Recurring prayer reminders.
  if (prefs.morningPrayer.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Morning prayers", body: "Begin the day with your rule." },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.morningPrayer.hour,
        minute: prefs.morningPrayer.minute,
      },
    });
  }
  if (prefs.eveningPrayer.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Evening prayers", body: "Close the day in prayer." },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.eveningPrayer.hour,
        minute: prefs.eveningPrayer.minute,
      },
    });
  }

  // 2) Dated content window.
  if (
    prefs.feastSaint.enabled ||
    prefs.fastReminder.enabled ||
    prefs.personalOccasions.enabled ||
    prefs.dailyReadings.enabled
  ) {
    await scheduleContentWindow(prefs);
  }

  // Remember we've laid down today's window so the launch path can skip a
  // redundant reschedule until tomorrow.
  await setNotificationPrefs({ scheduledThrough: localIso(new Date()) });
}

async function scheduleContentWindow(prefs: NotificationPrefs): Promise<void> {
  const profile = await getProfilePrefs();
  const calendarSystem: "new" | "old" =
    profile.calendarSystem === "julian" ? "old" : "new";
  const jurisdiction = profile.jurisdiction;
  const api = getApi();

  // Patron, for name-day detection — fetched once for the whole window.
  let patron: LibraryPerson | null = null;
  if (prefs.personalOccasions.enabled && profile.patronSaintSlug) {
    try {
      const res = await api.fetchLibraryPeople();
      patron =
        res.people.find((p) => p.slug === profile.patronSaintSlug) ?? null;
    } catch {
      patron = null;
    }
  }

  const now = new Date();

  for (let offset = 0; offset < CONTENT_WINDOW_DAYS; offset++) {
    // The calendar day we're scheduling for (local midnight + offset). Each
    // enabled content kind then fires at its own configured time on this day.
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      0,
      0,
      0,
      0,
    );
    const iso = localIso(day);

    let daily: DailyResponse | undefined;
    try {
      daily = await api.fetchDaily(iso, { calendarSystem, jurisdiction });
    } catch {
      continue; // offline / failure — skip this day, keep trying the rest
    }
    if (!daily) continue;

    // One piece per enabled kind that actually has something to say today.
    const pieces = collectPieces({
      iso,
      daily,
      prefs,
      patron,
      birthday: profile.birthday,
      fastingLevel: profile.fastingLevel,
    });
    if (pieces.length === 0) continue;

    // Group pieces that share a time so same-time kinds arrive as ONE
    // notification (the default, when the user hasn't staggered them) rather
    // than a burst of banners. Different times fan out into separate slots.
    const slots = new Map<string, ContentPiece[]>();
    for (const piece of pieces) {
      const key = `${piece.time.hour}:${piece.time.minute}`;
      const bucket = slots.get(key);
      if (bucket) bucket.push(piece);
      else slots.set(key, [piece]);
    }

    for (const bucket of slots.values()) {
      const { hour, minute } = bucket[0].time;
      const fireAt = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hour,
        minute,
        0,
        0,
      );
      // Skip a slot already past (e.g. it's 9am and this slot is 8am today).
      if (fireAt.getTime() <= Date.now() + 5_000) continue;

      const composed = composeSlot(bucket);
      if (!composed) continue;

      await Notifications.scheduleNotificationAsync({
        content: { title: composed.title, body: composed.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
    }
  }
}

// One scheduled "line" of the day's content, tagged with the time it fires.
type ContentPiece = {
  kind: "personal" | "feast" | "fast" | "readings";
  time: PrayerReminderPref;
  // Title-worthy phrasing when this piece leads its slot.
  headline: string;
  // Longer descriptive line for the notification body.
  detail?: string;
};

// Title precedence when several kinds share a slot.
const PIECE_ORDER: Record<ContentPiece["kind"], number> = {
  personal: 0,
  feast: 1,
  fast: 2,
  readings: 3,
};

function collectPieces(args: {
  iso: string;
  daily: DailyResponse;
  prefs: NotificationPrefs;
  patron: LibraryPerson | null;
  birthday: string | undefined;
  fastingLevel: ProfilePrefs["fastingLevel"] | undefined;
}): ContentPiece[] {
  const { iso, daily, prefs, patron, birthday, fastingLevel } = args;
  const d = daily.daily;
  const today = monthDayFromIso(iso);
  const pieces: ContentPiece[] = [];

  // Personal — name-day / birthday greeting.
  if (prefs.personalOccasions.enabled && today) {
    const greeting = composeGreeting({ daily, today, patron, birthday });
    if (greeting) {
      pieces.push({
        kind: "personal",
        time: prefs.personalOccasions,
        headline: greeting,
      });
    }
  }

  // Feast / commemoration.
  if (prefs.feastSaint.enabled) {
    const feastTitle = d.feastLabel || d.title;
    if (feastTitle) {
      pieces.push({
        kind: "feast",
        time: prefs.feastSaint,
        headline: feastTitle,
        detail: d.summary ? truncate(d.summary, 140) : undefined,
      });
    }
  }

  // Fast — only announce actual fasts; "Fast Free" days don't warrant a push.
  if (prefs.fastReminder.enabled) {
    const { label, isFastFree } = resolveFastLabel(iso, d.fastLabel, fastingLevel);
    if (!isFastFree) {
      pieces.push({ kind: "fast", time: prefs.fastReminder, headline: label });
    }
  }

  // Daily scripture readings — the appointed Epistle & Gospel.
  if (prefs.dailyReadings.enabled) {
    const refs = composeReadings(daily.readings);
    if (refs) {
      pieces.push({
        kind: "readings",
        time: prefs.dailyReadings,
        headline: "Today's readings",
        detail: refs,
      });
    }
  }

  return pieces;
}

// Build one notification from the pieces sharing a single time slot. Title
// precedence: greeting → feast → fast → readings; the rest fold into the body.
function composeSlot(
  pieces: ContentPiece[],
): { title: string; body: string } | null {
  if (pieces.length === 0) return null;
  const sorted = [...pieces].sort(
    (a, b) => PIECE_ORDER[a.kind] - PIECE_ORDER[b.kind],
  );
  const find = (k: ContentPiece["kind"]) => sorted.find((p) => p.kind === k);
  const personal = find("personal");
  const feast = find("feast");
  const fast = find("fast");
  const readings = find("readings");

  const bodyParts: string[] = [];
  let title: string;
  if (personal) {
    title = "Theosis";
    bodyParts.push(personal.headline);
    if (feast) bodyParts.push(feast.headline);
    if (fast) bodyParts.push(fast.headline);
    if (readings?.detail) bodyParts.push(readings.detail);
  } else if (feast) {
    title = feast.headline;
    if (fast) bodyParts.push(fast.headline);
    if (readings?.detail) bodyParts.push(readings.detail);
    else if (!fast && feast.detail) bodyParts.push(feast.detail);
  } else if (fast) {
    title = fast.headline;
    if (readings?.detail) bodyParts.push(readings.detail);
  } else if (readings) {
    title = readings.headline;
    if (readings.detail) bodyParts.push(readings.detail);
  } else {
    return null;
  }

  return { title, body: bodyParts.join(" · ") };
}

// Name-day / birthday greeting for the day, or null.
function composeGreeting(args: {
  daily: DailyResponse;
  today: MonthDay;
  patron: LibraryPerson | null;
  birthday: string | undefined;
}): string | null {
  const { daily, today, patron, birthday } = args;
  const d = daily.daily;
  const isBirthday = sameMonthDay(monthDayFromIso(birthday ?? null), today);
  let isNameDay = false;
  if (patron) {
    // Signal A — patron appears in this date's composed commemoration.
    const ids = new Set<string>();
    for (const id of d.saintIds ?? []) ids.add(id);
    for (const c of d.additionalCommemorations ?? []) {
      if (c.saintId) ids.add(c.saintId);
    }
    for (const s of daily.saints ?? []) ids.add(s.id);
    const signalA = ids.has(patron.id) || ids.has(patron.slug);
    // Signal B — patron's fixed feast-day label matches this date.
    const signalB = parseFeastDayLabel(patron.feastDayLabel).some((md) =>
      sameMonthDay(md, today),
    );
    isNameDay = signalA || signalB;
  }
  if (isNameDay && patron) {
    const name = patron.honorific
      ? `${patron.honorific} ${patron.name.split(",")[0]}`
      : patron.name.split(",")[0];
    return `Many years! Today the Church commemorates your patron, ${name}.`;
  }
  if (isBirthday) return "Many years on your birthday! 🎂";
  return null;
}

// Condense the day's lectionary into one line, e.g.
// "Epistle: Rom 5:1–10 · Gospel: John 1:1–17". Caps at three references.
function composeReadings(readings: ReadingAssignment[]): string | null {
  if (!readings || readings.length === 0) return null;
  const parts: string[] = [];
  for (const r of readings) {
    const ref = r.scripture?.label?.trim();
    if (!ref) continue;
    const label = r.label?.trim();
    parts.push(label ? `${label}: ${ref}` : ref);
    if (parts.length === 3) break;
  }
  if (parts.length === 0) return null;
  return truncate(parts.join(" · "), 150);
}

// Fire an immediate preview notification — used by the "Send a test" row in
// settings so the user can confirm notifications are working (and see the
// style). `trigger: null` presents it right away.
export async function sendTestNotification(): Promise<void> {
  try {
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Theosis",
        body: "Notifications are on — you'll see the day's commemoration here.",
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("[notifications] test notification skipped:", err);
  }
}
