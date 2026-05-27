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

export function parseEra(eraLabel: string): EraResult | null {
  if (!eraLabel) return null;
  const cleaned = eraLabel.replace(/–|—/g, "-");

  // 1. Explicit year range like "347-407" or "c. 347-407".
  const rangeMatch = cleaned.match(/(?:c\.|ca\.)?\s*(\d{3,4})\s*-\s*(\d{3,4})/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (start <= end && end - start < 200) {
      return {
        year: Math.round((start + end) / 2),
        range: [start, end],
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
    return { year: Math.round(mid) };
  }

  // 3. Single century: "4th century"
  const centuryMatch = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)\s*century/i);
  if (centuryMatch) {
    const c = Number(centuryMatch[1]);
    return { year: (c - 1) * 100 + 50 };
  }

  // 4. Single year mention.
  const singleMatch = cleaned.match(/(?:c\.|ca\.)?\s*(\d{3,4})\s*(?:AD|BC)?/i);
  if (singleMatch) {
    return { year: Number(singleMatch[1]) };
  }

  return null;
}

export function centuryFromYear(year: number): number {
  // 50 AD → 1st century, 150 AD → 2nd century, 1950 → 20th century.
  return Math.floor((year - 1) / 100) + 1;
}

export function centuryLabel(n: number): string {
  const lastTwo = n % 100;
  const lastOne = n % 10;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  if (lastOne === 1) return `${n}st`;
  if (lastOne === 2) return `${n}nd`;
  if (lastOne === 3) return `${n}rd`;
  return `${n}th`;
}
