"""Report logo data URL — same asset as desk print (`services/web/public/reportLogo.svg`)."""

from __future__ import annotations

import base64
import logging
import urllib.error
import urllib.request
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

logger = logging.getLogger(__name__)

_EMBEDDED_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="Hospital emblem">'
    '<rect fill="#9d174d" width="80" height="80" rx="8"/>'
    '<text x="40" y="52" font-family="Arial,sans-serif" font-size="28" '
    'font-weight="bold" fill="#ffffff" text-anchor="middle">H</text>'
    "</svg>"
)

_EMBEDDED_FALLBACK_DATA_URL = "data:image/svg+xml," + quote(_EMBEDDED_SVG, safe="")


def _workspace_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "nx.json").is_file():
            return parent
    return Path(__file__).resolve().parents[5]


def _svg_to_data_url(svg_text: str) -> str:
    return "data:image/svg+xml," + quote(svg_text.strip(), safe="")


@lru_cache
def load_report_logo_data_url() -> str:
    """Load the same SVG the web app serves at `/reportLogo.svg`."""
    svg_path = _workspace_root() / "services" / "web" / "public" / "reportLogo.svg"
    try:
        if svg_path.is_file():
            return _svg_to_data_url(svg_path.read_text(encoding="utf-8"))
    except OSError as exc:
        logger.warning("report logo: could not read %s: %s", svg_path, exc)
    return _EMBEDDED_FALLBACK_DATA_URL


# Back-compat alias used across OPD report code.
DEFAULT_REPORT_LOGO_DATA_URL = load_report_logo_data_url()


def fetch_remote_logo_as_data_url(url: str, *, timeout: float = 10.0) -> str | None:
    """Fetch tenant / web-origin logo for server-side PDF rendering."""
    candidate = url.strip()
    if not candidate or candidate.startswith("data:"):
        return candidate or None
    if not candidate.startswith(("http://", "https://")):
        return None

    try:
        req = urllib.request.Request(candidate, headers={"User-Agent": "hims-opd-clinical-report"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            payload = response.read()
        if not payload:
            return None

        content_type = (response.headers.get_content_type() or "").split(";")[0].strip().lower()
        if candidate.lower().endswith(".svg") or content_type == "image/svg+xml":
            return _svg_to_data_url(payload.decode("utf-8", errors="replace"))
        if not content_type.startswith("image/"):
            content_type = "image/png"
        encoded = base64.b64encode(payload).decode("ascii")
        return f"data:{content_type};base64,{encoded}"
    except (urllib.error.URLError, OSError, ValueError) as exc:
        logger.warning("report logo fetch failed for %r: %s", candidate, exc)
        return None
