#!/usr/bin/env python3
"""Check acquisition status across all phases."""
import re, os

base = os.path.join(os.path.dirname(__file__), "..", "content", "raw")
script = os.path.join(os.path.dirname(__file__), "newadvent_downloader.py")

with open(script, encoding="utf-8") as f:
    content = f.read()

manifest_re = re.compile(
    r'\("(\d{4})",\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*"([^"]+)"'
)
manifest = manifest_re.findall(content)
phases = {1: [], 2: [], 3: []}
for wid, title, dest, phase, wtype in manifest:
    phases[int(phase)].append((wid, title, dest, wtype))

for phase_num in [1, 2, 3]:
    done_count = 0
    todo = []
    for wid, title, dest, wtype in phases[phase_num]:
        prov_path = os.path.join(base, dest, f"provenance_{wid}.json")
        if os.path.exists(prov_path):
            done_count += 1
        else:
            todo.append((wid, title, dest, wtype))
    print(f"=== PHASE {phase_num} ===")
    print(f"  {done_count} done / {len(todo)} remaining / {len(phases[phase_num])} total")
    print()
    if todo:
        by_folder = {}
        for wid, title, dest, wtype in todo:
            by_folder.setdefault(dest, []).append((wid, title, wtype))
        for folder in sorted(by_folder):
            items = by_folder[folder]
            print(f"  {folder} ({len(items)} works):")
            for wid, title, wtype in items:
                print(f"    {wid}  {title}  [{wtype}]")
            print()
    print()
