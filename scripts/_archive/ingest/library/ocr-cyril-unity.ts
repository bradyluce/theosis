import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFParse } from "pdf-parse";
import { createWorker, type Worker } from "tesseract.js";

// Re-OCR Cyril of Alexandria's "On the Unity of Christ" at HIGH ZOOM.
// The previous OCR pass at scale 2 produced unrecoverable garble — the
// source PDF was scanned at a very small page size, so 2× rendering left
// the text at maybe 6-8 pt effective pixel-height, below tesseract's
// reliability floor. Re-rendering at scale 10 brings text to a healthy
// ~30-40 pt and OCR quality should jump dramatically.

const LIBRARY_DIR = join(process.cwd(), "content/raw/library");
const SLUG = "cyril-alexandria-unity-of-christ";

async function ocrHighZoom(
  worker: Worker,
  args: { slug: string; sourcePdf: string; outDir: string },
): Promise<{ slug: string; numPages: number; totalChars: number }> {
  const buf = readFileSync(args.sourcePdf);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const screens = await parser.getScreenshot({
    imageBuffer: true,
    imageDataUrl: false,
    scale: 10, // 5× the default 2× — brings small print into OCR-readable range
  });
  const pages: string[] = [];
  for (const pg of screens.pages) {
    const num = pg.pageNumber;
    if (!pg.data) {
      pages.push("");
      console.log(`  [${args.slug}] page ${num}/${screens.total} — no image data`);
      continue;
    }
    const result = await worker.recognize(Buffer.from(pg.data));
    const text = result.data.text.trim();
    pages.push(text);
    if (num % 10 === 0 || num === screens.total) {
      const cumulative = pages.reduce((s, p) => s + p.length, 0);
      console.log(
        `  [${args.slug}] page ${num}/${screens.total} — ${cumulative} chars cumulative`,
      );
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
  // PSM 4 = single column of text (the SVS Press scholarly edition is
  // single-column). High-zoom doesn't change layout but does help small-text
  // recognition.
  await worker.setParameters({
    tessedit_pageseg_mode: "4" as never,
  });
  try {
    const sourcePdf = join(LIBRARY_DIR, SLUG, "source.pdf");
    if (!existsSync(sourcePdf)) {
      console.warn(`[skip] ${sourcePdf} not found`);
      return;
    }
    const outDir = join(LIBRARY_DIR, SLUG);
    console.log(`[ocr-high-zoom] ${SLUG} @ scale 10`);
    const start = Date.now();
    const stats = await ocrHighZoom(worker, { slug: SLUG, sourcePdf, outDir });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `  done: ${stats.numPages}p, ${stats.totalChars} chars, ${elapsed}s wall`,
    );
  } finally {
    await worker.terminate();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
