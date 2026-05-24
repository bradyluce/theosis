import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type {
  DailyCommemorationItem,
  MenaionDay,
  MenaionMonthResponse,
} from "@theosis/core";
import { loadCalendarData } from "@/lib/calendar/data";

// Returns all Menaion entries for a given calendar month (1-12). The mobile
// app's saints-calendar grid uses this to populate a month view; the response
// is sparse — only days with Menaion entries are returned, which lets the
// client distinguish "no commemoration catalogued yet" from "feast-free."

const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ month: string }> },
) {
  const { month: monthStr } = await context.params;
  const month = Number.parseInt(monthStr, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: `Invalid month: ${monthStr}` },
      { status: 400 },
    );
  }

  const data = loadCalendarData();
  const prefix = String(month).padStart(2, "0") + "-";

  const days: MenaionDay[] = Object.values(data.menaion)
    .filter((entry) => entry.monthDay.startsWith(prefix))
    .map((entry) => ({
      monthDay: entry.monthDay,
      title: entry.title,
      summary: entry.summary,
      saintIds: entry.saintIds ?? [],
      also: (entry.also ?? []).map<DailyCommemorationItem>((c) => ({
        name: c.name,
        summary: c.summary,
        saintId: c.saintId,
      })),
    }))
    .sort((a, b) => a.monthDay.localeCompare(b.monthDay));

  const payload: MenaionMonthResponse = { month, days };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
