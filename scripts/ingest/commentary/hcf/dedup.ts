// Cross-corpus fuzzy de-duplication for commentary entries.
//
// Motivation: when the same Father's same comment on the same verse is
// ingested from multiple sources (e.g. existing Catena Aurea parser via
// Newman 1841 + HCF's "Catena Aurea by Aquinas" entries via the same
// Newman translation), the resulting verse page shows two near-identical
// paragraphs. This sweep collapses such duplicates.
//
// Strategy:
// 1. Block by (personId, target). Only entries on the same target by the
//    same author can be duplicates — bypasses O(n^2) over the full set.
// 2. Within block: sort by preference (existing curated > HCF, longer
//    excerpt > shorter, earlier ingest > later). Walk the sorted list,
//    keeping any entry whose 5-word shingles have Jaccard < threshold
//    with all kept entries. Folder dropped entries' IDs/sources into the
//    kept entry's provenance + alternateIds.
//
// Threshold 0.75 on 5-word shingles handles NPNF vs Schaff vs Newman vs
// modern paraphrase variance without collapsing genuinely distinct
// comments on the same verse.

import type { CommentaryEntry } from "@theosis/core";

const DEFAULT_THRESHOLD = 0.75;
const SHINGLE_SIZE = 5;
// When the smaller of two shingle sets is mostly inside the larger
// (containment >= this), treat as a dup regardless of Jaccard. Catches
// the common HCF case where two entries are the same comment but one
// has additional sentences appended — Jaccard underestimates because of
// the size asymmetry; containment doesn't.
const CONTAINMENT_THRESHOLD = 0.85;

export type DedupOptions = {
  threshold?: number;
  // Function that returns a comparable preference score for an entry
  // within a block. Lower = preferred (kept first). The default scorer
  // implements the user's choice: "existing curated wins".
  preferenceScore?: (entry: CommentaryEntry) => number;
};

export type DedupReport = {
  blocksConsidered: number;
  blocksWithDuplicates: number;
  entriesBefore: number;
  entriesAfter: number;
  duplicatesMerged: number;
  // Sampled examples (kept entry id, dropped entry id, jaccard) — handy
  // for spot-checking the threshold.
  samples: Array<{ keptId: string; droppedId: string; jaccard: number }>;
};

// HCF entries are tagged with personIds prefixed "hcf-" for unmapped
// authors, OR with ID prefixes "hcf:" for the entry IDs themselves. The
// preference scorer uses the entry ID prefix as the cleanest signal —
// any HCF-origin entry has id starting "hcf:".
function isHcfOrigin(entry: CommentaryEntry): boolean {
  return entry.id.startsWith("hcf:") || entry.sourceId.startsWith("hcf:");
}

function defaultPreferenceScore(entry: CommentaryEntry): number {
  // Lower is preferred. HCF entries lose ties to existing-curated.
  return isHcfOrigin(entry) ? 1 : 0;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    // Strip a leading parenthetical (citation, verse marker, or work
    // ref) before tokenising. HCF often prefixes entries with markers
    // like "(De Civ. Dei, xix. 1.)" or "(Verse 3.)" that shift shingle
    // positions and tank Jaccard against the same comment without the
    // prefix. Only one leading parens — keep inline ones intact.
    .replace(/^\s*\([^)]*\)\s*/, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Containment: how much of `small` is found inside `large`. 1.0 means
// every shingle in `small` is also in `large`. Asymmetric — useful when
// one excerpt is a strict (or near-strict) superset of the other.
function containment(small: Set<string>, large: Set<string>): number {
  if (small.size === 0) return 0;
  let intersection = 0;
  for (const item of small) {
    if (large.has(item)) intersection++;
  }
  return intersection / small.size;
}

function buildShingles(text: string, k = SHINGLE_SIZE): Set<string> {
  const tokens = text.split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  if (tokens.length < k) {
    // Short text: use single tokens so the comparison still has signal.
    for (const t of tokens) out.add(t);
    return out;
  }
  for (let i = 0; i <= tokens.length - k; i++) {
    out.add(tokens.slice(i, i + k).join(" "));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  // Iterate the smaller set for efficiency.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of small) {
    if (large.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function blockKey(entry: CommentaryEntry): string {
  const target = entry.targetVerseId ?? entry.targetChapterId ?? "no-target";
  return `${entry.personId}|${target}`;
}

function uniq<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

export function dedupeEntries(
  entries: CommentaryEntry[],
  options: DedupOptions = {},
): { kept: CommentaryEntry[]; report: DedupReport } {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const score = options.preferenceScore ?? defaultPreferenceScore;

  const blocks = new Map<string, CommentaryEntry[]>();
  for (const entry of entries) {
    const key = blockKey(entry);
    const list = blocks.get(key);
    if (list) list.push(entry);
    else blocks.set(key, [entry]);
  }

  const report: DedupReport = {
    blocksConsidered: 0,
    blocksWithDuplicates: 0,
    entriesBefore: entries.length,
    entriesAfter: 0,
    duplicatesMerged: 0,
    samples: [],
  };

  const kept: CommentaryEntry[] = [];

  for (const block of blocks.values()) {
    report.blocksConsidered++;
    if (block.length === 1) {
      kept.push(block[0]);
      continue;
    }

    // Sort: preference score asc, then excerpt length desc, then stable.
    const sorted = block
      .map((entry, ingestOrder) => ({ entry, ingestOrder }))
      .sort((a, b) => {
        const sa = score(a.entry);
        const sb = score(b.entry);
        if (sa !== sb) return sa - sb;
        const la = a.entry.excerpt.length;
        const lb = b.entry.excerpt.length;
        if (la !== lb) return lb - la;
        return a.ingestOrder - b.ingestOrder;
      });

    const localKept: { entry: CommentaryEntry; shingles: Set<string> }[] = [];
    let foundDup = false;
    for (const { entry } of sorted) {
      const shingles = buildShingles(normalizeText(entry.excerpt));
      let merged = false;
      for (const k of localKept) {
        const j = jaccard(k.shingles, shingles);
        const [small, large] = k.shingles.size <= shingles.size
          ? [k.shingles, shingles]
          : [shingles, k.shingles];
        const cont = containment(small, large);
        // Translation-pair signal: two HCF entries on the same target
        // sharing the same workId (post-canonicalization) but with
        // different sourceIds MAY be parallel translations of the same
        // passage. But this is only true when their prose actually
        // overlaps — without the Jaccard guard the rule swept up entire
        // distinct paragraphs (e.g. different homilies of Augustine on
        // 1 John 4:3 that share workId+target but are different
        // content, Jaccard 0.16). Require at least moderate overlap.
        const TRANSLATION_PAIR_JACCARD = 0.35;
        const sameHcfWorkDifferentSource =
          isHcfOrigin(entry) &&
          isHcfOrigin(k.entry) &&
          entry.workId === k.entry.workId &&
          entry.sourceId !== k.entry.sourceId &&
          j >= TRANSLATION_PAIR_JACCARD;
        // Any signal alone is enough: high Jaccard, near-containment, or
        // the translation-pair pattern.
        if (
          j >= threshold ||
          (small.size >= SHINGLE_SIZE && cont >= CONTAINMENT_THRESHOLD) ||
          sameHcfWorkDifferentSource
        ) {
          // Fold this entry into the kept one.
          k.entry.provenance = uniq([
            ...(k.entry.provenance ?? [k.entry.sourceId]),
            entry.sourceId,
          ]);
          k.entry.alternateIds = uniq([
            ...(k.entry.alternateIds ?? []),
            entry.id,
          ]);
          report.duplicatesMerged++;
          if (report.samples.length < 20) {
            report.samples.push({
              keptId: k.entry.id,
              droppedId: entry.id,
              jaccard: j,
            });
          }
          merged = true;
          foundDup = true;
          break;
        }
      }
      if (!merged) localKept.push({ entry, shingles });
    }

    if (foundDup) report.blocksWithDuplicates++;
    for (const k of localKept) kept.push(k.entry);
  }

  report.entriesAfter = kept.length;
  return { kept, report };
}
