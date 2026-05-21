#!/usr/bin/env python3
"""
batch_process.py -- Process all tool-results files that contain Augustine pages.
"""
import os, re, subprocess
from pathlib import Path

DEST = "/sessions/zealous-elegant-rubin/mnt/theosis/content/raw/fathers/augustine"
SCRIPT = "/sessions/zealous-elegant-rubin/mnt/theosis/scripts/process_fetch.py"
TR = "/sessions/zealous-elegant-rubin/mnt/.claude/projects/C--Users-bkluc-AppData-Roaming-Claude-local-agent-mode-sessions-e828e94a-4a86-4c1a-ada1-2b8f36a05072-6d956ffe-a28b-40e1-95e6-e67f37308cff-local-f5bd332d-66f5-492a-9c10-b0de0b73be94-outputs/43d83c4f-b7d5-4119-b0b4-84468ee9d0bc/tool-results"

TITLES = {
    "110101": ("Confessions Book I", "treatise"),
    "110102": ("Confessions Book II", "treatise"),
    "110103": ("Confessions Book III", "treatise"),
    "110104": ("Confessions Book IV", "treatise"),
    "110105": ("Confessions Book V", "treatise"),
    "110106": ("Confessions Book VI", "treatise"),
    "110107": ("Confessions Book VII", "treatise"),
    "110108": ("Confessions Book VIII", "treatise"),
    "110109": ("Confessions Book IX", "treatise"),
    "110110": ("Confessions Book X", "treatise"),
    "110111": ("Confessions Book XI", "treatise"),
    "110112": ("Confessions Book XII", "treatise"),
    "110113": ("Confessions Book XIII", "treatise"),
    "1201": ("On Christian Doctrine", "treatise"),
    "1202": ("On Christian Doctrine TOC", "treatise"),
    "1301": ("Enchiridion on Faith Hope and Love", "treatise"),
    "1302": ("On the Catechising of the Uninstructed", "treatise"),
    "1303": ("On the Profit of Believing", "treatise"),
    "1304": ("On Continence", "treatise"),
    "1305": ("Of the Good of Marriage", "treatise"),
    "1306": ("Of Holy Virginity", "treatise"),
    "1307": ("On Lying", "treatise"),
    "1308": ("To Consentius Against Lying", "treatise"),
    "1309": ("Of the Works of Monks", "treatise"),
    "1310": ("Of the Morals of the Catholic Church", "treatise"),
    "1311": ("On the Morals of the Manichaeans", "treatise"),
    "1312": ("Of Two Souls Against the Manichaeans", "treatise"),
    "1313": ("Acts Against Fortunatus the Manichaean", "treatise"),
    "1314": ("Against the Fundamental Epistle of Manichaeus", "treatise"),
    "1315": ("On the Nature of Good", "treatise"),
    "1316": ("On the Spirit and the Letter", "treatise"),
    "1401": ("On Christian Doctrine", "treatise"),
    "1402": ("Enchiridion", "treatise"),
    "1403": ("On the Holy Trinity", "treatise"),
    "1404": ("City of God", "treatise"),
    "1405": ("Harmony of the Gospels", "treatise"),
    "1406": ("Tractates on the Gospel of John", "treatise"),
    "1407": ("Tractates on the Epistle of John", "treatise"),
    "1408": ("On Baptism Against the Donatists", "treatise"),
    "14081": ("On Baptism Against the Donatists Book I", "treatise"),
    "14082": ("On Baptism Against the Donatists Book II", "treatise"),
    "14083": ("On Baptism Against the Donatists Book III", "treatise"),
    "14084": ("On Baptism Against the Donatists Book IV", "treatise"),
    "14085": ("On Baptism Against the Donatists Book V", "treatise"),
    "14086": ("On Baptism Against the Donatists Book VI", "treatise"),
    "14087": ("On Baptism Against the Donatists Book VII", "treatise"),
    "1409": ("Answer to Petilian the Donatist", "treatise"),
    "14091": ("Answer to Petilian Book I", "treatise"),
    "14092": ("Answer to Petilian Book II", "treatise"),
    "14093": ("Answer to Petilian Book III", "treatise"),
    "1501": ("On Nature and Grace", "treatise"),
    "1502": ("On Mans Perfection in Righteousness", "treatise"),
    "1503": ("On the Proceedings of Pelagius", "treatise"),
    "1504": ("On Grace and Free Will", "treatise"),
    "1505": ("On Rebuke and Grace", "treatise"),
    "1506": ("On the Grace of Christ and Original Sin", "treatise"),
    "1507": ("On Marriage and Concupiscence", "treatise"),
    "1508": ("On the Soul and Its Origin", "treatise"),
    "1509": ("Against Two Letters of the Pelagians", "treatise"),
    "1510": ("Against Julian", "treatise"),
    "1512": ("On the Predestination of the Saints", "treatise"),
    "1513": ("On the Gift of Perseverance", "treatise"),
    "1601": ("Our Lords Sermon on the Mount", "sermon"),
    "1602": ("Harmony of the Gospels", "treatise"),
    "1603": ("Sermons on New Testament Lessons", "sermon"),
    "1701": ("Tractates on the Gospel of John", "treatise"),
    "1702": ("Homilies on the First Epistle of John", "treatise"),
    "1703": ("Soliloquies", "treatise"),
    "1801": ("Expositions on the Book of Psalms", "treatise"),
}

aug_pattern = re.compile(r'https://www\.newadvent\.org/fathers/(\d+)\.htm')

print("=== Scanning tool-results for Augustine pages ===")
found = {}
for f in sorted(Path(TR).glob("mcp-workspace-web_fetch-*.txt")):
    try:
        lines = f.read_text(encoding='utf-8', errors='replace').splitlines()
        for line in lines[:5]:
            m = aug_pattern.search(line)
            if m:
                work_id = m.group(1)
                if work_id not in found:
                    found[work_id] = str(f)
                break
    except:
        pass

print(f"Found {len(found)} fetch files for Augustine pages")
processed = 0
skipped = 0
failed = 0

for work_id in sorted(found.keys()):
    fpath = found[work_id]
    dest_file = Path(DEST) / f"{work_id}.md"
    if dest_file.exists() and dest_file.stat().st_size > 500:
        skipped += 1
        continue

    title, work_type = TITLES.get(work_id, (f"Augustine Work {work_id}", "treatise"))
    cmd = [
        "python3", SCRIPT,
        "--work-id", work_id,
        "--title", title,
        "--dest", DEST,
        "--category", "fathers",
        "--work-type", work_type,
        "--author", "Augustine of Hippo",
        "--source", fpath
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"SAVED {work_id}: {result.stdout.strip()}")
        processed += 1
    else:
        print(f"FAILED {work_id}: {result.stderr.strip()[:100]}")
        failed += 1

print(f"\nDone: {processed} processed, {skipped} skipped (already saved), {failed} failed")
print(f"Total files in dest: {len(list(Path(DEST).glob('*.md')))}")
