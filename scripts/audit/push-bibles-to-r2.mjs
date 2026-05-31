#!/usr/bin/env node
/**
 * One-off: sync content/normalized/bibles/ → s3://<bucket>/bibles/.
 *
 * The bible chapter API route is S3-FIRST (key `bibles/<tr>/<book>/<ch>.json`,
 * local only as fallback), and R2 already holds a populated `bibles/` prefix —
 * but the maintained pipeline script (push-commentary-to-s3.ts) syncs only
 * commentary/ and library/, NOT bibles. So bible content fixes never reach R2
 * via the normal flow. This delivers the content-QA WEB/rus-synodal/cu-elizabeth
 * verse fixes. Same MD5-vs-ETag, no-delete, idempotent semantics as the pipeline.
 *
 * Env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BIBLE_S3_ENDPOINT,
 *      BIBLE_S3_BUCKET (default theosis-content), BIBLE_S3_REGION (default auto).
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const REGION = process.env.BIBLE_S3_REGION || process.env.AWS_REGION || "auto";
const BUCKET = process.env.BIBLE_S3_BUCKET || "theosis-content";
const ENDPOINT = process.env.BIBLE_S3_ENDPOINT;
const DRY_RUN = process.argv.includes("--dry-run");
const LOCAL_DIR = join(process.cwd(), "content/normalized/bibles");
const PREFIX = "bibles";
const PARALLEL = 8;

const s3 = new S3Client({
  region: REGION,
  ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}),
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const md5hex = (b) => createHash("md5").update(b).digest("hex");
const md5b64 = (b) => createHash("md5").update(b).digest("base64");
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

async function listRemote() {
  const map = new Map();
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${PREFIX}/`, ContinuationToken: token }));
    for (const o of res.Contents ?? []) if (o.Key && o.ETag) map.set(o.Key, o.ETag.replace(/"/g, ""));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return map;
}

console.log(`[bibles] ${LOCAL_DIR} → s3://${BUCKET}/${PREFIX}/  (region ${REGION}${ENDPOINT ? `, endpoint ${ENDPOINT}` : ""})`);
const remote = DRY_RUN ? new Map() : await listRemote();
if (!DRY_RUN) console.log(`[bibles] remote has ${remote.size} objects under ${PREFIX}/`);
const files = walk(LOCAL_DIR).sort();
console.log(`[bibles] local has ${files.length} files`);

const jobs = [];
let skipped = 0;
for (const fp of files) {
  const rel = relative(LOCAL_DIR, fp).split(/[\\/]/).join("/");
  const key = `${PREFIX}/${rel}`;
  const body = readFileSync(fp);
  if (remote.get(key) === md5hex(body)) { skipped++; continue; }
  jobs.push({ key, body, reason: remote.has(key) ? "changed" : "new" });
}

if (DRY_RUN) {
  console.log(`[bibles] would upload ${jobs.length} (${jobs.filter(j => j.reason === "new").length} new, ${jobs.filter(j => j.reason === "changed").length} changed), skip ${skipped}`);
  for (const j of jobs.slice(0, 10)) console.log(`  ${j.reason.padEnd(7)} ${j.key}`);
  if (jobs.length > 10) console.log(`  ... (+${jobs.length - 10} more)`);
  process.exit(0);
}

let uploaded = 0, failed = 0, next = 0;
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  while (true) {
    const i = next++;
    if (i >= jobs.length) return;
    const j = jobs[i];
    try {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: j.key, Body: j.body, ContentType: "application/json", ContentMD5: md5b64(j.body) }));
      if (++uploaded % 200 === 0) console.log(`[bibles] uploaded ${uploaded}/${jobs.length}...`);
    } catch (e) { failed++; console.warn(`[bibles] FAILED ${j.key}:`, e?.message || e); }
  }
}));
console.log(`[bibles] done: ${uploaded} uploaded, ${skipped} unchanged, ${failed} failed`);
process.exit(failed ? 1 : 0);
