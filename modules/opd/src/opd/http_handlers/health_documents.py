"""Patient health document upload, list, and download (Azure Blob)."""

from __future__ import annotations

from math import ceil
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import RedirectResponse, Response

from opd.core.deps import DbSession, TenantId
from opd.core.principal import resolve_doctor_id
from opd.core.schemas_api import (
    HealthDocumentDownloadResponse,
    HealthDocumentListResponse,
    HealthDocumentSummary,
    HealthDocumentUploadResponse,
)
from opd.data_access.health_document_repo import HealthDocumentRepository
from opd.lib import azure_blob_storage
from opd.lib.file_upload_validation import (
    generate_health_document_path,
    sanitize_filename,
    validate_health_document_upload,
)

router = APIRouter(tags=["OpdHealthDocuments"])

UploaderId = Annotated[UUID, Depends(resolve_doctor_id)]


def _download_path(document_id: UUID) -> str:
    return f"/api/v1/opd/health-documents/{document_id}/download"


def _to_summary(row) -> HealthDocumentSummary:
    return HealthDocumentSummary(
        id=row.id,
        patient_id=row.patient_id,
        visit_id=row.visit_id,
        file_name=row.original_file_name,
        file_type=row.mime_type,
        document_title=row.document_title,
        hi_type=row.hi_type,
        uploaded_at=row.uploaded_at,
        download_url=_download_path(row.id),
    )


def _azure_unavailable(exc: Exception) -> HTTPException:
    return HTTPException(status_code=503, detail=str(exc))


def _accepts_json_sas_url(accept_header: str) -> bool:
    """JSON SAS URL only when the client did not ask for a file MIME type."""
    lowered = accept_header.lower()
    if "application/json" not in lowered:
        return False
    for binary in (
        "application/pdf",
        "application/octet-stream",
        "image/jpeg",
        "image/jpg",
        "image/png",
    ):
        if binary in lowered:
            return False
    return True


@router.post(
    "/patients/{patient_id}/health-documents",
    response_model=HealthDocumentUploadResponse,
    status_code=201,
)
async def upload_patient_health_document(
    patient_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    uploaded_by: UploaderId,
    file: UploadFile = File(...),
    hi_type: str = Form(...),
    document_title: str = Form(...),
    visit_id: UUID | None = Form(default=None),
) -> HealthDocumentUploadResponse:
    content = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    try:
        validate_health_document_upload(mime_type, len(content))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    folder_path = generate_health_document_path(patient_id, visit_id, hi_type)
    try:
        blob = azure_blob_storage.upload_health_document_blob(
            content,
            file.filename or "document",
            mime_type,
            folder_path,
        )
    except RuntimeError as exc:
        raise _azure_unavailable(exc) from exc

    repo = HealthDocumentRepository(db, tenant_id)
    row = repo.create(
        patient_id=patient_id,
        visit_id=visit_id,
        hi_type=hi_type.strip(),
        document_title=document_title.strip(),
        original_file_name=file.filename or "document",
        storage_key=blob.storage_key,
        blob_url=blob.blob_url,
        mime_type=mime_type,
        file_size_bytes=len(content),
        uploaded_by=uploaded_by,
    )
    db.commit()
    return HealthDocumentUploadResponse(
        id=row.id,
        patient_id=row.patient_id,
        visit_id=row.visit_id,
        file_name=row.original_file_name,
        file_type=row.mime_type,
        document_title=row.document_title,
        hi_type=row.hi_type,
        uploaded_at=row.uploaded_at,
    )


@router.get(
    "/patients/{patient_id}/health-documents",
    response_model=HealthDocumentListResponse,
)
def list_patient_health_documents(
    patient_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    visit_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
) -> HealthDocumentListResponse:
    repo = HealthDocumentRepository(db, tenant_id)
    rows, total = repo.list_for_patient(
        patient_id=patient_id,
        visit_id=visit_id,
        page=page,
        limit=limit,
    )
    db.commit()
    total_pages = max(1, ceil(total / limit)) if total else 0
    return HealthDocumentListResponse(
        success=True,
        count=len(rows),
        total=total,
        total_pages=total_pages,
        current_page=page,
        limit=limit,
        data=[_to_summary(row) for row in rows],
    )


@router.get(
    "/health-documents/{document_id}/download",
    response_model=HealthDocumentDownloadResponse,
    responses={
        200: {
            "description": "File bytes (when Accept is a file MIME type, not JSON-only)",
            "content": {"application/octet-stream": {}},
        },
        302: {"description": "Redirect to Azure Blob SAS URL (legacy clients)"},
    },
)
def download_health_document(
    document_id: UUID,
    request: Request,
    db: DbSession,
    tenant_id: TenantId,
) -> HealthDocumentDownloadResponse | RedirectResponse | Response:
    repo = HealthDocumentRepository(db, tenant_id)
    row = repo.get(document_id)
    if row is None or row.status != "active":
        raise HTTPException(status_code=404, detail="Document not found")

    accept = request.headers.get("accept", "")
    if _accepts_json_sas_url(accept):
        try:
            sas_url = azure_blob_storage.generate_blob_sas_url(
                row.blob_url,
                storage_key=row.storage_key,
                download_file_name=row.original_file_name,
            )
        except (RuntimeError, ValueError) as exc:
            raise _azure_unavailable(exc) from exc
        db.commit()
        return HealthDocumentDownloadResponse(url=sas_url)

    try:
        content, content_type = azure_blob_storage.download_health_document_bytes(row.storage_key)
    except RuntimeError as exc:
        raise _azure_unavailable(exc) from exc

    db.commit()
    if len(content) < 100:
        raise HTTPException(status_code=404, detail="Document file not found in storage")

    safe_name = sanitize_filename(row.original_file_name)
    media_type = row.mime_type or content_type
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Length": str(len(content)),
        },
    )
