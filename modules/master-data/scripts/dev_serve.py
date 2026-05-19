"""Start uvicorn for local dev; port from MASTER_DATA_SVC_PORT (default 8010)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    port = os.environ.get("MASTER_DATA_SVC_PORT", "8010").strip() or "8010"
    # Loopback only in dev: avoids Windows stale 0.0.0.0:8010 listeners from crashed
    # uvicorn --reload parent/child pairs shadowing the real process (BFF uses localhost).
    host = os.environ.get("MASTER_DATA_SVC_HOST", "127.0.0.1").strip() or "127.0.0.1"
    print(f"[master-data] starting uvicorn on http://{host}:{port}", flush=True)
    return subprocess.call(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            host,
            "--port",
            port,
            "--reload",
        ],
        cwd=ROOT,
    )


if __name__ == "__main__":
    raise SystemExit(main())
