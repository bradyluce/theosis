// Parse a free-form Person.eraLabel into a representative year.
// The labels follow several conventions across seed/ingested data:
//   "4th century"          → midpoint = 350
//   "3rd–4th century"      → midpoint of the range
//   "c. 347-407"           → year-range midpoint
//   "c. 167 AD" / "ca. 200" → the named year
//   "20th century (1934–2019)" → range wins over century
// Returns null when no year can be extracted (calendar stubs with empty
// eraLabel, etc.) — callers should drop those from the timeline.
//
// Lives in @theosis/core (not src/features/library) so both the web and
// mobile clients can consume the same parser when they need to bucket a
// new Person without round-tripping the API.

export type EraResult = {
  year: number;
  range?: [number, number];
};

// Detect whether the era label is BC (not AD). The Synaxarion uses
// labels like "1st century BC", "1st century BC – 1st century", and
// occasionally "c. 100 BC". Mixed BC→AD ranges (an OT figure who lived
// into the early Christian era, like Anna or Joseph the Betrothed)
// resolve as AD because the AD half is closer to the chronological
// center of their life and lands them with the other 1st-century saints.
function isLabelBc(cleaned: string): boolean {
  if (!/\bBC\b/i.test(cleaned)) return false;
  // If a 'century' or explicit 'AD' marker appears AFTER the BC token,
  // treat as AD-leaning (mixed range).
  const bcIndex = cleaned.search(/\bBC\b/i);
  const tail = cleaned.slice(bcIndex + 2);
  if (/\bcentury\b/i.test(tail) || /\bAD\b/i.test(tail)) return false;
  return true;
}

export function parseEra(eraLabel: string): EraResult | null {
  if (!eraLabel) return null;
  const cleaned = eraLabel.replace(/–|—/g, "-");
  const sign = isLabelBc(cleaned) ? -1 : 1;

  // 1. Explicit year range like "347-407" or "c. 347-407".
  const rangeMatch = cleaned.match(/(?:c\.|ca\.)?\s*(\d{3,4})\s*-\s*(\d{3,4})/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (start <= end && end - start < 200) {
      const mid = Math.round((start + end) / 2);
      return {
        year: sign * mid,
        range: sign === 1 ? [start, end] : [-end, -start],
      };
    }
  }

  // 2. Century range: "3rd-4th century"
  const centuryRangeMatch = cleaned.match(
    /(\d{1,2})(?:st|nd|rd|th)\s*-\s*(\d{1,2})(?:st|nd|rd|th)\s*century/i,
  );
  if (centuryRangeMatch) {
    const c1 = Number(centuryRangeMatch[1]);
    const c2 = Number(centuryRangeMatch[2]);
    const mid = ((c1 - 1) * 100 + 50 + (c2 - 1) * 100 + 50) / 2;
    return { year: sign * Math.round(mid) };
  }

  // 3. Single century: "4th century"
  const centuryMatch = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)\s*century/i);
  if (centuryMatch) {
    const c = Number(centuryMatch[1]);
    return { year: sign * ((c - 1) * 100 + 50) };
  }

  // 4. Single year mention.
  const singleMatch = cleaned.match(/(?:c\.|ca\.)?\s*(\d{3,4})\s*(?:AD|BC)?/i);
  if (singleMatch) {
    return { year: sign * Number(singleMatch[1]) };
  }

  return null;
}

// Bucket a year into a century number. Positive = AD (1..21), negative =
// BC (-1 = 1st BC, -10 = 10th BC, etc.). There is no "century 0" because
// there is no year 0 in the conventional calendar.
export function centuryFromYear(year: number): number {
  if (year >= 1) return Math.floor((year - 1) / 100) + 1;
  // -1..-100 → -1, -101..-200 → -2, etc.
  return -(Math.floor((-year - 1) / 100) + 1);
}

// English ordinal for a century number — returns just the ordinal
// ("1st", "10th"). Sign is ignored; callers append " BC" when needed.
// Kept ordinal-only so the existing `${centuryLabel(c)} century` call
// sites stay correct ("1st century" not "1st BC century").
export function centuryLabel(n: number): string {
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  const lastOne = abs % 10;
  if (lastTwo >= 11 && lastTwo <= 13) return `${abs}th`;
  if (lastOne === 1) return `${abs}st`;
  if (lastOne === 2) return `${abs}nd`;
  if (lastOne === 3) return `${abs}rd`;
  return `${abs}th`;
}

// Full display string with the era suffix: "4th century" for AD,
// "10th century BC" for BC. Use this when rendering — it keeps the
// formatting consistent across web + mobile.
export function centuryFullLabel(n: number): string {
  return `${centuryLabel(n)} century${n < 0 ? " BC" : ""}`;
}
