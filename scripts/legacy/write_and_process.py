#!/usr/bin/env python3
"""
write_and_process.py — Write base64-encoded content to /tmp and call process_fetch.py
Usage: python3 write_and_process.py WORK_ID TITLE DEST CATEGORY WORK_TYPE AUTHOR BASE64_CONTENT
"""
import sys, base64, subprocess, os
from pathlib import Path

work_id = sys.argv[1]
title = sys.argv[2]
dest = sys.argv[3]
category = sys.argv[4]
work_type = sys.argv[5]
author = sys.argv[6]
b64_content = sys.argv[7]

# Write content to /tmp
tmp_file = f'/tmp/cap_{work_id}.txt'
content = base64.b64decode(b64_content).decode('utf-8')
Path(tmp_file).write_text(content, encoding='utf-8')

# Run process_fetch.py
result = subprocess.run([
    'python3',
    '/sessions/zealous-elegant-rubin/mnt/theosis/scripts/process_fetch.py',
    '--work-id', work_id,
    '--title', title,
    '--dest', dest,
    '--category', category,
    '--work-type', work_type,
    '--author', author,
    '--source', tmp_file
], capture_output=True, text=True)
print(result.stdout.strip())
if result.stderr:
    print("ERR:", result.stderr.strip(), file=sys.stderr)
