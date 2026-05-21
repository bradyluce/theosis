import { type HTMLElement, parse } from "node-html-parser";
import type {
  WorkChapterParagraph,
  WorkChapterSection,
} from "@theosis/core";

// ── Entity + text helpers ────────────────────────────────────────────────────

export function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&#151;/g, "—")
    .replace(/&#x2014;/g, "—")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&euml;/g, "ë")
    .replace(/&eacute;/g, "é")
    .replace(/&AElig;/g, "Æ")
    .replace(/&aelig;/g, "æ")
    .replace(/&hellip;/g, "…")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(Number.parseInt(n, 16)),
    );
}

export function htmlToPlain(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

// Decode a Roman numeral. Returns null on malformed input. Permissive about
// subtractive notation (handles standard IV/IX/XL/XC/CD/CM forms naturally).
function romanToInt(roman: string): number | null {
  const values: Record<string, number> = {
    I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
  };
  let total = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i -= 1) {
    const v = values[roman[i].toUpperCase()];
    if (v === undefined) return null;
    if (v >= prev) total += v;
    else total -= v;
    prev = v;
  }
  return total > 0 ? total : null;
}

// Most corpora number paragraphs with Arabic numerals ("1. ...", "2. ...").
// Gregory Nazianzen's orations use Roman numerals ("I. ...", "II. ...").
// Detect both at the start of paragraph text.
export function parseLeadingNumber(text: string): {
  number?: number;
  rest: string;
} {
  const arabic = text.match(/^(\d+)\.\s+([\s\S]*)$/);
  if (arabic) {
    const n = Number.parseInt(arabic[1], 10);
    if (!Number.isNaN(n)) return { number: n, rest: arabic[2] };
  }
  const roman = text.match(/^([IVXLCDM]+)\.\s+([\s\S]*)$/);
  if (roman) {
    const n = romanToInt(roman[1]);
    if (n !== null) return { number: n, rest: roman[2] };
  }
  return { rest: text };
}

export function stripLeadingNumberFromHtml(html: string): string {
  return html.replace(/^\s*(?:\d+|[IVXLCDM]+)\.\s+/, "");
}

// ── Tree extraction ──────────────────────────────────────────────────────────

// node-html-parser gets confused by New Advent's nested table+ad layout when
// the body is short — it can fail to place #springfield2 in the parsed tree.
// Workaround: cut the springfield2-to-ogdenville slice by string search first
// and parse only that well-balanced fragment.
export function extractContentSlice(html: string, filePath: string): HTMLElement {
  const start = html.indexOf('<div id="springfield2">');
  if (start === -1) {
    throw new Error(`No <div id="springfield2"> in ${filePath}`);
  }
  const end = html.indexOf('<div id="ogdenville"', start);
  const slice = end === -1 ? html.slice(start) : html.slice(start, end);
  const doc = parse(slice);
  const content = doc.querySelector("#springfield2");
  if (!content) {
    throw new Error(`Failed to re-parse springfield2 slice from ${filePath}`);
  }
  return content;
}

// ── Noise removal ────────────────────────────────────────────────────────────

const NOISE_SELECTORS = [
  "script",
  "ins",
  ".catholicadnet-728x90",
  ".CMtag_300x250",
  ".CANBMDDisplayAD",
  ".CMAdExcludeArticles",
];

export function stripNoise(content: HTMLElement): void {
  for (const sel of NOISE_SELECTORS) {
    for (const el of content.querySelectorAll(sel)) {
      el.remove();
    }
  }
  // "Please help support the mission of New Advent" gumroad banner
  for (const a of content.querySelectorAll("a")) {
    const href = a.getAttribute("href") ?? "";
    if (href.includes("gumroad.com")) {
      let node: HTMLElement | null = a;
      while (node && node.tagName !== "P") {
        node = node.parentNode as HTMLElement | null;
      }
      if (node) node.remove();
    }
  }
}

// Strip <a> wrappers (cathen, bible) keeping inner text; collapse stiki/fisk/prefisk
// spans the same way. Leaves only inline markup we care to render: em/q/strong/blockquote.
export function normalizeParagraphHtml(p: HTMLElement): string {
  for (const a of p.querySelectorAll("a")) {
    a.replaceWith(a.innerText ?? "");
  }
  for (const span of p.querySelectorAll("span.stiki")) {
    span.replaceWith(span.innerText ?? "");
  }
  for (const span of p.querySelectorAll("span.fisk")) {
    span.replaceWith(span.innerText ?? "");
  }
  for (const span of p.querySelectorAll("span.prefisk")) {
    span.replaceWith(span.innerText ?? "");
  }
  return p.innerHTML.trim();
}

// ── High-level page parser ───────────────────────────────────────────────────

export type ParsedNewAdventPage = {
  title: string;
  summary?: string;
  sections: WorkChapterSection[];
};

// Parse a New Advent sub-page (e.g. content/raw/fathers/augustine/110101.html)
// into title + sections. The first <h1> becomes title; an optional <p class="h1a">
// becomes summary. Sections are segmented by <h2>; paragraphs (NPNF-numbered)
// accumulate into the current section.
export function parseNewAdventPage(
  htmlText: string,
  filePath: string,
): ParsedNewAdventPage {
  const content = extractContentSlice(htmlText, filePath);
  stripNoise(content);

  const pub = content.querySelector(".pub");
  if (pub) pub.remove();

  const h1 = content.querySelector("h1");
  const title = h1 ? htmlToPlain(h1.innerHTML) : "";
  if (h1) h1.remove();

  // Augustine uses <p class="h1a"> for the chapter-summary epigraph;
  // Irenaeus uses <span class="h1a"> for the same purpose. Accept both.
  const h1a = content.querySelector("p.h1a, span.h1a");
  const summary = h1a ? htmlToPlain(h1a.innerHTML) : "";
  if (h1a) h1a.remove();

  const sections: WorkChapterSection[] = [];
  let current: WorkChapterSection = { paragraphs: [] };

  const flush = () => {
    if (current.heading || current.paragraphs.length > 0) {
      sections.push(current);
    }
  };

  for (const child of content.childNodes) {
    if (child.nodeType !== 1) continue;
    const el = child as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    if (!tag) continue;

    if (tag === "h2") {
      flush();
      current = { heading: htmlToPlain(el.innerHTML), paragraphs: [] };
      continue;
    }

    if (tag === "p") {
      const cls = el.getAttribute("class") ?? "";
      if (cls.includes("h1a")) continue;
      const cleanedHtml = normalizeParagraphHtml(el);
      const text = htmlToPlain(cleanedHtml);
      if (!text) continue;
      const { number, rest } = parseLeadingNumber(text);
      const paragraph: WorkChapterParagraph = { text: rest || text };
      if (number !== undefined) paragraph.number = number;
      if (/<(em|q|strong|blockquote)\b/i.test(cleanedHtml)) {
        paragraph.html =
          number !== undefined
            ? stripLeadingNumberFromHtml(cleanedHtml)
            : cleanedHtml;
      }
      current.paragraphs.push(paragraph);
      continue;
    }

    if (tag === "blockquote") {
      const cleanedHtml = normalizeParagraphHtml(el);
      const text = htmlToPlain(cleanedHtml);
      if (!text) continue;
      current.paragraphs.push({ text, html: cleanedHtml });
      continue;
    }
  }
  flush();

  return {
    title,
    summary: summary || undefined,
    sections,
  };
}

// ── Excerpt + truncation helpers ────────────────────────────────────────────

const MAX_EXCERPT = 600;

export function truncateToWordBoundary(text: string, max = MAX_EXCERPT): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > max * 0.8 ? `${cut.slice(0, lastSpace)}…` : `${cut}…`;
}

// Joins the first-section paragraphs into an excerpt suitable for verse-level
// commentary cards. Drops paragraph numbers from the displayed text.
export function buildExcerptFromSections(
  sections: WorkChapterSection[],
  maxLength = MAX_EXCERPT,
): string {
  const buffer: string[] = [];
  let length = 0;
  outer: for (const section of sections) {
    for (const paragraph of section.paragraphs) {
      buffer.push(paragraph.text);
      length += paragraph.text.length;
      if (length >= maxLength) break outer;
    }
  }
  const joined = buffer.join(" ").replace(/\s+/g, " ").trim();
  return truncateToWordBoundary(joined, maxLength);
}
