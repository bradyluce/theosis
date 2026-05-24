import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFParse } from "pdf-parse";
import { createWorker, type Worker } from "tesseract.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

// Re-OCR a 2-column scanned book with explicit column splitting. Default
// tesseract PSM 3 reads row-by-row across both columns and interleaves
// the text; we instead split each rendered page image vertically into
// left/right halves and OCR each half separately, then concat (left, right).
//
// Usage: tsx ocr-moschos.ts [slug ...]
// Defaults to moschos-spiritual-meadow when no slug given.

const LIBRARY_DIR = join(process.cwd(), "content/raw/library");
const CLI_SLUGS = process.argv.slice(2);
const SLUGS = CLI_SLUGS.length > 0 ? CLI_SLUGS : ["moschos-spiritual-meadow"];

async function splitPageColumns(pngBytes: Uint8Array): Promise<{ left: Buffer; right: Buffer }> {
  const img = await loadImage(Buffer.from(pngBytes));
  const w = img.width;
  const h = img.height;
  // Overlap by ~3% to avoid losing text on the seam.
  const overlap = Math.floor(w * 0.03);
  const halfW = Math.floor(w / 2);

  const leftCanvas = createCanvas(halfW + overlap, h);
  const leftCtx = leftCanvas.getContext("2d");
  leftCtx.drawImage(img, 0, 0, halfW + overlap, h, 0, 0, halfW + overlap, h);
  const left = leftCanvas.toBuffer("image/png");

  const rightCanvas = createCanvas(w - halfW + overlap, h);
  const rightCtx = rightCanvas.getContext("2d");
  rightCtx.drawImage(
    img,
    halfW - overlap,
    0,
    w - halfW + overlap,
    h,
    0,
    0,
    w - halfW + overlap,
    h,
  );
  const right = rightCanvas.toBuffer("image/png");

  return { left, right };
}

async function ocrColumnSplit(
  worker: Worker,
  args: { slug: string; sourcePdf: string; outDir: string },
): Promise<{ slug: string; numPages: number; totalChars: number }> {
  const buf = readFileSync(args.sourcePdf);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
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
    const { left, right } = await splitPageColumns(pg.data);
    const lr = await worker.recognize(left);
    const rr = await worker.recognize(right);
    const text = `${lr.data.text.trim()}\n\n${rr.data.text.trim()}`;
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
  // Each half-page is a single column → PSM 4 (single column of variable
  // sizes) is the right choice.
  await worker.setParameters({
    tessedit_pageseg_mode: "4" as never,
  });
  try {
    for (const slug of SLUGS) {
      const sourcePdf = join(LIBRARY_DIR, slug, "source.pdf");
      if (!existsSync(sourcePdf)) {
        console.warn(`[skip] ${sourcePdf} not found`);
        continue;
      }
      const outDir = join(LIBRARY_DIR, slug);
      console.log(`[ocr-column-split] ${slug}`);
      const start = Date.now();
      const stats = await ocrColumnSplit(worker, { slug, sourcePdf, outDir });
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
