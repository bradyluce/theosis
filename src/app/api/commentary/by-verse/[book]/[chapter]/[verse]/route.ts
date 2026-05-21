import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { CommentaryEntry } from "@theosis/core";

// Serve one per-verse commentary file. Tries S3 first (so production
// deploys can update commentary without redeploying the bundle); falls
// back to the committed local file if S3 is unconfigured or missing.
// Mirrors src/app/api/bible/[translation]/[book]/[chapter]/route.ts.

const REGION = process.env.BIBLE_S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

const s3Client = new S3Client({ region: REGION });

// 1 hour fresh, 1 day stale-while-revalidate. Content files change only when
// the upstream bundles are reingested + renormalized; a re-deploy follows.
// Long-ish cache is safe; the deployment commit changes signal staleness.
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

type ByVerseFile = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  entries: CommentaryEntry[];
};

async function getFromS3(key: string): Promise<ByVerseFile | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    const body = await result.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as ByVerseFile;
  } catch {
    return null;
  }
}

function getFromLocal(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
): ByVerseFile | null {
  const filePath = path.join(
    process.cwd(),
    "content/normalized/commentary/by-verse",
    bookSlug,
    String(chapterNumber),
    `${verseNumber}.json`,
  );
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as ByVerseFile;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ book: string; chapter: string; verse: string }> },
) {
  const { book, chapter, verse } = await context.params;
  const chapterNumber = Number.parseInt(chapter, 10);
  const verseNumber = Number.parseInt(verse, 10);

  if (!book || Number.isNaN(chapterNumber) || Number.isNaN(verseNumber)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const key = `commentary/by-verse/${book}/${chapterNumber}/${verseNumber}.json`;
  const fromS3 = await getFromS3(key);
  const result = fromS3 ?? getFromLocal(book, chapterNumber, verseNumber);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
