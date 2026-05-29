// Sync content/normalized/{commentary,library}/ → s3://theosis-content/
// {commentary,library}/ with aws-s3-sync-equivalent semantics: only upload
// new or changed files (compare local MD5 vs remote ETag). Idempotent — a
// second run on an unchanged tree uploads nothing.
//
// Usage:
//   npm run push:commentary:s3              # actually upload
//   npm run push:commentary:s3 -- --dry-run # show what would happen, no writes
//
// Env vars (same as the Bible API route — single bucket, two prefixes):
//   BIBLE_S3_BUCKET   default theosis-content
//   BIBLE_S3_REGION   default us-east-1
//   AWS_*             credentials picked up by the standard AWS SDK chain
//
// Limitations (intentional for v1):
// - No deletion. Files removed locally remain in S3. Add a --delete flag if
//   that becomes important; for now stale objects are harmless because the
//   API routes only fetch known keys.
// - No retry on PutObject failures. Failures are logged and the script
//   continues; re-run to retry just the failed keys.
// - Multipart uploads are not used. Every output file is under 2 MB; the
//   SDK default single-PUT threshold (5 MB) covers them all.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const REGION = process.env.BIBLE_S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

const SYNC_TARGETS: Array<{ localDir: string; s3Prefix: string }> = [
  { localDir: "content/normalized/commentary", s3Prefix: "commentary" },
  { localDir: "content/normalized/library", s3Prefix: "library" },
];

const PARALLEL_UPLOADS = 8;

// Honor BIBLE_S3_ENDPOINT so this script targets the SAME store the API
// routes read from. Production serves content from Cloudflare R2 (endpoint
// set in Vercel); without this the sync would silently write to AWS S3
// while the live API reads R2 — uploads land in the wrong bucket and the
// deployed app never sees the change. Mirrors src/lib/storage/s3.ts.
const ENDPOINT = process.env.BIBLE_S3_ENDPOINT;

const s3 = new S3Client({
  region: REGION,
  ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}),
});

if (ENDPOINT) {
  console.log(`[push] using custom endpoint: ${ENDPOINT}`);
}

function md5Hex(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex");
}

function md5Base64(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("base64");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function listBucketByPrefix(prefix: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let continuationToken: string | undefined = undefined;
  do {
    const res: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${prefix}/`,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.ETag) {
        // S3 wraps ETag in double quotes.
        map.set(obj.Key, obj.ETag.replace(/"/g, ""));
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return map;
}

type UploadJob = {
  key: string;
  body: Buffer;
  bodyHash: string;
  reason: "new" | "changed";
};

async function uploadJob(job: UploadJob): Promise<{ ok: boolean; error?: unknown }> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: job.key,
        Body: job.body,
        ContentType: "application/json",
        ContentMD5: md5Base64(job.body),
      }),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

async function syncTarget(localDir: string, s3Prefix: string): Promise<void> {
  const absDir = join(process.cwd(), localDir);
  if (!existsSync(absDir)) {
    console.log(`[push] ${localDir} does not exist; skipping`);
    return;
  }

  console.log(`[push] ${localDir} → s3://${BUCKET}/${s3Prefix}/`);

  let remote: Map<string, string>;
  if (DRY_RUN) {
    // Skip the network round-trip in dry-run mode so the script also works
    // offline / without credentials.
    remote = new Map();
    console.log("[push]   (dry-run: skipping S3 listing; treating bucket as empty)");
  } else {
    remote = await listBucketByPrefix(s3Prefix);
    console.log(`[push]   remote has ${remote.size} objects under ${s3Prefix}/`);
  }

  const files = walk(absDir).sort();
  console.log(`[push]   local has ${files.length} files`);

  const jobs: UploadJob[] = [];
  let skipped = 0;
  for (const localPath of files) {
    const rel = relative(absDir, localPath).split(/[\\/]/).join("/");
    const key = `${s3Prefix}/${rel}`;
    const body = readFileSync(localPath);
    const localHash = md5Hex(body);
    const remoteHash = remote.get(key);

    if (remoteHash === localHash) {
      skipped++;
      continue;
    }
    jobs.push({
      key,
      body,
      bodyHash: localHash,
      reason: remoteHash ? "changed" : "new",
    });
  }

  if (DRY_RUN) {
    let newCount = 0;
    let changedCount = 0;
    for (const job of jobs) {
      if (job.reason === "new") newCount++;
      else changedCount++;
    }
    console.log(
      `[push]   would upload ${jobs.length} (${newCount} new, ${changedCount} changed), skip ${skipped}`,
    );
    // Print the first handful of paths for sanity.
    for (const job of jobs.slice(0, 10)) {
      console.log(`[push]     ${job.reason.padEnd(7)} ${job.key}`);
    }
    if (jobs.length > 10) console.log(`[push]     ... (+${jobs.length - 10} more)`);
    return;
  }

  // Bounded-parallel uploads.
  let uploaded = 0;
  let failed = 0;
  const workers: Promise<void>[] = [];
  let nextIndex = 0;
  for (let w = 0; w < PARALLEL_UPLOADS; w++) {
    workers.push(
      (async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= jobs.length) return;
          const job = jobs[index];
          const result = await uploadJob(job);
          if (result.ok) {
            uploaded++;
            if (uploaded % 200 === 0) {
              console.log(`[push]   uploaded ${uploaded}/${jobs.length}...`);
            }
          } else {
            failed++;
            console.warn(`[push]   upload failed for ${job.key}:`, result.error);
          }
        }
      })(),
    );
  }
  await Promise.all(workers);

  console.log(
    `[push]   done: ${uploaded} uploaded, ${skipped} unchanged, ${failed} failed`,
  );
}

async function main() {
  console.log(`[push] target: s3://${BUCKET}/  (region ${REGION})`);
  if (DRY_RUN) console.log("[push] DRY RUN — no uploads will happen");

  for (const target of SYNC_TARGETS) {
    await syncTarget(target.localDir, target.s3Prefix);
  }
}

main().catch((error) => {
  console.error("[push] fatal:", error);
  process.exit(1);
});
