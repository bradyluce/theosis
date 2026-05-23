import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PDFParse } from "pdf-parse";

export type PdfSurveyStats = {
  slug: string;
  sourcePdf: string;
  byteSize: number;
  numPages: number;
  totalChars: number;
  charsPerPage: number;
  nonPrintableRatio: number; // 0..1 ratio of weird chars in extracted text
  blankPageRatio: number; // 0..1 ratio of pages with <50 chars
  classification: "text-layer-good" | "text-layer-sparse" | "scanned-likely-ocr";
};

function classify(stats: {
  charsPerPage: number;
  nonPrintableRatio: number;
  blankPageRatio: number;
}): PdfSurveyStats["classification"] {
  if (stats.charsPerPage < 80 || stats.blankPageRatio > 0.5) {
    return "scanned-likely-ocr";
  }
  if (stats.charsPerPage < 600 || stats.nonPrintableRatio > 0.05) {
    return "text-layer-sparse";
  }
  return "text-layer-good";
}

function countNonPrintable(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    // Allow tab/newline/CR + printable ASCII + extended Unicode letters/marks.
    if (code === 9 || code === 10 || code === 13) continue;
    if (code >= 32 && code <= 126) continue;
    if (code >= 0xa0 && code < 0xd800) continue;
    if (code >= 0xe000 && code < 0xfffd) continue;
    count += 1;
  }
  return count;
}

// Extracts text from a PDF and writes a structured dump.
// Output layout under outDir:
//   extracted.txt       — full document text, page-break-separated by \f
//   pages.json          — per-page char counts and the first ~80 chars (for inspection)
export async function extractPdf(args: {
  slug: string;
  sourcePdf: string;
  outDir: string;
}): Promise<PdfSurveyStats> {
  const buf = readFileSync(args.sourcePdf);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText();
  const pages = result.pages.map((p) => p.text ?? "");
  const numpages = result.total ?? pages.length;

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

  const totalChars = fullText.length;
  const charsPerPage = numpages > 0 ? totalChars / numpages : 0;
  const nonPrintable = countNonPrintable(fullText);
  const nonPrintableRatio = totalChars > 0 ? nonPrintable / totalChars : 0;
  const blankPages = pages.filter((p) => p.length < 50).length;
  const blankPageRatio = pages.length > 0 ? blankPages / pages.length : 0;

  const classification = classify({ charsPerPage, nonPrintableRatio, blankPageRatio });

  return {
    slug: args.slug,
    sourcePdf: args.sourcePdf,
    byteSize: buf.length,
    numPages: numpages,
    totalChars,
    charsPerPage: Math.round(charsPerPage),
    nonPrintableRatio: Number(nonPrintableRatio.toFixed(4)),
    blankPageRatio: Number(blankPageRatio.toFixed(3)),
    classification,
  };
}

// Survey CLI: extract every PDF under content/acquisition/ to content/raw/library/<slug>/.
const ACQUISITION_DIR = join(process.cwd(), "content/acquisition");
const LIBRARY_RAW_DIR = join(process.cwd(), "content/raw/library");

// Stable slugs — author/work-style, kebab-case. Other metadata (full title,
// edition, year, license note) is written into PROVENANCE.json per-folder.
const PDF_SLUG_MAP: Array<{
  pdf: string;
  slug: string;
}> = [
  { pdf: "658857686-wounded-by-love.pdf", slug: "porphyrios-wounded-by-love" },
  {
    pdf: "755346700-Thinking-Orthodox-Understanding-and-Acquiring-the-Orthodox-Constantinou.pdf",
    slug: "constantinou-thinking-orthodox",
  },
  { pdf: "958826734-Beginning-to-Pray-Anthony-Bloom.pdf", slug: "bloom-beginning-to-pray" },
  { pdf: "DesertFathers.pdf", slug: "desert-fathers-sayings" },
  { pdf: "Fr. Seraphim Rose - The Soul After Death - 2009.pdf", slug: "rose-soul-after-death" },
  { pdf: "Orthodox-Confession-of-Faith-Mogilas.pdf", slug: "mogilas-orthodox-confession" },
  { pdf: "Philokalia.pdf", slug: "philokalia" },
  { pdf: "The-Way-of-a-Pilgrim.pdf", slug: "way-of-a-pilgrim" },
  { pdf: "TheLadderofDivineAscent.pdf", slug: "climacus-ladder" },
  {
    pdf: "orthodoxy-and-the-religion-of-the-future.pdf",
    slug: "rose-religion-of-the-future",
  },
  {
    pdf: "pdfcoffee.com-spiritual-awakening-elder-paisios-pdf.pdf",
    slug: "paisios-spiritual-awakening",
  },
  { pdf: "schmemann1973_forthelifeoftheworld.pdf", slug: "schmemann-for-the-life-of-the-world" },
  { pdf: "unseen-warfare.pdf", slug: "unseen-warfare" },
];

async function runSurvey(): Promise<void> {
  const results: PdfSurveyStats[] = [];
  for (const { pdf, slug } of PDF_SLUG_MAP) {
    const sourcePdf = join(ACQUISITION_DIR, pdf);
    if (!existsSync(sourcePdf)) {
      console.warn(`[skip] ${pdf} not found in content/acquisition/`);
      continue;
    }
    const outDir = join(LIBRARY_RAW_DIR, slug);
    console.log(`[extract] ${pdf} → content/raw/library/${slug}/`);
    try {
      const stats = await extractPdf({ slug, sourcePdf, outDir });
      console.log(
        `  ${stats.numPages}p, ${stats.totalChars} chars (${stats.charsPerPage}/page), ` +
          `nonPrintable=${stats.nonPrintableRatio}, blanks=${stats.blankPageRatio}, ` +
          `→ ${stats.classification}`,
      );
      results.push(stats);
    } catch (err) {
      console.error(`  FAILED: ${(err as Error).message}`);
    }
  }
  const surveyPath = join(LIBRARY_RAW_DIR, "_survey.json");
  mkdirSync(dirname(surveyPath), { recursive: true });
  writeFileSync(surveyPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(`\n[done] Wrote survey to ${surveyPath}`);
}

// IMPORTANT: do NOT add an auto-run line here. This file is import-only.
// To run the bulk survey across content/acquisition/, invoke survey-all.ts.
// To extract a single book by slug, invoke extract-one.ts <slug>.
// (A previous auto-run gate triggered re-extraction during library-module
//  imports, which destroyed the OCR-derived extracted.txt for the two
//  scanned PDFs whose text layer is empty.)
export { runSurvey };
