import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
    // Suppress "overly broad pattern" warnings from the content readers. Each
    // listed file constructs paths like `path.join(process.cwd(),
    // "content/normalized/...")`, which Turbopack flags because the literal
    // directory holds tens of thousands of files. The actual deploy bundle is
    // correct — outputFileTracingExcludes below strips those trees and
    // outputFileTracingIncludes re-adds only the catalog files each route
    // needs. The warnings are static-analysis noise on top of an explicit
    // trace config; silence them at the source.
    ignoreIssue: [
      { path: "**/src/lib/bible/server-store.ts" },
      { path: "**/src/lib/content/commentary-loader.ts" },
      { path: "**/src/app/api/bible/catalog/route.ts" },
      { path: "**/src/app/api/commentary/by-verse/**/route.ts" },
      { path: "**/src/app/api/library/by-work/**/route.ts" },
    ],
  },
  // Drizzle's native pg bindings don't tree-shake cleanly in the serverless
  // bundle; mark it external so Next.js doesn't try to inline it.
  serverExternalPackages: ["drizzle-orm"],
  // Vercel serverless functions only bundle files Next.js can statically
  // trace. Many routes read JSON via dynamic `path.join(process.cwd(), ...)`
  // calls — those don't get traced automatically, so without this declaration
  // content silently disappears from production after deploy even though it's
  // committed to the repo.
  //
  // The big trees (bibles, commentary by-verse, commentary by-chapter,
  // library by-work) are served out of R2 now — Vercel's 250 MB per-function
  // unzipped cap can't fit the >250 MB commentary by-verse tree. The local-
  // file fallback in each route handler is kept as a dev convenience; the
  // tracing entries below are only the small files the runtime still needs.
  // The Next.js tracer follows the dynamic `path.join(COMMENTARY_DIR, ...)`
  // and `path.join(LIBRARY_DIR, "by-work", workId, ...)` calls in
  // src/lib/content/commentary-loader.ts and includes every JSON under those
  // base dirs (~210 MB commentary + ~184 MB library = 400+ MB per function).
  // 9 functions blow past Vercel's 250 MB cap. Block the trace globally —
  // the data lives in R2 now, and per-route `outputFileTracingIncludes`
  // below re-adds the smaller catalog files those routes still need.
  outputFileTracingExcludes: {
    "*": [
      "./content/normalized/commentary/by-verse/**/*",
      "./content/normalized/commentary/by-chapter/**/*",
      "./content/normalized/library/by-work/**/*",
    ],
    // /dev/icons is an internal admin tool that fs.readdir's public/icons
    // to list every saint icon. Next traces those JPGs into the function
    // bundle (~270 MB). The dev tool doesn't ship for end users — strip the
    // files from the bundle. Pages still build; runtime listing falls
    // through to an empty array in production, which is fine.
    "/dev/icons": ["./public/icons/**/*"],
    "/dev/icons/replace": ["./public/icons/**/*"],
  },
  outputFileTracingIncludes: {
    "/api/bible/catalog": ["./content/normalized/bibles/catalog.json"],
    "/api/bible/[translation]/[book]/[chapter]": [
      "./content/normalized/bibles/**/*.json",
    ],
    "/api/commentary/catalog": [
      "./content/normalized/commentary/catalog.json",
    ],
    "/api/library/catalog": [
      "./content/normalized/library/catalog.json",
    ],
    // /api/daily, /api/menaion/* and any hymn/lectionary route hits
    // src/lib/calendar/data.ts which reads four JSON files in this dir.
    "/api/daily": [
      "./content/normalized/calendar/**/*.json",
      "./content/normalized/icons/catalog.json",
      "./content/normalized/media/catalog.json",
    ],
    "/api/calendar/menaion-month/[month]": [
      "./content/normalized/calendar/**/*.json",
      "./content/normalized/icons/catalog.json",
    ],
    "/api/library/by-work/[work]/chapters": [
      "./content/normalized/library/catalog.json",
    ],
    // Parish routes read out of content/normalized/parishes via
    // src/lib/parishes/store.ts.
    "/api/parishes/near": ["./content/normalized/parishes/**/*.json"],
    "/api/parishes/[state]/[slug]": [
      "./content/normalized/parishes/**/*.json",
    ],
    // Library/topic/guide routes read the icon catalog for portrait refs.
    "/api/library/people": ["./content/normalized/icons/catalog.json"],
    "/api/topics/[slug]": ["./content/normalized/icons/catalog.json"],
    "/api/guides/[slug]": ["./content/normalized/icons/catalog.json"],
  },
};

export default nextConfig;
