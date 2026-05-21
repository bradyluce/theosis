#!/usr/bin/env python3
"""Utility: write a council file with YAML frontmatter.
Usage: echo "$CONTENT" | python3 save_council.py <work_id> <title> <dest_dir>
"""
import sys, json
from pathlib import Path
from datetime import datetime

work_id  = sys.argv[1]
title    = sys.argv[2]
dest_dir = Path(sys.argv[3])
content  = sys.stdin.read()

dest_dir.mkdir(parents=True, exist_ok=True)
out = dest_dir / f"{work_id}.md"
frontmatter = f"""---
work_id: "{work_id}"
title: "{title}"
source: "New Advent — newadvent.org/fathers/"
source_url: "https://www.newadvent.org/fathers/{work_id}.htm"
translation: "NPNF Series (Schaff & Wace, 1900), revised by Kevin Knight"
category: "council"
downloaded_at: "{datetime.utcnow().strftime('%Y-%m-%d')}"
normalization_status: "raw"
---

"""
out.write_text(frontmatter + content, encoding="utf-8")
print(f"Saved: {out}")
