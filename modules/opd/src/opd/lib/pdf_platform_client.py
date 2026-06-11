from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from opd.core.config import get_settings
from opd.lib.build_clinical_report_payload import REPORT_SLUG_BY_TYPE, ClinicalReportType


class PdfPlatformRenderError(RuntimeError):
    def __init__(self, message: str, *, status_code: int, response_body: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


def _join_url(base: str, path: str) -> str:
    b = base.rstrip("/")
    p = path if path.startswith("/") else f"/{path}"
    return f"{b}{p}"


def _omit_none(value: Any) -> Any:
    """Drop null keys — pdf-platform Zod schemas are `.strict()` and reject JSON null on optionals."""
    if isinstance(value, dict):
        return {key: _omit_none(item) for key, item in value.items() if item is not None}
    if isinstance(value, list):
        return [_omit_none(item) for item in value]
    return value


def _format_pdf_platform_error(status_code: int, reason: str, body: str) -> str:
    if not body.strip():
        return f"pdf-platform render failed: {status_code} {reason}"
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return f"pdf-platform render failed: {status_code} {reason} — {body[:500]}"
    if isinstance(parsed, dict):
        detail = parsed.get("message") or parsed.get("error") or parsed.get("detail")
        if detail:
            return f"pdf-platform render failed: {status_code} {reason} — {detail}"
    return f"pdf-platform render failed: {status_code} {reason} — {body[:500]}"


def _post_clinical_report(
    report_type: ClinicalReportType,
    request_body: dict[str, Any],
    *,
    accept: str,
    request_id: str | None = None,
) -> bytes:
    settings = get_settings()
    if not settings.pdf_platform_url.strip():
        raise PdfPlatformRenderError(
            "PDF platform URL is not configured",
            status_code=503,
            response_body="",
        )

    slug = REPORT_SLUG_BY_TYPE[report_type]
    suffix = "/html" if accept.startswith("text/html") else ""
    url = _join_url(settings.pdf_platform_url, f"/v1/pdf/reports/{slug}{suffix}")
    payload = json.dumps(_omit_none(request_body)).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Accept": accept,
    }
    if request_id:
        headers["x-request-id"] = request_id
    if settings.pdf_platform_api_key:
        headers["Authorization"] = f"Bearer {settings.pdf_platform_api_key}"

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=settings.pdf_platform_timeout_seconds) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise PdfPlatformRenderError(
            _format_pdf_platform_error(exc.code, exc.reason, body),
            status_code=exc.code,
            response_body=body,
        ) from exc
    except urllib.error.URLError as exc:
        raise PdfPlatformRenderError(
            f"pdf-platform unreachable: {exc.reason}",
            status_code=503,
            response_body="",
        ) from exc


def render_clinical_report_pdf(
    report_type: ClinicalReportType,
    request_body: dict[str, Any],
    *,
    request_id: str | None = None,
) -> bytes:
    return _post_clinical_report(
        report_type,
        request_body,
        accept="application/pdf",
        request_id=request_id,
    )


def render_clinical_report_html(
    report_type: ClinicalReportType,
    request_body: dict[str, Any],
    *,
    request_id: str | None = None,
) -> str:
    raw = _post_clinical_report(
        report_type,
        request_body,
        accept="text/html",
        request_id=request_id,
    )
    return raw.decode("utf-8")
