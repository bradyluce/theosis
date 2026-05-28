import "server-only";

// In-memory per-IP rate limiter. Each Vercel function instance holds its
// own bucket map; a determined attacker can defeat this by hitting cold
// instances or by using many IPs. It's intentionally simple — we just
// want to slow down accidental abuse and casual scraping of the
// expensive endpoints (geocode burns Nominatim's policy ceiling;
// /api/search rebuilds the fuse.js index on cold start).
//
// For a distributed limiter, swap this out for @upstash/ratelimit
// (Redis-backed) when traffic warrants it.

type Bucket = {
  // Sliding window — array of timestamps for hits in the last `windowMs`.
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - options.windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  // Prune expired hits
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  if (bucket.hits.length >= options.limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      resetAt: oldest + options.windowMs,
    };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    ok: true,
    remaining: options.limit - bucket.hits.length,
    resetAt: now + options.windowMs,
  };
}

// Extract the requesting IP, preferring Vercel's `x-vercel-forwarded-for`
// (set by the edge proxy) over the standard `x-forwarded-for` (which
// trusts whatever the upstream sent). Falls back to the raw socket
// address when neither header is present (local dev). Never blocks
// requests with an unidentifiable IP — better to over-allow than to
// false-positive-block real users behind weird CDNs.
export function getClientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]?.trim() ?? "unknown";
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return "unknown";
}
