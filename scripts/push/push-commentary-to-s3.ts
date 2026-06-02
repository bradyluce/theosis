// Sync content/normalized/{bibles,commentary,library}/ → s3://theosis-content/
// {bibles,commentary,library}/ with aws-s3-sync-equivalent semantics: only upload
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

// Use `||` not `??`: when these are sourced from a pulled Vercel env they
// arrive as empty strings (not undefined), and `??` would keep the empty
// value — crashing the S3 client ("Region is missing") or pointing at an
// empty bucket. `||` falls back through to the defaults the API routes use.
const REGION = process.env.BIBLE_S3_REGION || process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.BIBLE_S3_BUCKET || "theosis-content";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

// Bibles included: the bible chapter API route is S3-first (key
// bibles/<tr>/<book>/<ch>.json), so verse content edits must be pushed to R2
// or they never reach the app. (The bible CATALOG route stays local-first by
// design, so this never overrides fresh local translation listings.)
const SYNC_TARGETS: Array<{ localDir: string; s3Prefix: string }> = [
  { localDir: "content/normalized/bibles", s3Prefix: "bibles" },
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
  // Cloudflare R2 rejects requests that carry more than one checksum. Newer
  // AWS SDK v3 versions add a default CRC32 checksum to every PutObject via
  // the flexible-checksums middleware; combined with our explicit
  // Content-MD5 header that yields R2's "You can only specify one non-default
  // checksum at a time" (HTTP 400) and every upload fails. WHEN_REQUIRED
  // stops the SDK from adding its own checksum unless the operation demands
  // one, leaving Content-MD5 as the sole integrity check.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
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

type TargetPlan = {
  localDir: string;
  s3Prefix: string;
  jobs: UploadJob[];
  localCount: number;
  remoteCount: number;
  newCount: number;
  changedCount: number;
  skipped: number;
};

// Overwriting more than this many EXISTING R2 objects under a single prefix in
// one run is treated as a likely downgrade (the tree was rebuilt from a stale
// state, or R2 was updated elsewhere and this checkout is behind). New uploads
// — content R2 doesn't have yet — never count against this and are always safe.
const MAX_SAFE_OVERWRITES = 500;

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

async function planTarget(
  localDir: string,
  s3Prefix: string,
): Promise<TargetPlan | null> {
  const absDir = join(process.cwd(), localDir);
  if (!existsSync(absDir)) {
    console.log(`[push] ${localDir} does not exist; skipping`);
    return null;
  }

  let remote: Map<string, string>;
  if (DRY_RUN) {
    // Skip the network round-trip in dry-run mode so the script also works
    // offline / without credentials.
    remote = new Map();
    console.log(
      `[push] ${localDir}: (dry-run) skipping S3 listing; treating bucket as empty`,
    );
  } else {
    remote = await listBucketByPrefix(s3Prefix);
  }

  const files = walk(absDir).sort();

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

  const changedCount = jobs.filter((j) => j.reason === "changed").length;
  return {
    localDir,
    s3Prefix,
    jobs,
    localCount: files.length,
    remoteCount: remote.size,
    newCount: jobs.length - changedCount,
    changedCount,
    skipped,
  };
}

async function executePlan(plan: TargetPlan): Promise<void> {
  const { jobs, localDir, s3Prefix } = plan;
  console.log(`[push] ${localDir} → s3://${BUCKET}/${s3Prefix}/`);
  if (jobs.length === 0) {
    console.log(`[push]   nothing to upload (${plan.skipped} unchanged)`);
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
    `[push]   done: ${uploaded} uploaded, ${plan.skipped} unchanged, ${failed} failed`,
  );
}

async function main() {
  console.log(`[push] target: s3://${BUCKET}/  (region ${REGION})`);
  if (DRY_RUN) console.log("[push] DRY RUN — no uploads will happen");
  if (FORCE) console.log("[push] --force: downgrade guard disabled");

  // Plan every target first (list remote + diff local) so the downgrade guard
  // can veto the WHOLE run before a single object is overwritten — rather than
  // discovering the problem only after the first prefix has been clobbered.
  const plans: TargetPlan[] = [];
  for (const target of SYNC_TARGETS) {
    const plan = await planTarget(target.localDir, target.s3Prefix);
    if (plan) plans.push(plan);
  }

  for (const plan of plans) {
    console.log(
      `[push] plan ${plan.s3Prefix}/: local ${plan.localCount} files, remote ${plan.remoteCount} objects — ${plan.newCount} new, ${plan.changedCount} overwrite, ${plan.skipped} unchanged`,
    );
  }

  if (DRY_RUN) {
    for (const plan of plans) {
      for (const job of plan.jobs.slice(0, 10)) {
        console.log(`[push]   ${job.reason.padEnd(7)} ${job.key}`);
      }
      if (plan.jobs.length > 10) {
        console.log(
          `[push]   ... (+${plan.jobs.length - 10} more under ${plan.s3Prefix}/)`,
        );
      }
    }
    return;
  }

  // ── Downgrade guard ──────────────────────────────────────────────────────
  // The documented footgun: pushing from a stale/committed checkout when R2 is
  // AHEAD overwrites good live content with old content. A push that only ADDS
  // new objects is always safe; the danger is OVERWRITING many existing ones.
  // So veto a run that would overwrite more than MAX_SAFE_OVERWRITES objects in
  // any prefix unless --force. Normal incremental updates (a handful of changed
  // files) pass straight through; a "rebuilt-the-world-from-stale" mass
  // overwrite is stopped. Pair with --dry-run to inspect first.
  if (!FORCE) {
    const suspects = plans.filter((p) => p.changedCount > MAX_SAFE_OVERWRITES);
    if (suspects.length > 0) {
      console.error("");
      console.error(
        "[push] ABORTING — this push would overwrite a large amount of EXISTING content on R2,",
      );
      console.error(
        "       which is how a stale checkout silently downgrades the live app:",
      );
      for (const p of suspects) {
        console.error(
          `  • ${p.s3Prefix}/: ${p.changedCount} existing objects would be overwritten (limit ${MAX_SAFE_OVERWRITES})`,
        );
      }
      console.error("");
      console.error(
        "  R2 is the source of truth the app reads. If R2 was updated from another checkout and",
      );
      console.error(
        "  this local tree is older, pushing now replaces fresh content with stale content.",
      );
      console.error("");
      console.error("  Inspect exactly what would change first:");
      console.error("      npm run push:commentary:s3 -- --dry-run");
      console.error(
        "  If you are certain this local tree is authoritative, re-run with --force:",
      );
      console.error("      npm run push:commentary:s3 -- --force");
      console.error("");
      process.exit(1);
    }
  }

  for (const plan of plans) {
    await executePlan(plan);
  }
}

main().catch((error) => {
  console.error("[push] fatal:", error);
  process.exit(1);
});
