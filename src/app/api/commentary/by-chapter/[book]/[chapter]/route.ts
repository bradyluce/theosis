import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { CommentaryEntry } from "@theosis/core";

// Serve one per-chapter (chapter-level commentary) file. Most chapters
// have no by-chapter file — only those where a Father wrote on the
// chapter as a unit (Augustine's Expositions on the Psalms is the main
// source today). 404s for the common case are expected.

const REGION = process.env.BIBLE_S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

const s3Client = new S3Client({ region: REGION });

type ByChapterFile = {
  bookSlug: string;
  chapterNumber: number;
  entries: CommentaryEntry[];
};

async function getFromS3(key: string): Promise<ByChapterFile | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
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

  if (!book || Number.isNaN(chapterNumber)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const key = `commentary/by-chapter/${book}/${chapterNumber}.json`;
  const fromS3 = await getFromS3(key);
  const result = fromS3 ?? getFromLocal(book, chapterNumber);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
