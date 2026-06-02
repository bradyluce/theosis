# `scripts/_archive/` — applied one-shot scripts

These scripts were each run **once** to perform a specific migration, data fix, or
acquisition step that has already been applied to the committed content. They are
**not** part of any active pipeline: nothing imports them, and no `package.json`
script references them. They are kept here only as a historical record of how the
content reached its current shape.

> Safe to delete this whole directory at any time — everything is recoverable from
> git history. It lives under `scripts/`, which is excluded from `tsconfig.json`, so
> nothing here is type-checked or built.

## Contents

- **`ingest/commentary/*.js`** — 50 per-book OCR-correction scripts (`fix-*-ocr.js`,
  `clean-ocr-universal.js`, plus `_inspect-*` / `_sample-*` inspection helpers).
  They patched `content/generated/commentary/*.json` (a gitignored, transient tree)
  during initial corpus acquisition. The *correct* long-term home for OCR fixes is
  the relevant `scripts/ingest/commentary/parse-*.ts` parser or
  `scripts/normalize/cleanup-text.ts`, not a re-runnable one-shot.

- **`ingest/*.ts`** — 13 calendar/menaion migrations (`add-fixed-feast-readings-r*`,
  `*-menaion-*`, `mass-fill-fixed-feasts`, `renumber-psalter-to-lxx`, etc.). Each wrote
  directly into `content/normalized/calendar/`. Re-running them could clobber manual
  editorial edits made after they were first applied.

- **`ingest/library/*.ts`** — 6 applied acquisition one-shots (`relocate*`, `ocr-batch2`,
  `ocr-moschos`, `ocr-cyril-unity`, `extract-ephrem-genesis`). The *reusable* library
  acquisition tools (`extract-pdf.ts`, `extract-one.ts`, `survey-all.ts`, `ocr-pdf.ts`,
  `shared.ts`, `philokalia-metadata.ts`) deliberately stayed in `scripts/ingest/library/`.

- **`migrate/**/run.ts`** — the two one-shot migration runners (license-cleanup and
  father-traditions). Their `manifest.ts` / `audit-summaries.ts` were **kept** in
  `scripts/migrate/license-cleanup/` because `normalize-commentary.ts` imports the
  manifest as an ongoing licensing safety net.
