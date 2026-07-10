from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from opd.core.config import get_settings
from opd.lib.build_clinical_report_payload import REPORT_SLUG_BY_TYPE, ClinicalReportType
from opd.lib.default_report_logo import load_report_logo_data_url

logger = logging.getLogger(__name__)

_LOGO_IMAGE_SRC_RE = re.compile(
    r'(<img(?=[^>]*\bclass="[^"]*logo-image[^"]*")[^>]*\ssrc=")([^"]+)(")',
    re.IGNORECASE,
)
_RELATIVE_REPORT_LOGO_SRC_RE = re.compile(
    r'(<img[^>]*\ssrc=")(/reportLogo\.(?:png|svg))(")',
    re.IGNORECASE,
)

_CLINICAL_PDF_RENDER_OPTIONS: dict[str, str] = {
    "format": "A4",
    "marginTop": "0",
    "marginBottom": "0",
    "marginLeft": "0",
    "marginRight": "0",
}


class PdfPlatformRenderError(RuntimeError):
    def __init__(self, message: str, *, status_code: int, response_body: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


def _join_url(base: str, path: str) -> str:
    b = base.rstrip("/")
    p = path if path.startswith("/") else f"/{path}"
    return f"{b}{p}"


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


def is_valid_pdf_bytes(pdf_bytes: bytes) -> bool:
    """Reject truncated render responses — incomplete PDFs break PHR bundle parsing."""
    if len(pdf_bytes) <= 100 or not pdf_bytes.startswith(b"%PDF-"):
        return False
    return pdf_bytes.rstrip().endswith(b"%%EOF")


def _logo_data_url_from_request(request_body: dict[str, Any]) -> str:
    facility = request_body.get("facility")
    if isinstance(facility, dict):
        logo = facility.get("logoUrl") or facility.get("logo")
        if isinstance(logo, str) and logo.strip().startswith("data:"):
            return logo.strip()
    return load_report_logo_data_url()


def inline_clinical_report_logo_in_html(html: str, logo_data_url: str) -> str:
    """Embed desk logo for Gotenberg — mirrors `inlineReportLogoForPdfCapture` on the web."""

    def _replace_logo_src(match: re.Match[str]) -> str:
        current = match.group(2).strip()
        if current.startswith("data:"):
            return match.group(0)
        return f"{match.group(1)}{logo_data_url}{match.group(3)}"

    html = _LOGO_IMAGE_SRC_RE.sub(_replace_logo_src, html)
    return _RELATIVE_REPORT_LOGO_SRC_RE.sub(_replace_logo_src, html)


def _merge_render_options(request_body: dict[str, Any]) -> dict[str, str]:
    options = dict(_CLINICAL_PDF_RENDER_OPTIONS)
    raw = request_body.get("options")
    if isinstance(raw, dict):
        for key, value in raw.items():
            if value is not None:
                options[key] = str(value)
    return options


def _post_render_html(
    html: str,
    *,
    options: dict[str, str] | None = None,
    request_id: str | None = None,
) -> bytes:
    settings = get_settings()
    if not settings.pdf_platform_url.strip():
        raise PdfPlatformRenderError(
            "PDF platform URL is not configured",
            status_code=503,
            response_body="",
        )

    body: dict[str, Any] = {"html": html}
    if options:
        body["options"] = options

    url = _join_url(settings.pdf_platform_url, "/v1/pdf/render-html")
    payload = json.dumps(body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/pdf",
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
        body_text = exc.read().decode("utf-8", errors="replace")
        raise PdfPlatformRenderError(
            _format_pdf_platform_error(exc.code, exc.reason, body_text),
            status_code=exc.code,
            response_body=body_text,
        ) from exc
    except urllib.error.URLError as exc:
        raise PdfPlatformRenderError(
            f"pdf-platform unreachable: {exc.reason}",
            status_code=503,
            response_body="",
        ) from exc


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
    # request_body arrives pre-cleaned from build_clinical_report_request
    # (model_dump(exclude_none=True)) — no None optionals to strip here.
    payload = json.dumps(request_body).encode("utf-8")

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
    logo_data_url = _logo_data_url_from_request(request_body)
    render_options = _merge_render_options(request_body)

    def _render_via_html() -> bytes:
        html = render_clinical_report_html(
            report_type,
            request_body,
            request_id=request_id,
        )
        html = inline_clinical_report_logo_in_html(html, logo_data_url)
        return _post_render_html(html, options=render_options, request_id=request_id)

    def _render_via_typed_endpoint() -> bytes:
        return _post_clinical_report(
            report_type,
            request_body,
            accept="application/pdf",
            request_id=request_id,
        )

    last_error: PdfPlatformRenderError | None = None
    for attempt, renderer in enumerate((_render_via_html, _render_via_typed_endpoint)):
        try:
            pdf_bytes = renderer()
            if is_valid_pdf_bytes(pdf_bytes):
                if attempt > 0:
                    logger.warning(
                        "clinical report %s PDF fell back to typed renderer (logo may be absent)",
                        report_type,
                    )
                return pdf_bytes
            logger.warning(
                "clinical report %s PDF renderer %s returned non-PDF payload (%s bytes)",
                report_type,
                attempt,
                len(pdf_bytes),
            )
        except PdfPlatformRenderError as exc:
            last_error = exc
            logger.warning(
                "clinical report %s PDF renderer %s failed: %s",
                report_type,
                attempt,
                exc,
            )

    if last_error is not None:
        raise last_error
    raise PdfPlatformRenderError(
        "Clinical report PDF render produced no valid PDF",
        status_code=502,
        response_body="",
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
