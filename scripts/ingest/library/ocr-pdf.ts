import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFParse } from "pdf-parse";
import { createWorker, type Worker } from "tesseract.js";

// OCR the scanned PDFs flagged by the survey. For each book:
//   1. PDFParse.getScreenshot() → per-page rendered PNG (Uint8Array)
//   2. tesseract.js recognize() → per-page text
//   3. Concatenate + write extracted.txt (overwrites the empty one from the
//      text-layer pass) and pages.json with per-page metadata.

type Job = { slug: string; sourcePdf: string };

const LIBRARY_DIR = join(process.cwd(), "content/raw/library");

const JOBS: Job[] = [
  {
    slug: "porphyrios-wounded-by-love",
    sourcePdf: join(LIBRARY_DIR, "porphyrios-wounded-by-love", "source.pdf"),
  },
  {
    slug: "rose-religion-of-the-future",
    sourcePdf: join(LIBRARY_DIR, "rose-religion-of-the-future", "source.pdf"),
  },
];

async function ocrOnePdf(
  worker: Worker,
  args: { slug: string; sourcePdf: string; outDir: string },
): Promise<{ slug: string; numPages: number; totalChars: number }> {
  const buf = readFileSync(args.sourcePdf);
  // Render every page at ~2x scale (better OCR accuracy on tight type).
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  // getScreenshot returns ScreenshotResult { pages: [{ pageNumber, data, ... }] }
  // imageBuffer:true gives us Uint8Array PNGs.
  const screens = await parser.getScreenshot({
    imageBuffer: true,
    imageDataUrl: false,
    scale: 2,
  });
  const pages: string[] = [];
  for (const pg of screens.pages) {
    const num = pg.pageNumber;
    if (!pg.data) {
      pages.push("");
      console.log(`  [${args.slug}] page ${num}/${screens.total} — no image data`);
      continue;
    }
    // tesseract.js accepts Buffer/Uint8Array.
    const result = await worker.recognize(Buffer.from(pg.data));
    const text = result.data.text.trim();
    pages.push(text);
    if (num % 10 === 0 || num === screens.total) {
      const cumulative = pages.reduce((s, p) => s + p.length, 0);
      console.log(`  [${args.slug}] page ${num}/${screens.total} — ${cumulative} chars cumulative`);
    }
  }
  mkdirSync(args.outDir, { recursive: true });
  const fullText = pages.join("\n\f\n");
  writeFileSync(join(args.outDir, "extracted.txt"), fullText, "utf8");
  const pageSummaries = pages.map((p, idx) => ({
    page: idx + 1,
    chars: p.length,
    head: p.replace(/\s+/g, " ").trim().slice(0, 80),
  }));
  writeFileSync(
    join(args.outDir, "pages.json"),
    `${JSON.stringify(pageSummaries, null, 2)}\n`,
    "utf8",
  );
  return { slug: args.slug, numPages: pages.length, totalChars: fullText.length };
}

async function main(): Promise<void> {
  const worker = await createWorker("eng");
  try {
    for (const job of JOBS) {
      if (!existsSync(job.sourcePdf)) {
        console.warn(`[skip] ${job.sourcePdf} not found`);
        continue;
      }
      const outDir = join(LIBRARY_DIR, job.slug);
      console.log(`[ocr] ${job.slug}`);
      const start = Date.now();
      const stats = await ocrOnePdf(worker, { ...job, outDir });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `  done: ${stats.numPages}p, ${stats.totalChars} chars, ${elapsed}s wall`,
      );
    }
  } finally {
    await worker.terminate();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
