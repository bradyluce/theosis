import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { WorkChapter } from "@theosis/core";

// Serve one library/by-work/<workId>/<order>.json file — a single
// WorkChapter (one Book of Confessions, one homily, one tractate, etc.)
// with full prose inline. The order is the chapter's `order` field, not
// always 1..N — the six ecumenical-council works pin their single
// chapter at the council's ordinal (e.g. Chalcedon order=4). Clients
// should consult library/catalog.json's index.byWork[workId].orders to
// know which orders exist.

const REGION = process.env.BIBLE_S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

const s3Client = new S3Client({ region: REGION });

type ByWorkFile = {
  chapter: WorkChapter;
};

async function getFromS3(key: string): Promise<ByWorkFile | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
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

  return NextResponse.json(result);
}
