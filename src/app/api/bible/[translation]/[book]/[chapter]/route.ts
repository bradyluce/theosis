import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET } from "@/lib/storage/s3";
import type { NormalizedChapterFile } from "@/lib/bible/server-store";
import { getNormalizedChapter } from "@/lib/bible/server-store";

const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

async function getChapterFromS3(
  translationId: string,
  bookSlug: string,
  chapterNumber: number,
): Promise<NormalizedChapterFile | null> {
  const key = `bibles/${translationId}/${bookSlug}/${chapterNumber}.json`;

  try {
    const result = await storageClient.send(
      new GetObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
      }),
    );

    const body = await result.Body?.transformToString("utf-8");
    if (!body) {
      return null;
    }

    return JSON.parse(body) as NormalizedChapterFile;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ translation: string; book: string; chapter: string }> },
) {
  const { translation, book, chapter } = await context.params;
  const chapterNumber = Number.parseInt(chapter, 10);

  if (!translation || !book || Number.isNaN(chapterNumber)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const fromS3 = await getChapterFromS3(translation, book, chapterNumber);
  const fallback = fromS3 ?? getNormalizedChapter(translation, book, chapterNumber);

  if (!fallback) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  return NextResponse.json(fallback, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

