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
import type { DailyResponse, LibraryPerson } from "@theosis/core";

import { getApi } from "./api";
import { resolveFastLabel } from "./fasting";
import { monthDayFromIso, parseFeastDayLabel, type MonthDay } from "./celebration";
import {
  type NotificationPrefs,
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
  if (prefs.feastSaint || prefs.fastReminder || prefs.personalOccasions) {
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
  if (prefs.personalOccasions && profile.patronSaintSlug) {
    try {
      const res = await api.fetchLibraryPeople();
      patron =
        res.people.find((p) => p.slug === profile.patronSaintSlug) ?? null;
    } catch {
      patron = null;
    }
  }

  const now = new Date();
  const { hour, minute } = prefs.morningPrayer; // content rides the morning slot

  for (let offset = 0; offset < CONTENT_WINDOW_DAYS; offset++) {
    const fireAt = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      hour,
      minute,
      0,
      0,
    );
    // Skip a slot already past (e.g. it's 9am and the morning slot is 7am).
    if (fireAt.getTime() <= Date.now() + 5_000) continue;

    const iso = localIso(fireAt);
    let daily: DailyResponse | undefined;
    try {
      daily = await api.fetchDaily(iso, { calendarSystem, jurisdiction });
    } catch {
      continue; // offline / failure — skip this day, keep trying the rest
    }
    if (!daily) continue;

    const composed = composeDailyNotification({
      iso,
      daily,
      prefs,
      patron,
      birthday: profile.birthday,
      fastingLevel: profile.fastingLevel,
    });
    if (!composed) continue;

    await Notifications.scheduleNotificationAsync({
      content: { title: composed.title, body: composed.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}

function composeDailyNotification(args: {
  iso: string;
  daily: DailyResponse;
  prefs: NotificationPrefs;
  patron: LibraryPerson | null;
  birthday: string | undefined;
  fastingLevel: ProfilePrefs["fastingLevel"] | undefined;
}): { title: string; body: string } | null {
  const { iso, daily, prefs, patron, birthday, fastingLevel } = args;
  const d = daily.daily;
  const today = monthDayFromIso(iso);

  // --- Personal occasions: name-day / birthday greeting --------------------
  let greeting: string | null = null;
  if (prefs.personalOccasions && today) {
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
      greeting = `Many years! Today the Church commemorates your patron, ${name}.`;
    } else if (isBirthday) {
      greeting = "Many years on your birthday! 🎂";
    }
  }

  // --- Feast / commemoration ----------------------------------------------
  const feastTitle = prefs.feastSaint ? d.feastLabel || d.title : null;

  // --- Fast ----------------------------------------------------------------
  // Only announce actual fasts; "Fast Free" days don't warrant a push.
  let fastLine: string | null = null;
  if (prefs.fastReminder) {
    const { label, isFastFree } = resolveFastLabel(iso, d.fastLabel, fastingLevel);
    if (!isFastFree) fastLine = label;
  }

  // --- Assemble (priority: greeting → feast → fast) ------------------------
  const bodyParts: string[] = [];
  let title: string;
  if (greeting) {
    title = "Theosis";
    bodyParts.push(greeting);
    if (feastTitle) bodyParts.push(feastTitle);
    if (fastLine) bodyParts.push(fastLine);
  } else if (feastTitle) {
    title = feastTitle;
    if (fastLine) bodyParts.push(fastLine);
    else if (d.summary) bodyParts.push(truncate(d.summary, 140));
  } else if (fastLine) {
    title = fastLine;
  } else {
    return null; // nothing worth sending this day
  }

  return { title, body: bodyParts.join(" · ") };
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
