import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommentaryEntry,
  Person,
  SourceRecord,
  Work,
  WorkChapter,
  WorkChapterParagraph,
  WorkChapterSection,
} from "@theosis/core";

// ── Hapgood Service Book (1906) — the three contemporary Divine Liturgies ─────
//
// Source: archive.org DjVu OCR of Isabel F. Hapgood's 1906 "Service Book of the
// Holy Orthodox-Catholic Apostolic (Greco-Russian) Church" (U.S. public domain).
// One ~50k-line plain-text OCR file. We carve out the three liturgies actually
// celebrated today — St. John Chrysostom, St. Basil the Great, and the
// Presanctified Gifts — that the earlier ANF "early liturgies" set (James/Mark/
// Apostles) does not cover.
//
// Two structural facts make this tractable:
//   1. Speaker turns are printed with an inline label at line-start ("Priest
//      Blessed is our God…", "Deacon. O heavenly King…"). We split each into a
//      rubric label paragraph ("<em>Priest.</em>") + the spoken paragraph —
//      structurally identical to the ANF Liturgy of St. James, so the mobile
//      reader's speaker styling (priest bold / deacon italic / people regular /
//      rubric oxblood) renders it with no further change.
//   2. Hapgood prints Chrysostom and Basil as ONE combined text; Basil's few
//      distinct prayers are bracketed inline as "[Or, if the Liturgy of St.
//      Basil the Great be used: …]". We drop those brackets for the Chrysostom
//      work and substitute them in (replacing the preceding prayer) for Basil.
//
// Caveat (see the integration plan): the 1906 page is two-column — the Priest's
// silent prayers are printed beside the Deacon/Choir litanies. The OCR
// linearized that imperfectly, so the repetitive litany sections can show some
// interleaving. The prayers and the Anaphora come through clean. This is
// best-effort cleanup; the SourceRecord note flags it as under editorial review.

type CommentaryBundleV2 = {
  version: "2";
  people: Person[];
  works: Work[];
  sources: SourceRecord[];
  entries: CommentaryEntry[];
  chapters?: WorkChapter[];
};

const OCR_RELATIVE = join(
  "hapgood-service-book",
  "Service_Book_Orthodox_Church_Hapgood_djvu.txt",
);

// Slice anchors — substrings that uniquely mark the boundaries of each rite in
// the linear OCR. Verified against the raw file (lines ~9107 / 14588 / 16658).
const COMBINED_START = "I. THE OFFICE OF OBLATION";
const PRESANCTIFIED_MARKER = "THE PRESANCTIFIED (GIFTS)";
const PRESANCTIFIED_START = /^Deacon\.\s*Bless,?\s*Master/i;
const PRESANCTIFIED_END = "THE OFFICE OF GRAND COMPLINE";

// ── Source + Work catalog ────────────────────────────────────────────────────

const SOURCE: SourceRecord = {
  id: "hapgood-service-book-source",
  label:
    "Service Book of the Holy Orthodox-Catholic Apostolic Church — Isabel F. Hapgood (1906)",
  collection: "Hapgood Service Book (1906)",
  sourceType: "web-collection",
  url: "https://archive.org/details/ServiceBookOfHolyOrthodoxChurchByHapgood",
  note: "Compiled and translated by Isabel Florence Hapgood; published 1906 (Boston/New York: Houghton, Mifflin & Co.) with the blessing of the Most Holy Governing Synod of the Russian Church and Archbishop Tikhon of the Aleutians (later St. Tikhon of Moscow). U.S. public domain (pre-1930, copyright lapsed). Digitized from the archive.org DjVu OCR; text is best-effort cleaned and under editorial review — the 1906 two-column page layout produces some interleaving in the repetitive litany sections.",
  isSeeded: false,
};

type LiturgyDef = {
  slug: string;
  personId: string;
  title: string;
  shortTitle: string;
  eraLabel: string;
  summary: string;
};

const CHRYSOSTOM: LiturgyDef = {
  slug: "liturgy-of-saint-john-chrysostom",
  personId: "john-chrysostom",
  title: "The Divine Liturgy of St. John Chrysostom",
  shortTitle: "Liturgy of St. John Chrysostom",
  eraLabel: "Byzantine · Hapgood 1906 tr.",
  summary:
    "The Eucharistic liturgy served on most Sundays and weekdays of the Orthodox year — the abbreviated form of St. Basil's, traditionally bearing the name of St. John Chrysostom. In three parts: the Office of Oblation (Proskomidia), the Liturgy of the Catechumens, and the Liturgy of the Faithful. Isabel Hapgood's 1906 Russian-tradition English translation.",
};

const BASIL: LiturgyDef = {
  slug: "liturgy-of-saint-basil-the-great",
  personId: "basil-the-great",
  title: "The Divine Liturgy of St. Basil the Great",
  shortTitle: "Liturgy of St. Basil",
  eraLabel: "4th c. · Hapgood 1906 tr.",
  summary:
    "Served ten times a year — the five Sundays of Great Lent, Holy Thursday and Holy Saturday, the eves of Nativity and Theophany, and St. Basil's day (January 1). It shares the shape of the Chrysostom liturgy but its Anaphora and Secret Prayers are longer and more theologically expansive; this text restores those prayers proper to St. Basil. Hapgood's 1906 translation.",
};

const PRESANCTIFIED: LiturgyDef = {
  slug: "liturgy-of-the-presanctified-gifts",
  personId: "gregory-the-great",
  title: "The Liturgy of the Presanctified Gifts",
  shortTitle: "Liturgy of the Presanctified",
  eraLabel: "Lenten · Hapgood 1906 tr.",
  summary:
    "Served on the Wednesdays and Fridays of Great Lent — Vespers joined to Holy Communion from Gifts consecrated at the preceding Sunday's Liturgy, since the full Eucharistic consecration is incompatible with the fast. Traditionally ascribed to St. Gregory the Dialogist of Rome. Hapgood's 1906 translation.",
};

// ── Text helpers ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Collapse whitespace, drop numeric footnote refs like "(17)", tidy spacing
// before punctuation, and remove trailing OCR footnote daggers.
function tidyText(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+[*†]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Join wrapped OCR lines into one paragraph, healing words broken across a line
// end ("compas-" + "sion" → "compassion") while preserving real hyphens.
function cleanJoin(lines: string[]): string {
  let s = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (s === "") {
      s = line;
    } else if (/[-–]$/.test(s) && /^[a-z]/.test(line)) {
      s = `${s.replace(/[-–]\s*$/, "")}${line}`;
    } else {
      s = `${s} ${line}`;
    }
  }
  return tidyText(s);
}

// ── Line classification ──────────────────────────────────────────────────────

// Running page headers, Google footers, bare page numbers, stray gutter
// fragments — the recurring OCR boilerplate to drop.
function isNoise(line: string): boolean {
  if (!line) return true;
  if (/^Digitized by/i.test(line)) return true;
  if (/^\d{0,3}\s*THE DIVINE LITURGY/i.test(line)) return true;
  if (/THE DIVINE LITURGY\s*\d{0,3}\s*$/i.test(line)) return true;
  if (/THE DIVINE LITURGY[- ]+OF THE PRESANCTIFIED/i.test(line)) return true;
  if (/^THE PRESANCTIFIED/i.test(line)) return true;
  if (/^PREFATORY NOTE/i.test(line)) return true;
  if (/^THE LITURGY OF ST\.?\s+(JOHN|BASIL)/i.test(line)) return true;
  if (/^AND$/.test(line)) return true;
  if (/^END\.?$/i.test(line)) return true;
  if (/^\d{1,3}$/.test(line)) return true; // bare page number
  if (/^[a-z]{1,3}$/.test(line)) return true; // OCR'd page-number / gutter junk
  if (line.length <= 2) return true; // stray "r", "us", "f", "J"
  if (/^[*†t]\s+[A-Z]/.test(line)) return true; // footnote line ("* For …")
  return false;
}

// "I. THE OFFICE OF OBLATION" → "The Office of Oblation".
const SMALL_WORDS = new Set(["of", "the", "and", "to", "for", "in", "a", "an"]);
function prettyHeading(line: string): string {
  return line
    .replace(/^[IVXLC]+\.\s*/i, "")
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ")
    .trim();
}

function sectionHeading(line: string): string | null {
  return /^(I|II|III|IV|V)\.\s+THE\s+(OFFICE|LITURGY)\b/i.test(line)
    ? prettyHeading(line)
    : null;
}

// Inline speaker turn: "Priest Blessed is our God…", "Deacon. O heavenly King…",
// "Choir, Lord, have mercy." Excludes "The Priest…" (a rubric, handled below).
const SPEAKERS =
  "Priests?|Deacons?|Sub-?Deacons?|Arch-?deacons?|People|Choir|Chanters?|Readers?|Servers?|Bishops?|Clergy";
const SPEAKER_LINE = new RegExp(`^(${SPEAKERS})[.,;:^]*(?:\\s+(.*))?$`);

function speakerTurn(line: string): { label: string; rest: string } | null {
  const m = line.match(SPEAKER_LINE);
  if (!m) return null;
  return { label: `${m[1]}.`, rest: (m[2] ?? "").trim() };
}

// Stage directions / prayer titles. Italic in print, flattened by OCR; matched
// by template so we don't mistake wrapped prayer text for a rubric.
const RUBRIC_THE =
  /^The (Priests?|Deacons?|Sub-?Deacon|Bishop|Choir|People|Readers?|Clergy|Curtain|Holy Door|Servers?|Prayer|First|Second|Third|Litany|Creed|Cherubic|Cherubimic|Hymn|Antiphon|Gospel|Epistle|Great|Lesser|Little|Dismissal|Benediction|Ekphonesis|Anaphora|Office|Order|Symbol)\b/;
const RUBRIC_OTHER =
  /^(Then|Here|When|While|Whilst|After|Before|Now|Thereafter|Whereupon|Meanwhile|If |At |During)\b/;
const RUBRIC_NAMED =
  /^(Exclamation|Ekphonesis|Prayer of|Litany|Hymn|Antiphon|Troparion|Kontakion|Theme-Song|Irmos|Prokeimenon)\b/i;

function isRubric(line: string): boolean {
  return RUBRIC_THE.test(line) || RUBRIC_OTHER.test(line) || RUBRIC_NAMED.test(line);
}

// Basil-variant bracket: starts with an OCR bracket marker ("[" or a misread
// "\") and names St. Basil; runs until the closing "]".
function isBasilStart(line: string): boolean {
  return /^[[\\]/.test(line) && /Basil/i.test(line);
}

// Strip the bracket markers and the "Or, if the Liturgy of St. Basil … used:"
// editorial preamble, leaving just the Basil prayer text.
function cleanBasil(lines: string[]): string {
  const joined = cleanJoin(lines);
  return joined
    .replace(/^[[\\]\s*/, "")
    .replace(
      /^(or|but|cv|pr|at|if)[,;]?\s*(if\s+)?(the\s+Liturgy\s+o[fp]\s+St\.?\s+Basil[^:;]*[:;]\s*)?/i,
      "",
    )
    .replace(/\]\s*[*†f]?\s*$/, "")
    .trim();
}

// ── Parse one rite's line range into tagged paragraph stream ─────────────────

type Tagged =
  | { kind: "section"; heading: string }
  | { kind: "rubric"; text: string }
  | { kind: "spoken"; text: string }
  | { kind: "basil"; text: string };

// Blank lines in the OCR mark paragraph breaks — group consecutive non-blank
// lines into blocks so distinct prayers and rubrics stay separate (without
// this, everything between two speaker labels merges into one blob).
function splitBlocks(rawLines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const raw of rawLines) {
    if (raw.trim() === "") {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(raw);
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

function keptLines(block: string[]): string[] {
  return block.filter((l) => !isNoise(l.trim()));
}

// A rubric that introduces speech inline ("…and shall kiss it, saying: We do
// homage…") is split at the introducer, so the prayer text after it isn't
// styled as a rubric.
const SPEECH_INTRO =
  /\b(saying|say|saith|exclaimeth|exclaiming|crying|chanting|singing|words following|these words|as followeth)\s*[:;,]\s+/i;
function splitRubricSpeech(joined: string): { rubric: string; spoken?: string } {
  const m = joined.match(SPEECH_INTRO);
  if (m && m.index !== undefined) {
    const cut = m.index + m[0].length;
    const spoken = joined.slice(cut).trim();
    if (spoken.length > 1) {
      const rubric = `${joined.slice(0, cut).trim().replace(/[\s:;,]+$/, "")}:`;
      return { rubric, spoken };
    }
  }
  return { rubric: joined };
}

function parseRite(rawLines: string[]): Tagged[] {
  const out: Tagged[] = [];
  const blocks = splitBlocks(rawLines);

  for (let i = 0; i < blocks.length; i += 1) {
    const kept = keptLines(blocks[i]);
    if (kept.length === 0) continue;
    const first = kept[0].trim();

    // Basil-variant bracket — may run across several blocks until the "]".
    if (isBasilStart(first)) {
      const buf = [...kept];
      let span = 0;
      while (
        i < blocks.length - 1 &&
        !buf.some((l) => l.includes("]")) &&
        span < 8
      ) {
        i += 1;
        span += 1;
        buf.push(...keptLines(blocks[i]));
      }
      const text = cleanBasil(buf);
      if (text) out.push({ kind: "basil", text });
      continue;
    }

    const heading = sectionHeading(first);
    if (heading) {
      out.push({ kind: "section", heading });
      continue;
    }

    // Inline speaker turn → rubric label + spoken body.
    const turn = speakerTurn(first);
    if (turn) {
      out.push({ kind: "rubric", text: turn.label });
      const body = cleanJoin([turn.rest, ...kept.slice(1)]);
      if (body) out.push({ kind: "spoken", text: body });
      continue;
    }

    // Stage direction / prayer title (possibly with inline speech).
    if (isRubric(first)) {
      const { rubric, spoken } = splitRubricSpeech(cleanJoin(kept));
      out.push({ kind: "rubric", text: rubric });
      if (spoken) out.push({ kind: "spoken", text: spoken });
      continue;
    }

    // Plain spoken paragraph.
    const text = cleanJoin(kept);
    if (text) out.push({ kind: "spoken", text });
  }
  return out;
}

// ── Assemble sections for a given liturgy variant ────────────────────────────

type Variant = "chrysostom" | "basil" | "plain";

function rubricParagraph(text: string): WorkChapterParagraph {
  return { text, html: `<em>${escapeHtml(text)}</em>` };
}

function buildSections(tagged: Tagged[], variant: Variant): WorkChapterSection[] {
  const sections: WorkChapterSection[] = [];
  let current: WorkChapterSection = { paragraphs: [] };
  let opened = false;

  const flushSection = () => {
    if (current.paragraphs.length) sections.push(current);
  };

  for (const t of tagged) {
    if (t.kind === "section") {
      flushSection();
      current = { heading: t.heading, paragraphs: [] };
      opened = true;
      continue;
    }
    if (t.kind === "rubric") {
      current.paragraphs.push(rubricParagraph(t.text));
      continue;
    }
    if (t.kind === "spoken") {
      current.paragraphs.push({ text: t.text });
      continue;
    }
    // Basil-variant prayer.
    if (variant === "basil") {
      // Replace the Chrysostom prayer it stands in for: drop the immediately
      // preceding spoken paragraph (never a rubric label).
      const last = current.paragraphs[current.paragraphs.length - 1];
      if (last && !last.html) current.paragraphs.pop();
      current.paragraphs.push({ text: t.text });
    }
    // chrysostom / plain: skip Basil variants entirely.
  }
  flushSection();
  // Guard: if no section headers were seen (Presanctified), `opened` stays
  // false and we still returned the single accumulated section above.
  void opened;
  return sections;
}

// ── Work / chapter builders ──────────────────────────────────────────────────

function buildWork(def: LiturgyDef): Work {
  return {
    id: def.slug,
    slug: def.slug,
    personId: def.personId,
    title: def.title,
    shortTitle: def.shortTitle,
    workType: "treatise",
    lengthLabel: "long",
    eraLabel: def.eraLabel,
    summary: def.summary,
    topicSlugs: [],
    sourceId: SOURCE.id,
    verseRefs: [],
  };
}

function buildChapter(
  def: LiturgyDef,
  sections: WorkChapterSection[],
): WorkChapter {
  return {
    id: `${def.slug}-hapgood`,
    workId: def.slug,
    order: 1,
    label: def.shortTitle,
    title: def.title,
    summary: def.summary,
    sections,
    sourceId: SOURCE.id,
  };
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function parseHapgoodLiturgies(config: { rawRoot: string }): CommentaryBundleV2 {
  const filePath = join(config.rawRoot, OCR_RELATIVE);
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  const find = (predicate: (l: string) => boolean, from = 0): number => {
    for (let i = from; i < lines.length; i += 1) {
      if (predicate(lines[i])) return i;
    }
    return -1;
  };

  const combinedStart = find((l) => l.trim() === COMBINED_START);
  const presanctMarker = find((l) => l.includes(PRESANCTIFIED_MARKER));
  const presanctStart = find((l) => PRESANCTIFIED_START.test(l.trim()), presanctMarker);
  const presanctEnd = find((l) => l.includes(PRESANCTIFIED_END), presanctStart);

  if (combinedStart < 0 || presanctMarker < 0 || presanctStart < 0 || presanctEnd < 0) {
    throw new Error(
      `[hapgood-liturgies] Could not locate liturgy boundaries (combined=${combinedStart}, presanctMarker=${presanctMarker}, presanctStart=${presanctStart}, presanctEnd=${presanctEnd}).`,
    );
  }

  const combinedLines = lines.slice(combinedStart, presanctMarker);
  const presanctLines = lines.slice(presanctStart, presanctEnd);

  const combinedTagged = parseRite(combinedLines);
  const presanctTagged = parseRite(presanctLines);

  const chrysostomSections = buildSections(combinedTagged, "chrysostom");
  const basilSections = buildSections(combinedTagged, "basil");
  const presanctSections = buildSections(presanctTagged, "plain");

  const works = [buildWork(CHRYSOSTOM), buildWork(BASIL), buildWork(PRESANCTIFIED)];
  const chapters = [
    buildChapter(CHRYSOSTOM, chrysostomSections),
    buildChapter(BASIL, basilSections),
    buildChapter(PRESANCTIFIED, presanctSections),
  ];

  return {
    version: "2",
    people: [],
    works,
    sources: [SOURCE],
    entries: [],
    chapters,
  };
}
