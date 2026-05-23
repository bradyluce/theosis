// CLI entry for the bulk survey workflow: iterates every PDF listed in the
// extract-pdf.ts JOBS table, extracts text, writes per-book extracted.txt +
// pages.json under content/raw/library/<slug>/, and emits a survey JSON.
//
// Use only when adding many PDFs at once. For single-book re-extraction use
// extract-one.ts <slug>.
import { runSurvey } from "./extract-pdf";

runSurvey().catch((err) => {
  console.error(err);
  process.exit(1);
});
