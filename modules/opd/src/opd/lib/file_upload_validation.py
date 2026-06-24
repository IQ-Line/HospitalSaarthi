"""Validation helpers for patient health document uploads."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

MAX_HEALTH_DOCUMENT_BYTES = 10 * 1024 * 1024

ALLOWED_HEALTH_DOCUMENT_MIME_TYPES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    }
)


def sanitize_filename(name: str) -> str:
    base = Path(name).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", base).strip("._") or "document"


def generate_secure_filename(extension: str) -> str:
    ext = (
        extension.lower()
        if extension.startswith(".")
        else f".{extension.lower()}"
        if extension
        else ""
    )
    return f"{uuid.uuid4().hex}{ext}"


def sanitize_report_type_folder(report_type: str) -> str:
    sanitized = report_type.lower()
    sanitized = re.sub(r"[^a-z0-9]", "-", sanitized)
    sanitized = re.sub(r"-+", "-", sanitized).strip("-")
    return sanitized or "document"


def generate_health_document_path(
    patient_id: uuid.UUID,
    visit_id: uuid.UUID | None,
    hi_type: str,
) -> str:
    folder_type = sanitize_report_type_folder(hi_type)
    if visit_id is not None:
        return f"{patient_id}/{visit_id}/{folder_type}"
    return f"{patient_id}/general/{folder_type}"


def validate_health_document_upload(mime_type: str, size_bytes: int) -> None:
    if mime_type not in ALLOWED_HEALTH_DOCUMENT_MIME_TYPES:
        raise ValueError("Only PDF, JPEG, JPG, and PNG files are allowed")
    if size_bytes <= 0:
        raise ValueError("Uploaded file is empty")
    if size_bytes > MAX_HEALTH_DOCUMENT_BYTES:
        raise ValueError("Please compress and upload below 10 MB size file")
