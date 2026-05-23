import { join } from "node:path";
import { extractPdf } from "./extract-pdf";

// One-shot extraction for newly-acquired PDFs that already live under
// content/raw/library/<slug>/source.pdf. Useful when a single book needs to
// be re-extracted (e.g., after a tighter chrome-detection regex landed) or
// when adding new books outside the bulk content/acquisition/ flow.
const TARGETS = process.argv.slice(2);
if (TARGETS.length === 0) {
  console.error("usage: tsx extract-one.ts <slug> [<slug> ...]");
  process.exit(1);
}

async function main() {
  const LIB = join(process.cwd(), "content/raw/library");
  for (const slug of TARGETS) {
    const sourcePdf = join(LIB, slug, "source.pdf");
    const outDir = join(LIB, slug);
    console.log(`[extract] ${slug}`);
    const stats = await extractPdf({ slug, sourcePdf, outDir });
    console.log(
      `  ${stats.numPages}p · ${stats.totalChars} chars · ${stats.charsPerPage}/page · ${stats.classification}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
