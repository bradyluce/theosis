#!/usr/bin/env python3
"""
Batch downloader for Augustine works from newadvent.org.
Reads pre-fetched JSON overflow files or inline text files from /tmp.
"""
import subprocess, json, sys, time
from pathlib import Path

DEST = "/sessions/zealous-elegant-rubin/mnt/theosis/content/raw/fathers/augustine"
SCRIPT = "/sessions/zealous-elegant-rubin/mnt/theosis/scripts/process_fetch.py"

def extract_json(json_path, out_path):
    data = json.loads(Path(json_path).read_text(encoding='utf-8'))
    if isinstance(data, list):
        text = ''.join(item.get('text','') for item in data if item.get('type')=='text')
    else:
        text = str(data)
    Path(out_path).write_text(text, encoding='utf-8')

def run_process(work_id, title, work_type, src):
    r = subprocess.run([
        'python3', SCRIPT,
        '--work-id', work_id, '--title', title,
        '--dest', DEST, '--category', 'fathers',
        '--work-type', work_type, '--author', 'Augustine of Hippo',
        '--source', src
    ], capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode != 0:
        print("ERR:", r.stderr.strip(), file=sys.stderr)
    return r.returncode == 0

def process_inline(work_id, title, work_type, text):
    tmp = f"/tmp/aug_{work_id}.txt"
    Path(tmp).write_text(text, encoding='utf-8')
    return run_process(work_id, title, work_type, tmp)

def process_overflow(work_id, title, work_type, json_path):
    tmp = f"/tmp/aug_{work_id}.txt"
    extract_json(json_path, tmp)
    return run_process(work_id, title, work_type, tmp)

if __name__ == "__main__":
    # Test
    print("aug_download.py loaded OK")
