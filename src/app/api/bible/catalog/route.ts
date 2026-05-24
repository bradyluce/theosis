import "server-only";

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Serve content/normalized/bibles/catalog.json — the master list of every
// available translation + every book in the canon (OT/NT/Deuterocanon).
// Mobile uses this for the book picker and the translation switcher.
//
// The catalog.json lists all 84 canonical books but doesn't know which
// translations are partial (NT-only, OT-only). We enrich each translation
// entry with `availableBooks` by scanning the local normalized directory.
// Absent means "all books available"; present means the picker should filter.

const REGION = process.env.BIBLE_S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

const s3Client = new S3Client({ region: REGION });

const CACHE_CONTROL = "public, max-age=600, stale-while-revalidate=3600";

const BIBLES_DIR = path.join(process.cwd(), "content/normalized/bibles");

function getTranslationBooks(translationId: string): string[] | null {
  const dir = path.join(BIBLES_DIR, translationId);
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir)
    .filter((name) => fs.statSync(path.join(dir, name)).isDirectory());
}

type RawCatalog = {
  translations: Array<{ id?: string; [key: string]: unknown }>;
  books: unknown[];
};

function enrichCatalog(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const catalog = raw as RawCatalog;
  if (!Array.isArray(catalog.translations) || !Array.isArray(catalog.books)) return raw;

  const totalBooks = catalog.books.length;

  const translations = catalog.translations.map((t) => {
    if (!t?.id) return t;
    const available = getTranslationBooks(t.id);
    // Only add the field when the translation is a strict subset — absent
    // field means "all books" and keeps the payload lean for full translations.
    if (!available || available.length === totalBooks) return t;
    return { ...t, availableBooks: available };
  });

  return { ...catalog, translations };
}

async function getFromS3(): Promise<unknown | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: "bibles/catalog.json" }),
    );
    const body = await result.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function getFromLocal(): unknown | null {
  const filePath = path.join(BIBLES_DIR, "catalog.json");
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export async function GET() {
  // Local catalog wins. The file is part of the deploy and reflects the
  // current ingestion state; S3 caches an older copy and would otherwise
  // override fresh local data (e.g. new translations like WEB/Vulgate).
  // S3 is kept only as a safety net for deploys missing the file.
  const raw = getFromLocal() ?? (await getFromS3());
  if (!raw) {
    return NextResponse.json({ error: "Bible catalog not found" }, { status: 404 });
  }
  const result = enrichCatalog(raw);
  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
