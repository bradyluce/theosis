# Legacy Phase-1 acquisition scripts

These scripts were used in the **earliest Augustine-era acquisition** (May 2026) when the workflow saved one `<work_id>.md` per page (YAML frontmatter + stripped markdown body) into per-author folders. They are **superseded** by the current pipeline:

| Legacy script | Superseded by |
|---|---|
| `aug_download.py` | `scripts/newadvent_downloader.py` |
| `batch_process.py` | `scripts/newadvent_downloader.py` |
| `process_fetch.py` | `scripts/newadvent_downloader.py` (writes `.html` + `provenance_*.json` directly) |
| `save_council.py` | `scripts/newadvent_downloader.py` with `--dest content/raw/councils/...` |
| `write_and_process.py` | n/a — base64 stdin pipe was a workaround for an earlier sandbox limitation |
| `win_to_bash_path.py` | n/a — path-conversion helper for a specific multi-session setup |

Hardcoded paths (`/sessions/zealous-elegant-rubin/mnt/...`) in these scripts will not resolve outside that session — kept only as reference.

The canonical raw content layout for New Advent corpora is now:

```
content/raw/<category>/<author-slug>/
  <work_id>.html                 # raw HTML straight from newadvent.org
  <work_id>NN.html               # sub-pages (variable suffix length)
  provenance_<work_id>.json      # sidecar with title, source URL, subpages list
```

No `.md` files. No YAML-stripped bodies. The integration plans in `docs/*-raw-content-integration-plan.md` document the per-corpus structure.
