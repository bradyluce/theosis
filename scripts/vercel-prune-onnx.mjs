// Build-time prune of onnxruntime-node's native binaries.
//
// onnxruntime-node ships prebuilt binaries for EVERY platform (darwin, linux
// x64/arm64, win32 x64/arm64 — ~335 MB on Vercel). Because the package is a
// serverExternalPackage, Next copies the whole thing into each function that
// imports it, blowing past Vercel's 250 MB unzipped function cap for
// /api/search/fathers. outputFileTracingExcludes can't help (it only trims
// *traced* files, not externalized packages).
//
// Vercel Functions run on Amazon Linux (glibc) x64, so only
// bin/napi-v6/linux/x64 is ever loaded. This script deletes the rest. It runs
// in the `build` script BEFORE `next build` (so the trimmed package is what
// gets copied), and is a no-op anywhere but Vercel — local installs keep their
// own platform binary (e.g. win32) so `npm run embed:content` still works.

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

if (!process.env.VERCEL) {
  // Local / non-Vercel: leave node_modules untouched.
  process.exit(0);
}

const ROOT = "node_modules/onnxruntime-node/bin/napi-v6";
if (!existsSync(ROOT)) {
  console.log("[prune-onnx] no onnxruntime-node binaries found; nothing to do");
  process.exit(0);
}

let removed = 0;
for (const platform of readdirSync(ROOT)) {
  const platformDir = join(ROOT, platform);
  if (!statSync(platformDir).isDirectory()) continue;

  if (platform !== "linux") {
    rmSync(platformDir, { recursive: true, force: true });
    console.log(`[prune-onnx] removed ${platformDir}`);
    removed++;
    continue;
  }

  // Within linux, keep only x64 (Vercel is x64; drop arm64).
  for (const arch of readdirSync(platformDir)) {
    if (arch !== "x64") {
      rmSync(join(platformDir, arch), { recursive: true, force: true });
      console.log(`[prune-onnx] removed ${join(platformDir, arch)}`);
      removed++;
    }
  }
}

console.log(`[prune-onnx] kept linux/x64 only — removed ${removed} other target(s)`);
