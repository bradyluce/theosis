# Ingestion Scripts

Parses Bible source files into normalized JSON consumed by the app.

## Status

All parsers are written and ready. The app will automatically use generated data once the source files are placed in `content/raw/bibles/` and the ingestion is run.

## Directory layout expected

```
content/raw/bibles/
  english/
    kjva.osis.xml            — King James Version with Apocrypha (OSIS format)
    lxxe.xml                 — Brenton English Septuagint (OSIS format)
    eng-Brenton_all.txt      — Brenton Septuagint (plaintext from PDF)
    New Testament (The Eastern Greek Orthodox Bible).txt  — EOB NT (plaintext from PDF)
    rsv/                     — RSV XML (one file per book, see parse-rsv-xml.ts)
  original/
    Greek_New_Testament.txt                     — Nestle 1904 GNT plaintext
    Septuagint_LXX_Greek.txt                    — Septuagint Greek plaintext
    rp2018-ascii-one-line-per-verse/            — Byzantine textform (directory of .txt files)
    editions-antonaides-1904-parsed/            — Antoniades 1904 Patriarchal text (.UAN files)
```

## Running

```sh
# From the project root
npx tsx scripts/ingest/ingest.ts
```

Output lands in `content/generated/bibles/`:
- `catalog.json` — all translations + books metadata
- `kjva.json`, `rsv.json`, etc. — verses + chapters per translation

The app loader (`src/lib/content/loader.ts`) reads from `content/generated/bibles/` automatically at build/request time. No code changes needed after running ingestion.

## Source acquisition notes

- **KJVA / LXXE**: Available from open-source OSIS Bible projects (e.g., CrossWire, eBible.org)
- **RSV**: XML format; check eBible.org or CCEL for public-domain RSV files
- **GNT (Nestle 1904)**: Available at CCEL, GreekNT.org, or morphgnt.org
- **Septuagint Greek**: Available from eLXX project or the Swete LXX
- **Byzantine (RP2018)**: Available from byzantinetext.com
- **Antoniades 1904**: Available from the Unbound Bible project (UAN format)
- **Brenton / EOB**: Plaintext extractions from public-domain PDFs

## Parsers

| Parser | Format | Translations |
|---|---|---|
| `parse-osis-xml.ts` | OSIS XML | KJVA, LXXE |
| `parse-rsv-xml.ts` | RSV XML | RSV |
| `parse-brenton-txt.ts` | Plaintext (PDF extract) | Brenton LXX |
| `parse-eob-txt.ts` | Plaintext (PDF extract) | EOB NT |
| `parse-greek-txt.ts` | Plaintext | GNT, LXX-Greek |
| `parse-byz-txt.ts` | ASCII transliteration | Byzantine (RP2018) |
| `parse-uan.ts` | UAN format | Antoniades 1904 |
