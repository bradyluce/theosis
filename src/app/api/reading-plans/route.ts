import "server-only";

import { NextResponse } from "next/server";
import { readingPlans } from "@theosis/core";
import type { ReadingPlansResponse } from "@theosis/core";

// Static editorial corpus — same JSON every request. Heavy cache.
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

export async function GET() {
  const plans: ReadingPlansResponse["plans"] = readingPlans.map((plan) => {
    const { days: _days, ...rest } = plan;
    void _days;
    return {
      ...rest,
      estimatedTotalMinutes: plan.estimatedMinutesPerDay * plan.totalDays,
    };
  });

  return NextResponse.json(
    { plans },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
