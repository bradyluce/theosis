import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET } from "@/lib/storage/s3";
import type { WorkChapter } from "@theosis/core";

// Serve one library/by-work/<workId>/<order>.json file — a single
// WorkChapter (one Book of Confessions, one homily, one tractate, etc.)
// with full prose inline. The order is the chapter's `order` field, not
// always 1..N — the six ecumenical-council works pin their single
// chapter at the council's ordinal (e.g. Chalcedon order=4). Clients
// should consult library/catalog.json's index.byWork[workId].chapters
// (iterate `chapter.order`) to know which orders exist.

// CDN-cached but not client-cached. See sibling chapters/route.ts for why
// — `max-age=0` keeps iOS NSURLSession from pinning a stale response for
// an hour after we push content fixes.
const CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

type ByWorkFile = {
  chapter: WorkChapter;
};

async function getFromS3(key: string): Promise<ByWorkFile | null> {
  try {
    const result = await storageClient.send(
      new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }),
    );
    const body = await result.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as ByWorkFile;
  } catch {
    return null;
  }
}

function getFromLocal(workId: string, order: number): ByWorkFile | null {
  const filePath = path.join(
    process.cwd(),
    "content/normalized/library/by-work",
    workId,
    `${order}.json`,
  );
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as ByWorkFile;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ work: string; order: string }> },
) {
  const { work, order } = await context.params;
  const orderNumber = Number.parseInt(order, 10);

  if (!work || Number.isNaN(orderNumber)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const key = `library/by-work/${work}/${orderNumber}.json`;
  const fromS3 = await getFromS3(key);
  const result = fromS3 ?? getFromLocal(work, orderNumber);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
