import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET } from "@/lib/storage/s3";

// Serve content/normalized/commentary/catalog.json. The mobile app fetches
// this once on launch (and periodically to detect new content) — it carries
// the deduped people/works/sources arrays plus the byVerse/byChapter index
// the client needs to know which (book, chapter, verse) tuples actually
// have commentary before trying to fetch them.

// 5 min fresh, 1 hour stale-while-revalidate. The catalog changes whenever a
// new corpus is ingested or normalize is re-run — short enough that clients
// pick up new content within the day, long enough that bursty traffic doesn't
// hammer the origin.
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

async function getFromS3(): Promise<unknown | null> {
  try {
    const result = await storageClient.send(
      new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: "commentary/catalog.json" }),
    );
    const body = await result.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function getFromLocal(): unknown | null {
  const filePath = path.join(process.cwd(), "content/normalized/commentary/catalog.json");
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export async function GET() {
  const result = (await getFromS3()) ?? getFromLocal();
  if (!result) {
    return NextResponse.json({ error: "Catalog not found" }, { status: 404 });
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
