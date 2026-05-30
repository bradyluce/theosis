import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET } from "@/lib/storage/s3";
import type { CommentaryEntry } from "@theosis/core";
import { isSafeSlug } from "@/lib/api/safe-segment";

// Serve one per-chapter (chapter-level commentary) file. Most chapters
// have no by-chapter file — only those where a Father wrote on the
// chapter as a unit (Augustine's Expositions on the Psalms is the main
// source today). 404s for the common case are expected.

const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

type ByChapterFile = {
  bookSlug: string;
  chapterNumber: number;
  entries: CommentaryEntry[];
};

async function getFromS3(key: string): Promise<ByChapterFile | null> {
  try {
    const result = await storageClient.send(
      new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }),
    );
    const body = await result.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as ByChapterFile;
  } catch {
    return null;
  }
}

function getFromLocal(bookSlug: string, chapterNumber: number): ByChapterFile | null {
  const filePath = path.join(
    process.cwd(),
    "content/normalized/commentary/by-chapter",
    bookSlug,
    `${chapterNumber}.json`,
  );
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as ByChapterFile;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ book: string; chapter: string }> },
) {
  const { book, chapter } = await context.params;
  const chapterNumber = Number.parseInt(chapter, 10);

  if (!isSafeSlug(book) || Number.isNaN(chapterNumber)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const key = `commentary/by-chapter/${book}/${chapterNumber}.json`;
  const fromS3 = await getFromS3(key);
  const result = fromS3 ?? getFromLocal(book, chapterNumber);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
