import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Serve content/normalized/library/catalog.json. The mobile app fetches this
// to know which works exist and which chapter orders each has (e.g.
// ecumenical-council works pin their lone chapter at non-1 orders) before
// requesting individual /api/library/by-work/<workId>/<order> files.

const REGION = process.env.BIBLE_S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

const s3Client = new S3Client({ region: REGION });

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

async function getFromS3(): Promise<unknown | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: "library/catalog.json" }),
    );
    const body = await result.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function getFromLocal(): unknown | null {
  const filePath = path.join(process.cwd(), "content/normalized/library/catalog.json");
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
