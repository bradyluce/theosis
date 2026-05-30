import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  composeDailyFastDetail,
  getDailyCommemoration,
  getDailyHymns,
  getDailyReadings,
} from "@/lib/calendar";
import { getPeopleByIds, getPrimaryTranslation } from "@/lib/content";
import {
  getIconForPerson,
  getPrimaryIconForDay,
} from "@/lib/content/icon-store";
import { toAbsoluteIconUrl } from "@/lib/content/icon-url";
import { resolveRequestOrigin } from "@/lib/request-origin";
import type { ComposeOptions } from "@/lib/calendar/composer";
import { type IconRef, JURISDICTION_OPTIONS } from "@theosis/core";

// Serve a pre-composed snapshot of "today's daily commemoration" for the
// mobile app. The web app's Daily page composes this server-side by chaining
// getDailyCommemoration + getPeopleByIds + getDailyReadings + getDailyHymns
// + icon resolution. Mobile clients can't run any of that (it touches local
// JSON files); this route bundles the result into one cacheable response.
//
// Accepts an optional `?date=YYYY-MM-DD` query for past/future dates,
// matching the web's date picker. Defaults to today (UTC midnight, same as
// the web).

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

function parseDateParam(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }
  return new Date(Date.UTC(year, month - 1, day));
}

// Resolve the user's calendar system + jurisdiction from the query. `calendar`
// is "new" (Revised Julian, the default) or "old" (Julian) — this is what
// actually shifts fixed-feast dates by 13 days. `jurisdiction` is an optional
// Assembly code (e.g. "roc") used only to annotate the composed calendarLabel.
function parseCalendarOptions(url: URL): ComposeOptions {
  const calendarSystem = url.searchParams.get("calendar") === "old" ? "old" : "new";
  const jurisdictionCode = url.searchParams.get("jurisdiction");
  const jurisdictionLabel = jurisdictionCode
    ? JURISDICTION_OPTIONS.find((option) => option.code === jurisdictionCode)?.label
    : undefined;
  return { calendarSystem, jurisdictionLabel };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const date = parseDateParam(url.searchParams.get("date"));
  const options = parseCalendarOptions(url);

  const daily = getDailyCommemoration(date, options);
  // Primary saints drive the hero icon (getPrimaryIconForDay reasons about
  // demotion against these). The full set additionally includes every linked
  // co-commemoration so the client can show + link their icons too.
  const primarySaints = getPeopleByIds(daily.saintIds);
  const commemorationSaintIds = daily.additionalCommemorations
    .map((item) => item.saintId)
    .filter((id): id is string => Boolean(id));
  const saints = getPeopleByIds([
    ...new Set([...daily.saintIds, ...commemorationSaintIds]),
  ]);
  const readings = getDailyReadings(date, options);
  const hymns = getDailyHymns(date, options);
  const translationSlug = getPrimaryTranslation()?.slug ?? "kjva";
  // Match the composer's "today" idiom when no ?date= passed: local Y/M/D
  // at UTC midnight, so day-of-fast math agrees with the rest of the page.
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const fastDetail = composeDailyFastDetail(date ?? todayUtc, options) ?? null;

  // Resolve via PUBLIC_ORIGIN if pinned (prod / preview), falling back to
  // the request's Host header for local dev. See resolveRequestOrigin for
  // details on why this matters (Host header injection).
  const origin = resolveRequestOrigin(request);
  const primaryIcon = toAbsoluteIconUrl(
    getPrimaryIconForDay(daily, primarySaints),
    origin,
  );

  // Icons keyed by person id, covering primary AND co-commemoration saints so
  // the "Also commemorated" list can render each saint's icon.
  const saintIcons: Record<string, IconRef | null> = {};
  for (const saint of saints) {
    saintIcons[saint.id] = toAbsoluteIconUrl(getIconForPerson(saint), origin);
  }

  return NextResponse.json(
    {
      daily,
      saints,
      readings,
      hymns,
      translationSlug,
      primaryIcon,
      saintIcons,
      fastDetail,
    },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
