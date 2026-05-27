// Render a prayer rule to a PDF document and hand it to the platform
// share sheet. The HTML template uses the same elite typographic
// vocabulary the app does — Newsreader serif from Google Fonts (with
// a Garamond/Times fallback when the print engine has no network),
// gilt accent rules, oxblood eyebrow caps, drop-cap-style initials on
// each prayer.
//
// We don't try to be smart about pagination — let the PDF engine break
// at natural line boundaries. Each prayer gets `page-break-inside:
// avoid` so the title and at least the first paragraph stay together
// when possible.

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import {
  DYNAMIC_BY_ID,
  PRAYER_BY_ID,
  type DynamicItem,
  type PrayerEntry,
} from "./prayer-corpus";

export type PrayerRuleSnapshot = {
  morning: string[];
  evening: string[];
};

// Escape HTML special characters in user-provided text so we don't
// open ourselves up to broken markup if a prayer body ever contains
// the characters. Prayer bodies are corpus-controlled today but it's
// cheap insurance.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraph(text: string): string {
  // Within a paragraph, single \n becomes a <br>. Paragraphs are
  // split outside this function by \n\n.
  return escapeHtml(text).replace(/\n/g, "<br />");
}

function renderPrayer(prayer: PrayerEntry, position: number): string {
  const paragraphs = prayer.body.split(/\n\n+/).map(renderParagraph);
  const subtitleHtml = prayer.subtitle
    ? `<div class="prayer-subtitle">${escapeHtml(prayer.subtitle)}</div>`
    : "";
  const attributionHtml = prayer.attribution
    ? `<div class="prayer-attribution">— ${escapeHtml(prayer.attribution)}</div>`
    : "";
  return `
    <section class="prayer">
      <div class="prayer-numeral">${String(position).padStart(2, "0")}</div>
      ${subtitleHtml}
      <h2 class="prayer-title">${escapeHtml(prayer.title)}</h2>
      <div class="prayer-rule"></div>
      <div class="prayer-body">
        ${paragraphs.map((p) => `<p>${p}</p>`).join("")}
      </div>
      ${attributionHtml}
    </section>
  `;
}

function renderDynamic(item: DynamicItem, position: number): string {
  return `
    <section class="prayer dynamic">
      <div class="prayer-numeral">${String(position).padStart(2, "0")}</div>
      <div class="prayer-subtitle">${escapeHtml(item.subtitle)}</div>
      <h2 class="prayer-title">${escapeHtml(item.title)}</h2>
      <div class="prayer-rule"></div>
      <div class="prayer-body">
        <p class="dynamic-note">
          <em>
            Pulled live from the daily lectionary when read in the app.
            See your parish bulletin or the Theosis Daily page for
            today&rsquo;s appointed text.
          </em>
        </p>
      </div>
    </section>
  `;
}

function renderSlot(label: string, slotIds: string[]): string {
  if (slotIds.length === 0) {
    return `
      <section class="slot">
        <div class="slot-eyebrow">${label}</div>
        <h1 class="slot-title">${label} prayers</h1>
        <div class="slot-rule"></div>
        <p class="slot-empty"><em>Your ${label.toLowerCase()} rule is empty.</em></p>
      </section>
    `;
  }
  const items: string[] = [];
  let position = 1;
  for (const id of slotIds) {
    const dyn = DYNAMIC_BY_ID.get(id);
    if (dyn) {
      items.push(renderDynamic(dyn, position));
    } else {
      const prayer = PRAYER_BY_ID.get(id);
      if (prayer) {
        items.push(renderPrayer(prayer, position));
      }
    }
    position += 1;
  }
  return `
    <section class="slot">
      <div class="slot-eyebrow">${label}</div>
      <h1 class="slot-title">${label} prayers</h1>
      <div class="slot-rule"></div>
      ${items.join("")}
    </section>
  `;
}

function buildHtml(snapshot: PrayerRuleSnapshot, dateLabel: string): string {
  // Inline CSS — the print engine has no separate stylesheet pipeline.
  // Google Fonts link gets pulled at print time when network is up;
  // we fall back to Garamond/Times when it isn't.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Prayer Rule — Theosis</title>
    <link
      rel="preconnect"
      href="https://fonts.googleapis.com"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,600&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --ink: #1a1815;
        --ink-muted: #4a4640;
        --ink-soft: #8a8378;
        --accent: #d4a857;
        --accent-deep: #b08840;
        --oxblood: #8b3a3a;
        --paper: #f8f3e9;
        --rule: rgba(176, 136, 64, 0.4);
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: "Newsreader", Garamond, "Times New Roman", Times, serif;
        font-size: 12pt;
        line-height: 1.6;
      }
      .page {
        padding: 0.6in 0.7in 0.9in 0.7in;
      }
      /* Masthead — gilt eyebrow + Wordmark + date.
         The eyebrow strip mirrors the in-app masthead. */
      .masthead {
        text-align: center;
        padding-bottom: 0.45in;
        border-bottom: 1pt solid var(--rule);
      }
      .wordmark {
        font-family: "Newsreader", Garamond, serif;
        font-style: italic;
        font-weight: 600;
        font-size: 28pt;
        color: var(--ink);
        letter-spacing: -0.5pt;
        margin: 0;
      }
      .masthead-eyebrow {
        font-family: "Newsreader", serif;
        font-size: 9pt;
        font-weight: 700;
        color: var(--accent-deep);
        letter-spacing: 2.4pt;
        text-transform: uppercase;
        margin-bottom: 4pt;
      }
      .masthead-date {
        font-style: italic;
        color: var(--ink-soft);
        font-size: 11pt;
        margin-top: 6pt;
      }
      .slot {
        padding-top: 0.4in;
      }
      .slot + .slot {
        page-break-before: always;
      }
      .slot-eyebrow {
        font-family: "Newsreader", serif;
        font-size: 10pt;
        font-weight: 700;
        color: var(--oxblood);
        letter-spacing: 2.6pt;
        text-transform: uppercase;
        margin-bottom: 6pt;
      }
      .slot-title {
        font-style: italic;
        font-weight: 600;
        font-size: 30pt;
        color: var(--ink);
        margin: 0 0 8pt 0;
        letter-spacing: -0.5pt;
      }
      .slot-rule {
        width: 1.4in;
        height: 1pt;
        background: var(--accent);
        margin-bottom: 0.3in;
      }
      .slot-empty {
        color: var(--ink-soft);
        font-style: italic;
      }
      .prayer {
        margin-top: 0.32in;
        padding-bottom: 0.1in;
        page-break-inside: avoid;
      }
      .prayer + .prayer {
        border-top: 0.5pt solid rgba(0, 0, 0, 0.08);
        padding-top: 0.32in;
      }
      .prayer.dynamic {
        background: rgba(212, 168, 87, 0.06);
        border: 0.5pt solid var(--rule);
        padding: 0.18in 0.22in;
        border-radius: 4pt;
      }
      .prayer-numeral {
        font-family: "Newsreader", serif;
        font-style: italic;
        font-weight: 600;
        font-size: 32pt;
        color: var(--accent);
        line-height: 1;
        margin-bottom: 6pt;
        letter-spacing: -1pt;
        opacity: 0.85;
      }
      .prayer-subtitle {
        font-family: "Newsreader", serif;
        font-size: 8.5pt;
        font-weight: 700;
        color: var(--ink-soft);
        letter-spacing: 2pt;
        text-transform: uppercase;
        margin-bottom: 4pt;
      }
      .prayer-title {
        font-family: "Newsreader", serif;
        font-size: 18pt;
        font-weight: 600;
        color: var(--ink);
        margin: 0;
        letter-spacing: -0.3pt;
        line-height: 1.2;
      }
      .prayer-rule {
        width: 0.6in;
        height: 0.6pt;
        background: var(--rule);
        margin: 8pt 0 12pt 0;
      }
      .prayer-body p {
        margin: 0 0 9pt 0;
        font-size: 12pt;
        line-height: 1.62;
        color: var(--ink-muted);
      }
      .prayer-body p:first-of-type::first-letter {
        font-family: "Newsreader", serif;
        font-style: italic;
        font-weight: 600;
        font-size: 28pt;
        color: var(--oxblood);
        float: left;
        line-height: 0.9;
        margin: 4pt 4pt 0 0;
      }
      .dynamic-note em {
        font-style: italic;
        color: var(--ink-soft);
      }
      .prayer-attribution {
        margin-top: 8pt;
        font-size: 9.5pt;
        font-style: italic;
        color: var(--ink-soft);
        letter-spacing: 0.3pt;
      }
      .colophon {
        margin-top: 0.6in;
        padding-top: 0.2in;
        border-top: 1pt solid var(--rule);
        text-align: center;
        font-style: italic;
        font-size: 9.5pt;
        color: var(--ink-soft);
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="masthead">
        <div class="masthead-eyebrow">A prayer rule</div>
        <h1 class="wordmark">Theosis</h1>
        <div class="masthead-date">${escapeHtml(dateLabel)}</div>
      </header>

      ${renderSlot("Morning", snapshot.morning)}
      ${renderSlot("Evening", snapshot.evening)}

      <footer class="colophon">
        Printed from Theosis. Made with reverence.
      </footer>
    </div>
  </body>
</html>`;
}

export type GeneratePdfResult = {
  uri: string;
  shared: boolean;
};

// Top-level entry — generates the PDF, opens the share sheet so the
// user can save to Files, AirPrint, send via Mail, etc. Returns the
// generated file URI for any caller that wants to surface it.
export async function generateAndSharePrayerRulePdf(
  snapshot: PrayerRuleSnapshot,
): Promise<GeneratePdfResult> {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const html = buildHtml(snapshot, dateLabel);
  // base64: false → returns a file URI; we don't need the bytes.
  const result = await Print.printToFileAsync({
    html,
    base64: false,
  });
  if (!result.uri) {
    throw new Error("Print failed: no file URI returned.");
  }
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Save or print your prayer rule",
      UTI: "com.adobe.pdf",
    });
    return { uri: result.uri, shared: true };
  }
  return { uri: result.uri, shared: false };
}
