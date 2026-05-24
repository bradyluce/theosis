import "server-only";

import { NextResponse } from "next/server";
import type { TopicsResponse, TopicSummary } from "@theosis/core";
import { getAllTopicPages } from "@/lib/content/queries";

// Lightweight topic index for the Library tab's topic grid. The full body of
// each TopicPage is only returned by /api/topics/[slug] to keep this payload
// small (the mobile app loads this on every Library tab visit).

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

export async function GET() {
  const topics: TopicSummary[] = getAllTopicPages().map((topic) => ({
    slug: topic.slug,
    label: topic.label,
    subtitle: topic.subtitle,
    summary: topic.summary,
  }));

  const payload: TopicsResponse = { topics };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
