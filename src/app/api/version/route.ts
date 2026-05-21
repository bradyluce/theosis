import { NextResponse } from "next/server";

// Lightweight ping endpoint. Mobile clients hit this periodically to detect
// new deploys without fetching the full catalog. Compare the returned commit
// against the last-seen value — if it changed, fetch fresh catalogs.
//
// Note: this reflects the deployment, not the content. If you push to S3
// without redeploying (e.g. via `npm run push:commentary:s3`), the commit
// here won't change but the underlying content might. For v1 this trade-off
// is acceptable: redeploys are cheap on Vercel, and out-of-band S3 pushes
// are rare. If they become common, add a content-version field that reads
// catalog.json's mtime or a hash.

// 1 min fresh, 5 min stale-while-revalidate. Short enough that clients see
// new deploys within a minute, long enough to absorb traffic spikes.
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

export async function GET() {
  return NextResponse.json(
    {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
      environment:
        process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    },
    {
      headers: { "Cache-Control": CACHE_CONTROL },
    },
  );
}
