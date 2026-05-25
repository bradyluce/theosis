# Media pool ingest

Builds the Theosis **general media pool** — contextual background / accent imagery
for the UI. This is **not** the saint-icon catalog (that lives in
`content/normalized/{library,commentary}/catalog.json` and is curated separately).
This pool is monasteries, frescoes, mosaics, manuscripts, landscapes from Orthodox
lands, and liturgical detail shots — variety so the app never reuses the same five
images.

## Run

```sh
npm run ingest:media
# or
npx tsx scripts/ingest/media/fetch-media.ts
```

Requires network access (it queries the live Wikimedia Commons API and downloads
from `upload.wikimedia.org`). It will not run in a sandbox with no outbound
network — run it on a normal dev machine.

Outputs:

- `content/raw/media/<id>.<ext>` — the image files (this dir is **gitignored**, by design).
- `content/normalized/media/catalog.json` — the committed catalog (schema below).

Idempotent: re-running overwrites images in place and rebuilds the catalog.

## How it works

The script defines ~35 **buckets** (top of `fetch-media.ts`), each mapping a
Wikimedia Commons category (plus a search fallback) to a target count and a fixed
set of tags (themes / region / era / mood). For every bucket it:

1. discovers candidate files via the category, falling back to a keyword search
   if the category is thin;
2. keeps **only strictly-free files** — Public Domain or CC0. Anything carrying
   BY / SA / NC / ND, or any ambiguous license, is rejected and logged;
3. downloads a thumbnail sized via Commons' server-side resizing, shrinking the
   requested width until the file is under ~500 KB (no local image library needed);
4. records provenance pulled straight from the Commons API — title, author,
   license, source URL, dimensions. **Nothing is fabricated.** If the author is
   anonymous/unknown it is stored as `null` and counted in the report.

Bucket targets sum to exactly **100**, distributed to match the brief:
~30 architecture, ~20 fresco/mosaic, ~15 manuscripts, ~15 landscapes,
~10 liturgical detail, ~10 contemplative nature.

## When a bucket under-fills

Commons category names drift, and some categories have few PD/CC0 files (many
modern photos are CC-BY-SA and get rejected — that's correct behaviour). The run
report flags any `UNDER-FILLED` bucket and prints a skip tally. To fix:

- adjust that bucket's `category` / `searchFallback` near the top of `fetch-media.ts`
  (browse <https://commons.wikimedia.org> to find a category with more PD/CC0 files), then re-run; or
- raise another bucket's `target` to compensate.

The run also prints final counts by theme, region, and license so you can confirm
the distribution before committing.

## Tag vocabulary

`themes`: monastery, church, architecture, fresco, mosaic, manuscript, landscape,
liturgical, nature, iconography-detail, candles, censer, vestment, cross, bells, prosphora

`region`: greece, mt-athos, russia, egypt, sinai, palestine, syria, armenia,
ethiopia, serbia, bulgaria, romania, cappadocia, constantinople, ravenna, coptic,
georgia, ukraine, general

`era`: early-christian, byzantine, medieval, early-modern, modern, contemporary

`mood`: contemplative, joyful, ascetic, triumphant, mournful, neutral

## Catalog schema

Entries conform to the `MediaEntry` type in `@theosis/core`
(`packages/core/src/domain/types.ts`) — the same type `scripts/media/sync-to-public.ts`
and the app consume. Note `license` uses the kebab-case `MediaLicense` values
(`"public-domain"` / `"cc0"`), and `source.author` is **omitted** when the work is
anonymous (never set to a fake name or null).

```jsonc
{
  "version": "1",
  "_meta": { /* preserved across runs; status line refreshed each run */ },
  "entries": [
    {
      "id": "monastery-meteora-01",
      "src": "/media/monastery-meteora-01.jpg",   // public path; sync:media also backfills this
      "filename": "monastery-meteora-01.jpg",
      "title": "Holy Monastery of the Great Meteoron",
      "description": "…",
      "alt": "The Meteora monasteries of Thessaly, perched atop sandstone pillars.",
      "themes": ["monastery", "architecture", "landscape"],
      "region": "greece",
      "era": "modern",
      "mood": "contemplative",
      "links": { "personIds": [], "feastIds": [], "topicIds": [] },
      "dimensions": { "width": 2200, "height": 1465 },
      "license": "cc0",                            // or "public-domain"
      "source": {
        "name": "Wikimedia Commons",
        "url": "https://commons.wikimedia.org/wiki/File:…",
        "author": "Photographer Name"             // field omitted when anonymous/unknown
      },
      "attribution": "CC0. Photo/scan by … via Wikimedia Commons."
    }
  ]
}
```

After `npm run ingest:media`, run `npm run sync:media` to copy the images into
`public/media/` so Next can serve them.

`links.*` are intentionally left empty for general imagery so the app can use any
entry as fallback. Populate them by hand only when an image is unambiguously about
a specific person/feast/topic.
