"""Run a command inside the uv project env (uv run …). Works when uv is only on py -m uv."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: run_uv.py <command> [args...]", file=sys.stderr)
        return 2

    if shutil.which("uv"):
        cmd = ["uv", "run", *sys.argv[1:]]
    else:
        cmd = [sys.executable, "-m", "uv", "run", *sys.argv[1:]]

    return subprocess.call(cmd, cwd=ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
