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
import type { IconRef } from "@theosis/core";

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const date = parseDateParam(url.searchParams.get("date"));

  const daily = getDailyCommemoration(date);
  const saints = getPeopleByIds(daily.saintIds);
  const readings = getDailyReadings(date);
  const hymns = getDailyHymns(date);
  const translationSlug = getPrimaryTranslation()?.slug ?? "kjva";
  // Match the composer's "today" idiom when no ?date= passed: local Y/M/D
  // at UTC midnight, so day-of-fast math agrees with the rest of the page.
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const fastDetail = composeDailyFastDetail(date ?? todayUtc) ?? null;

  // Derive the origin from the Host header rather than url.origin, which
  // returns the server's bind address ("0.0.0.0" in `next dev -H 0.0.0.0`)
  // — unreachable from a real device. The Host header carries whatever the
  // client actually asked for (e.g. "192.168.1.10:3000" or the Vercel URL),
  // which is what the icons need to be addressable under.
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("host") ?? url.host;
  const origin = `${proto}://${host}`;
  const primaryIcon = toAbsoluteIconUrl(
    getPrimaryIconForDay(daily, saints),
    origin,
  );

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
