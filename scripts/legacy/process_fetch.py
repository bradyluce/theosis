#!/usr/bin/env python3
"""
process_fetch.py — Save a web-fetched page to the corpus.

Usage:
  python3 process_fetch.py \
    --work-id  3810 \
    --title    "Council of Ephesus (A.D. 431)" \
    --dest     content/raw/councils/ecumenical/ephesus \
    --category council \
    --work-type council \
    --source   <tool-results-file-or-stdin>

Reads content from --source file (tool-results) or stdin.
Prepends YAML frontmatter. Saves as <work_id>.md in --dest.
"""

import sys, argparse, re
from pathlib import Path
from datetime import datetime

def strip_nav(text: str) -> str:
    """Remove nav/header/footer boilerplate from web_fetch output."""
    # Drop everything up to the first H1 line
    lines = text.splitlines()
    start = 0
    for i, line in enumerate(lines):
        if line.startswith("# "):
            start = i
            break
    # Drop everything after "About this page" or copyright footer
    end = len(lines)
    for i, line in enumerate(lines):
        if "About this page" in line or "Copyright ©" in line:
            end = i
            break
    return "\n".join(lines[start:end]).strip()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--work-id",   required=True)
    p.add_argument("--title",     required=True)
    p.add_argument("--dest",      required=True)
    p.add_argument("--category",  default="fathers")
    p.add_argument("--work-type", default="treatise")
    p.add_argument("--source",    default=None,
                   help="Path to tool-results file; if omitted reads stdin")
    p.add_argument("--author",    default=None)
    p.add_argument("--keep-nav",  action="store_true",
                   help="Keep navigation boilerplate in output")
    args = p.parse_args()

    if args.source:
        raw = Path(args.source).read_text(encoding="utf-8", errors="replace")
    else:
        raw = sys.stdin.read()

    # Extract source URL from first lines
    source_url = f"https://www.newadvent.org/fathers/{args.work_id}.htm"
    for line in raw.splitlines()[:5]:
        if line.startswith("https://"):
            source_url = line.strip()
            break

    content = strip_nav(raw) if not args.keep_nav else raw

    # Detect if it's a TOC (has links to sub-pages)
    subpage_pattern = re.compile(r'/fathers/' + re.escape(args.work_id) + r'\d+\.htm')  # already allows 1+ digits
    has_subpages = bool(subpage_pattern.search(raw))
    subpages = sorted(set(subpage_pattern.findall(raw)))

    frontmatter = f"""---
work_id: "{args.work_id}"
title: "{args.title}"
source: "New Advent — newadvent.org/fathers/"
source_url: "{source_url}"
category: "{args.category}"
work_type: "{args.work_type}"
"""
    if args.author:
        frontmatter += f'author: "{args.author}"\n'
    frontmatter += f"""translation: "NPNF series (Schaff & Wace), revised Kevin Knight"
has_subpages: {str(has_subpages).lower()}
subpages: {subpages}
downloaded_at: "{datetime.utcnow().strftime('%Y-%m-%d')}"
normalization_status: "raw"
---

"""

    dest = Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)
    out_file = dest / f"{args.work_id}.md"
    out_file.write_text(frontmatter + content, encoding="utf-8")

    size_kb = out_file.stat().st_size // 1024
    print(f"SAVED  {out_file}  ({size_kb}KB)  subpages={subpages}")

if __name__ == "__main__":
    main()
