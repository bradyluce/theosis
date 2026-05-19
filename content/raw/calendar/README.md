# Raw calendar source material

This directory holds verbatim downloads from Orthodox calendar / saints / readings / hymn sources. Each source has its own subdirectory with a `PROVENANCE.json` capturing URL, fetch date, license, and reuse posture.

See [docs/calendar-strategy.md](../../../docs/calendar-strategy.md) for the full acquisition strategy.

## Layout

```
content/raw/calendar/
├── README.md                  # this file
├── orthocal-python/           # MIT-licensed source library + fixtures (port-only)
├── orthodoxwiki/              # CC-BY-SA 2.5 / GFDL — feasts and saint articles
├── wikidata/                  # CC0 — structured saint metadata via SPARQL
├── hapgood-1906/              # Public domain — Service Book of the Orthodox Church
├── ochrid-prologue/           # CC-BY-SA 4.0 — Free translation of the Prologue from Ohrid
├── goarch-planner/            # ICS files for cross-validation
└── _reference-only/           # NC / © sources — for diff-check only, never promoted
```

## Rules

- **Every subdirectory must contain `PROVENANCE.json`** with: source URL, fetch date, license identifier, attribution text required by the license, and whether the contents may be promoted to `content/normalized/`.
- **`_reference-only/` content must never be copied into `content/normalized/`** or shipped in the app bundle. It exists for engineering diff-check during validation only.
- **Preserve originals verbatim.** Do not pretty-print, re-encode, or hand-edit raw downloads. All normalization happens during the raw → normalized step, not in this directory.
- **Date raw fetches** so we can reproduce/refresh later. Filenames may include ISO fetch date suffixes.

## License posture summary

| Source | License | Ship in app? | Attribution required? |
|--------|---------|--------------|-----------------------|
| orthocal-python | MIT | Yes (port code) | Yes (in code headers) |
| OrthodoxWiki | CC-BY-SA 2.5 / GFDL dual | Yes, with attribution + ShareAlike on adapted prose | Yes, visible in UI |
| Wikidata | CC0 | Yes, freely | No (recommended courtesy attribution) |
| Hapgood (1906) | Public domain | Yes, freely | No (recommended courtesy attribution) |
| Prologue from Ohrid (Sakarya translation) | CC-BY-SA 4.0 | Yes, with attribution + ShareAlike on adapted prose | Yes, visible in UI |
| GOARCH Planner ICS | Unclear | Reference only until clarified | n/a |
| orthocal.info site content | CC BY-NC-SA | **No** (NonCommercial) | n/a |
| OCA pages | © OCA | **No** without permission | n/a |
