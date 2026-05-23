// HCF mixes public-domain excerpts (CCEL, NPNF, ANF, Newman's Catena Aurea,
// etc.) with limited fair-use excerpts from copyrighted modern works
// (ACCS, IVP, Logos, etc.). The user has chosen the "drop fair-use" posture,
// so this filter is conservative — when in doubt, drop.
//
// The most reliable signal is source_title (covers most cases) with
// source_url host as a fallback. `time` is the author's writing year, not
// the translation year, so it's a weak signal alone — Augustine wrote in
// 400 but a 2010 ACCS translation isn't PD.

import type { HcfCommentary } from "./parse-hcf";

// Source titles that match these case-insensitive substrings are treated
// as public-domain. The list is intentionally narrow — adding a title here
// should only happen after verifying its underlying translation is PD.
const PD_TITLE_PATTERNS: string[] = [
  "catena aurea",                              // Newman 1841 (PD)
  "nicene and post-nicene fathers",            // Schaff (PD)
  "ante-nicene fathers",                       // Schaff (PD)
  "npnf",
  "anf",
  "schaff",
  "newadvent",
  "ccel",
  "tertullian.org",
  "early church fathers",                      // umbrella PD collection
  "wikisource",
  "loeb",                                      // older Loebs are PD; newer aren't (audit needed)
];

// Source URL hosts known to host PD primary texts. Used as a second check
// when the title doesn't match a PD pattern.
const PD_URL_HOSTS: string[] = [
  "ccel.org",
  "newadvent.org",
  "tertullian.org",
  "earlychristianwritings.com",
  "earlychurchtexts.com",
  "documentacatholicaomnia.eu",
  "wikisource.org",
  "archive.org",
  "monachos.net",
  "biblehub.com",
  "sacred-texts.com",
];

// Source titles / URL fragments that are definitively NOT PD. These take
// priority over allowlist matches so a hybrid match (PD-looking title on
// an ACCS-hosted excerpt) still gets dropped.
const NON_PD_TITLE_PATTERNS: string[] = [
  "ancient christian commentary",              // ACCS — IVP, modern
  "accs",
  "ivp",
  "ivpress",
  "intervarsity",
  "logos",
  "verbum",
];

const NON_PD_URL_HOSTS: string[] = [
  "logos.com",
  "ivpress.com",
  "amazon.com",
];

export type LicenseDecision =
  | { allow: true }
  | { allow: false; reason: string };

function lowercase(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

function urlHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function decideLicense(entry: HcfCommentary): LicenseDecision {
  const title = lowercase(entry.source_title);
  const host = urlHost(entry.source_url);

  // Hard blocks first — if the title or host is known non-PD, reject
  // regardless of any allowlist match.
  for (const pattern of NON_PD_TITLE_PATTERNS) {
    if (title.includes(pattern)) {
      return { allow: false, reason: `non-pd-title:${pattern}` };
    }
  }
  if (host) {
    for (const blocked of NON_PD_URL_HOSTS) {
      if (host === blocked || host.endsWith(`.${blocked}`)) {
        return { allow: false, reason: `non-pd-host:${blocked}` };
      }
    }
  }

  // Allowlist on title.
  for (const pattern of PD_TITLE_PATTERNS) {
    if (title.includes(pattern)) return { allow: true };
  }

  // Allowlist on URL host.
  if (host) {
    for (const allowed of PD_URL_HOSTS) {
      if (host === allowed || host.endsWith(`.${allowed}`)) return { allow: true };
    }
  }

  // Last-resort time-based heuristic: if the author wrote before 1900 AND
  // there's no modern-publisher signal, default to allow. Catches PD-source
  // entries whose source_title doesn't match any pattern. (HCF's `time` is
  // the author's writing year — 9999 means "unknown" and is dropped.)
  const time = entry.time;
  if (typeof time === "number" && time !== 9999 && time < 1900) {
    return { allow: true };
  }

  return { allow: false, reason: "no-pd-signal" };
}
