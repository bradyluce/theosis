import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Vercel serverless functions only bundle files Next.js can statically
  // trace. The bible API routes read JSON files via dynamic
  // `path.join(process.cwd(), ...)` calls — those don't get traced
  // automatically, so without this declaration WEB/Vulgate (and the
  // catalog itself) silently disappear from production after deploy even
  // though they're committed to the repo. Explicitly include the entire
  // normalized bibles tree for both routes.
  outputFileTracingIncludes: {
    "/api/bible/catalog": ["./content/normalized/bibles/catalog.json"],
    "/api/bible/[translation]/[book]/[chapter]": [
      "./content/normalized/bibles/**/*.json",
    ],
  },
};

export default nextConfig;
