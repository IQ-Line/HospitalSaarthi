"""OP consultation report PDF — reuse health_documents + pdf-platform (same report as desk)."""

from __future__ import annotations

import base64
import json
import logging
import urllib.error
import urllib.request
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from opd.core.config import get_azure_blob_settings, get_service_integration_settings
from opd.data_access.health_document_repo import HealthDocumentRepository
from opd.lib import azure_blob_storage
from opd.lib.file_upload_validation import generate_health_document_path
from opd.models.health_document import HealthDocument

logger = logging.getLogger(__name__)

OP_CONSULT_HI_TYPE = "OP Consultation Record"
OP_CONSULT_DOCUMENT_TITLE = "OP Consultation Report"
OPD_SLIP_HI_TYPE = "Consultation Notes"
OPD_SLIP_DOCUMENT_TITLE = "Consultation Notes"


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _package_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent.parent


def _workspace_root() -> Path:
    for parent in _package_root().parents:
        if (parent / "nx.json").is_file():
            return parent
    return _package_root().parent.parent


@lru_cache
def _report_print_css() -> str:
    css_path = (
        _workspace_root() / "packages" / "registration-reports" / "src" / "report-print.css"
    )
    if css_path.is_file():
        return css_path.read_text(encoding="utf-8")
    return (
        ".report-print-root { font-family: Arial, sans-serif; font-size: 11px; color: #1a202c; }"
        ".report-content { padding: 16px; }"
    )


def wrap_op_consult_report_document(
    *,
    patient_name: str,
    practitioner_name: str,
    clinical_html: str,
) -> str:
    """Full HTML document for pdf-platform (shared print CSS with registration reports)."""
    ts = datetime.now(UTC).strftime("%d %b %Y, %H:%M UTC")
    css = _report_print_css()
    safe_patient = _escape_html(patient_name)
    safe_practitioner = _escape_html(practitioner_name)
    return f"""<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="utf-8"/>
  <style>{css}</style>
</head>
<body>
  <div class="report-print-root">
    <header class="report-header">
      <div class="report-title">{OP_CONSULT_DOCUMENT_TITLE}</div>
    </header>
    <main class="report-content">
      <div class="patient-info-block">
        <table class="patient-info-table">
          <tr><td class="label">Patient</td><td>{safe_patient}</td></tr>
          <tr><td class="label">Consultant</td><td>{safe_practitioner}</td></tr>
          <tr><td class="label">Date</td><td>{ts}</td></tr>
        </table>
      </div>
      {clinical_html}
    </main>
  </div>
</body>
</html>"""


def _pdf_platform_base_url() -> str | None:
    base = (get_service_integration_settings().pdf_platform_url or "").strip().rstrip("/")
    return base or None


def _pdf_literal(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _fallback_pdf_bytes(summary: str) -> bytes:
    """Valid minimal PDF when pdf-platform is unreachable (PHR requires application/pdf)."""
    lines: list[str] = []
    for block in summary.split("\n\n"):
        for line in block.split("\n"):
            stripped = line.strip()
            if stripped:
                lines.append(stripped[:100])
    if not lines:
        lines = [OP_CONSULT_DOCUMENT_TITLE]

    stream_parts = ["BT", "/F1 11 Tf", "50 750 Td"]
    for idx, line in enumerate(lines[:45]):
        if idx > 0:
            stream_parts.append("0 -14 Td")
        stream_parts.append(f"({_pdf_literal(line)}) Tj")
    stream_parts.append("ET")
    stream = "\n".join(stream_parts).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
        ),
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode()
    )
    return bytes(pdf)


def _render_pdf_via_platform(html: str) -> bytes | None:
    base = _pdf_platform_base_url()
    if not base:
        logger.info("OP consult report: PDF_PLATFORM_URL not set; using fallback PDF")
        return None

    body = json.dumps(
        {
            "html": html,
            "options": {
                "format": "A4",
                "marginTop": "0.39in",
                "marginBottom": "0.39in",
                "marginLeft": "0.39in",
                "marginRight": "0.39in",
            },
        }
    ).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/pdf"}
    api_key = (get_service_integration_settings().pdf_platform_api_key or "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        f"{base}/v1/pdf/render-html",
        data=body,
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            return res.read()
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, TimeoutError) as exc:
        logger.warning("pdf-platform OP consult render failed: %s", exc)
        return None


def _latest_document_by_hi_type(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    hi_type: str,
) -> HealthDocument | None:
    stmt = (
        select(HealthDocument)
        .where(
            HealthDocument.tenant_id == tenant_id,
            HealthDocument.visit_id == visit_id,
            HealthDocument.hi_type == hi_type,
            HealthDocument.status == "active",
            HealthDocument.mime_type == "application/pdf",
        )
        .order_by(HealthDocument.uploaded_at.desc())
        .limit(1)
    )
    return session.scalar(stmt)


def _latest_op_consult_document(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
) -> HealthDocument | None:
    return _latest_document_by_hi_type(session, tenant_id, visit_id, OP_CONSULT_HI_TYPE)


def _load_stored_pdf_base64(session: Session, tenant_id: UUID, visit_id: UUID) -> str | None:
    row = _latest_op_consult_document(session, tenant_id, visit_id)
    if row is None:
        return None
    try:
        content, _ = azure_blob_storage.download_health_document_bytes(row.storage_key)
    except (RuntimeError, OSError) as exc:
        logger.warning("Could not download OP consult report for visit %s: %s", visit_id, exc)
        return None
    if not content:
        return None
    return base64.b64encode(content).decode("ascii")


def _store_op_consult_pdf(
    session: Session,
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    pdf_bytes: bytes,
) -> None:
    if not get_azure_blob_settings().connection_string:
        return

    folder = generate_health_document_path(patient_id, visit_id, OP_CONSULT_HI_TYPE)
    blob = azure_blob_storage.upload_health_document_blob(
        pdf_bytes,
        "op-consultation-report.pdf",
        "application/pdf",
        folder,
    )
    repo = HealthDocumentRepository(session, tenant_id)
    repo.create(
        patient_id=patient_id,
        visit_id=visit_id,
        hi_type=OP_CONSULT_HI_TYPE,
        document_title=OP_CONSULT_DOCUMENT_TITLE,
        original_file_name="op-consultation-report.pdf",
        storage_key=blob.storage_key,
        blob_url=blob.blob_url,
        mime_type="application/pdf",
        file_size_bytes=len(pdf_bytes),
        uploaded_by=None,
    )


def ensure_op_consult_report_pdf_base64(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    patient_id: UUID,
    *,
    report_html: str,
    fallback_summary: str,
) -> str | None:
    """
    Return base64 PDF for the visit OP consultation report.
    Reuses an existing health document when present; otherwise renders via pdf-platform.
    """
    existing = _load_stored_pdf_base64(session, tenant_id, visit_id)
    if existing:
        return existing

    pdf_bytes = _render_pdf_via_platform(report_html)
    if not pdf_bytes:
        logger.warning(
            "OP consult report for visit %s: pdf-platform unavailable; using fallback PDF",
            visit_id,
        )
        pdf_bytes = _fallback_pdf_bytes(fallback_summary)

    try:
        if get_azure_blob_settings().connection_string:
            _store_op_consult_pdf(
                session,
                tenant_id=tenant_id,
                patient_id=patient_id,
                visit_id=visit_id,
                pdf_bytes=pdf_bytes,
            )
            session.commit()
    except Exception as exc:
        session.rollback()
        logger.warning("Could not persist OP consult report for visit %s: %s", visit_id, exc)

    return base64.b64encode(pdf_bytes).decode("ascii")


def _store_health_document_pdf(
    session: Session,
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    hi_type: str,
    document_title: str,
    file_name: str,
    pdf_bytes: bytes,
) -> HealthDocument | None:
    if not get_azure_blob_settings().connection_string:
        return None

    folder = generate_health_document_path(patient_id, visit_id, hi_type)
    blob = azure_blob_storage.upload_health_document_blob(
        pdf_bytes,
        file_name,
        "application/pdf",
        folder,
    )
    repo = HealthDocumentRepository(session, tenant_id)
    return repo.create(
        patient_id=patient_id,
        visit_id=visit_id,
        hi_type=hi_type,
        document_title=document_title,
        original_file_name=file_name,
        storage_key=blob.storage_key,
        blob_url=blob.blob_url,
        mime_type="application/pdf",
        file_size_bytes=len(pdf_bytes),
        uploaded_by=None,
    )


def ensure_opd_slip_health_document(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    patient_id: UUID,
    *,
    report_html: str,
    fallback_summary: str,
) -> HealthDocument | None:
    """
    Ensure an OPD slip health document exists for ABDM HealthDocumentRecord linking.
    Reuses existing Consultation Notes row when present; otherwise renders and stores PDF.
    """
    existing = _latest_document_by_hi_type(session, tenant_id, visit_id, OPD_SLIP_HI_TYPE)
    if existing is not None:
        return existing

    pdf_bytes = _render_pdf_via_platform(report_html)
    if not pdf_bytes:
        logger.warning(
            "OPD slip for visit %s: pdf-platform unavailable; using fallback PDF",
            visit_id,
        )
        pdf_bytes = _fallback_pdf_bytes(fallback_summary)

    try:
        row = _store_health_document_pdf(
            session,
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
            hi_type=OPD_SLIP_HI_TYPE,
            document_title=OPD_SLIP_DOCUMENT_TITLE,
            file_name="canvas-consultation.pdf",
            pdf_bytes=pdf_bytes,
        )
        if row is not None:
            session.commit()
        return row
    except Exception as exc:
        session.rollback()
        logger.warning("Could not persist OPD slip health document for visit %s: %s", visit_id, exc)
        return None
