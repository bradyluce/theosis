// One-shot helper: search Wikimedia Commons for icon files and print the top
// candidates so we can curate sources.ts. Run with:
//   npx tsx scripts/ingest/icons/probe.ts "Theotokos of Vladimir"

const UA = "TheosisIconIngest/0.1 (https://github.com/theosis-app)";

type SearchResult = { title: string; snippet?: string };

async function search(term: string): Promise<SearchResult[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&list=search&srnamespace=6&srlimit=8" +
    "&srsearch=" +
    encodeURIComponent(term + " icon");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const data = (await res.json()) as {
    query?: { search?: SearchResult[] };
  };
  return data.query?.search ?? [];
}

async function imageInfo(title: string) {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&format=json&prop=imageinfo" +
    "&iiprop=url|size|extmetadata&iiurlwidth=400&titles=" +
    encodeURIComponent(title);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: Array<{
            url: string;
            extmetadata?: {
              LicenseShortName?: { value: string };
              License?: { value: string };
            };
          }>;
        }
      >;
    };
  };
  const pages = data.query?.pages ?? {};
  const first = Object.values(pages)[0];
  const info = first?.imageinfo?.[0];
  return info
    ? {
        license:
          info.extmetadata?.LicenseShortName?.value ??
          info.extmetadata?.License?.value ??
          "?",
        url: info.url,
      }
    : null;
}

async function main() {
  const terms = process.argv.slice(2);
  if (terms.length === 0) {
    console.error("Usage: probe.ts <search term>...");
    process.exit(1);
  }
  for (const term of terms) {
    console.log(`\n=== ${term} ===`);
    const results = await search(term);
    for (const r of results.slice(0, 6)) {
      const info = await imageInfo(r.title);
      const lic = info?.license ?? "(no info)";
      console.log(`  [${lic}] ${r.title}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
