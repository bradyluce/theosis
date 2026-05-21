#!/usr/bin/env python3
"""Convert Windows tool-results path to bash path for this session."""
import sys, re

WIN_PREFIX = r"C:\Users\bkluc\AppData\Roaming\Claude\local-agent-mode-sessions"
BASH_PREFIX = "/sessions/zealous-elegant-rubin/mnt/.claude/../../.."

def convert(win_path: str) -> str:
    """Convert a Windows tool-results path to bash-accessible path."""
    # Normalize slashes
    p = win_path.strip().replace("\\", "/")
    
    # The tool-results are under the session's .claude/projects/... directory
    # Windows: C:\Users\bkluc\AppData\Roaming\Claude\local-agent-mode-sessions\<session>\<agent>\.claude\projects\...\tool-results\file.txt
    # Bash:    /sessions/zealous-elegant-rubin/mnt/.claude/projects/.../tool-results/file.txt
    
    WIN_ROAMING = "C:/Users/bkluc/AppData/Roaming/Claude/local-agent-mode-sessions"
    BASH_SESSION = "/sessions/zealous-elegant-rubin/mnt"
    
    if p.startswith(WIN_ROAMING):
        # Strip the session/agent prefix, keep from .claude onwards
        remainder = p[len(WIN_ROAMING):]
        # remainder looks like: /e828.../6d95.../.claude/projects/.../tool-results/file.txt
        # We need to find ".claude" in the path
        idx = remainder.find("/.claude/")
        if idx != -1:
            from_claude = remainder[idx:]  # /.claude/projects/.../file.txt
            return BASH_SESSION + from_claude
    
    return p  # fallback: return as-is with forward slashes

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(convert(" ".join(sys.argv[1:])))
    else:
        for line in sys.stdin:
            print(convert(line.rstrip()))
