/**
 * Extract clean Russian commentary text from the scraped azbyka.ru pages
 * (St. Ephrem the Syrian's Commentary on Genesis, 1901 Holy Trinity-Sergius
 * Lavra translation).
 *
 * Input:  content/raw/library/ephrem-genesis/raw/{01..51}.html
 * Output: content/raw/library/ephrem-genesis/russian/{01..51}.txt
 *
 * Strategy: the article body lives inside <article id="b1"> within the
 * <section class="text flex flex-col page-grid">. Pull paragraph nodes from
 * inside that element, drop nav/footer/related links/page-furniture, and
 * write one chapter per file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "node-html-parser";

const ROOT = join(process.cwd(), "content/raw/library/ephrem-genesis");
const RAW_DIR = join(ROOT, "raw");
const OUT_DIR = join(ROOT, "russian");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function extract(html: string): { title: string; paragraphs: string[] } {
  const doc = parse(html);
  const titleNode = doc.querySelector("title");
  const rawTitle = (titleNode?.text ?? "").trim();

  // The article body is the set of <p class="txt"> nodes — these are the
  // commentary paragraphs themselves. <p class="h2"> is the chapter heading.
  // Other p variants (after-text-vignette, book-source, etc.) are chrome.
  const txtPs = doc.querySelectorAll("p.txt");
  const headPs = doc.querySelectorAll("p.h2");

  const heading = headPs[0]?.text?.replace(/\s+/g, " ").trim() ?? "";
  const paragraphs: string[] = [];
  if (heading) paragraphs.push(heading);
  for (const p of txtPs) {
    const t = p.text.replace(/\s+/g, " ").trim();
    if (t.length < 12) continue;
    if (/^Источник:/i.test(t)) continue;
    if (/Азбука веры/i.test(t)) continue;
    paragraphs.push(t);
  }

  return { title: rawTitle, paragraphs };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

let totalWords = 0;
const summary: { chapter: number; title: string; paragraphs: number; words: number }[] = [];

for (let i = 1; i <= 51; i++) {
  const file = join(RAW_DIR, `${pad(i)}.html`);
  if (!existsSync(file)) {
    console.error(`[${pad(i)}] MISSING raw html, skipping`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const { title, paragraphs } = extract(html);
  const body = paragraphs.join("\n\n");
  const words = body.split(/\s+/).filter(Boolean).length;
  totalWords += words;
  summary.push({ chapter: i, title, paragraphs: paragraphs.length, words });
  writeFileSync(
    join(OUT_DIR, `${pad(i)}.txt`),
    `# ${title}\n\n${body}\n`,
    "utf8",
  );
  console.log(`[${pad(i)}] ${paragraphs.length} paragraphs, ${words} words`);
}

writeFileSync(
  join(ROOT, "extract-summary.json"),
  JSON.stringify({ totalWords, chapters: summary }, null, 2) + "\n",
  "utf8",
);
console.log(`\nTotal: ${totalWords.toLocaleString()} Russian words across ${summary.length} chapters.`);
