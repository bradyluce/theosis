// Download a batch of icon files referenced in a manifest JSON (the format
// produced by the user's curation pass: tier/feast_date/slug/label/save_as/
// commons_file/filepath_url). Each file lands in content/normalized/icons/
// with the save_as filename, ready for import-local-icons.ts to normalize.
//
// Usage:
//   npx tsx scripts/ingest/icons/download-from-manifest.ts <path-to-manifest.json>
//
// Or with a default location:
//   npx tsx scripts/ingest/icons/download-from-manifest.ts

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const DEFAULT_OUT = path.join(REPO_ROOT, "content/normalized/icons");
const USER_AGENT = "TheosisIconIngest/0.1 (https://github.com/theosis-app)";

type ManifestEntry = {
  tier: number;
  feast_date: string;
  slug: string;
  label: string;
  save_as: string;
  license: string;
  commons_file: string;
  filepath_url: string;
  file_page_url: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Tell HTML responses (Commons error / disambig pages) from real images by
// peeking the first few bytes. Real images have known magic numbers.
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return true;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return true;
  return false;
}

async function downloadWithRetry(url: string, destPath: string): Promise<void> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(2000 * attempt);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) {
      lastErr = new Error(`HTTP ${res.status}`);
      if (res.status !== 429 && res.status < 500) break;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!looksLikeImage(buf)) {
      lastErr = new Error(`Response not an image (got ${buf.length} bytes, header doesn't match)`);
      break;
    }
    fs.writeFileSync(destPath, buf);
    return;
  }
  throw lastErr ?? new Error("Download failed");
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error("Usage: download-from-manifest.ts <path-to-manifest.json>");
    process.exit(1);
  }
  const raw = fs.readFileSync(manifestPath, "utf8");
  const entries = JSON.parse(raw) as ManifestEntry[];
  const outDir = DEFAULT_OUT;
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Downloading ${entries.length} icons to ${outDir}\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ slug: string; reason: string; pageUrl: string }> = [];

  for (const entry of entries) {
    const destPath = path.join(outDir, entry.save_as);
    process.stdout.write(`  [T${entry.tier}] ${entry.slug.padEnd(45)} ... `);
    if (fs.existsSync(destPath)) {
      console.log("already present, skipping");
      skipped++;
      continue;
    }
    try {
      await downloadWithRetry(entry.filepath_url, destPath);
      console.log("ok");
      ok++;
    } catch (err) {
      const reason = (err as Error).message;
      console.log(`FAIL — ${reason}`);
      failed++;
      failures.push({ slug: entry.slug, reason, pageUrl: entry.file_page_url });
    }
    // Pace requests to upload.wikimedia.org.
    await sleep(800);
  }

  console.log(`\nDone. ${ok} ok, ${skipped} skipped, ${failed} failed.`);
  if (failures.length > 0) {
    console.log("\nFailures (review the Commons page and pick another file):");
    for (const f of failures) {
      console.log(`  ${f.slug}  →  ${f.reason}`);
      console.log(`    ${f.pageUrl}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
