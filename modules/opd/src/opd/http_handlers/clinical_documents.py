from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from opd.core.deps import DbSession, TenantId
from opd.lib.build_clinical_report_payload import ClinicalReportType
from opd.lib.clinical_report_context import ClinicalReportContext
from opd.services.clinical_documents_service import (
    get_clinical_report_html,
    get_clinical_report_pdf,
)

router = APIRouter(prefix="/visits", tags=["ClinicalDocuments"])


def _clinical_context_from_query(
    facility_name: str | None = None,
    facility_id: str | None = None,
    facility_address: str | None = None,
    facility_phone: str | None = None,
    facility_email: str | None = None,
    department_name: str | None = None,
    doctor_name: str | None = None,
    patient_address: str | None = None,
    request_id: str | None = None,
) -> ClinicalReportContext:
    return ClinicalReportContext(
        facility_name=facility_name,
        facility_id=facility_id,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        department_name=department_name,
        doctor_name=doctor_name,
        patient_address=patient_address,
        request_id=request_id,
    )


def _handle_report_errors(exc: Exception) -> HTTPException:
    if isinstance(exc, LookupError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "pdf_renderer_unavailable", "message": str(exc)},
        )
    raise exc


def _render_visit_report_pdf(
    db: DbSession,
    tenant_id: TenantId,
    visit_id: UUID,
    report_type: ClinicalReportType,
    context: ClinicalReportContext,
) -> Response:
    try:
        result = get_clinical_report_pdf(
            db,
            tenant_id,
            visit_id,
            report_type,
            context,
        )
    except (LookupError, PermissionError, ValueError, RuntimeError) as exc:
        raise _handle_report_errors(exc) from exc

    return Response(
        content=result.pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{result.filename}"'},
    )


def _render_visit_report_html(
    db: DbSession,
    tenant_id: TenantId,
    visit_id: UUID,
    report_type: ClinicalReportType,
    context: ClinicalReportContext,
) -> Response:
    try:
        result = get_clinical_report_html(
            db,
            tenant_id,
            visit_id,
            report_type,
            context,
        )
    except (LookupError, PermissionError, ValueError, RuntimeError) as exc:
        raise _handle_report_errors(exc) from exc

    return Response(
        content=result.html,
        media_type="text/html; charset=utf-8",
    )


@router.get("/{visit_id}/documents/prescription.pdf")
def get_prescription_report_pdf(
    visit_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    facility_name: Annotated[str | None, Query()] = None,
    facility_id: Annotated[str | None, Query()] = None,
    facility_address: Annotated[str | None, Query()] = None,
    facility_phone: Annotated[str | None, Query()] = None,
    facility_email: Annotated[str | None, Query()] = None,
    department_name: Annotated[str | None, Query()] = None,
    doctor_name: Annotated[str | None, Query()] = None,
    patient_address: Annotated[str | None, Query()] = None,
    x_request_id: Annotated[str | None, Query(alias="x-request-id")] = None,
) -> Response:
    context = _clinical_context_from_query(
        facility_name=facility_name,
        facility_id=facility_id,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        department_name=department_name,
        doctor_name=doctor_name,
        patient_address=patient_address,
        request_id=x_request_id,
    )
    return _render_visit_report_pdf(db, tenant_id, visit_id, "prescription", context)


@router.get("/{visit_id}/documents/op-consultation.pdf")
def get_op_consultation_report_pdf(
    visit_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    facility_name: Annotated[str | None, Query()] = None,
    facility_id: Annotated[str | None, Query()] = None,
    facility_address: Annotated[str | None, Query()] = None,
    facility_phone: Annotated[str | None, Query()] = None,
    facility_email: Annotated[str | None, Query()] = None,
    department_name: Annotated[str | None, Query()] = None,
    doctor_name: Annotated[str | None, Query()] = None,
    patient_address: Annotated[str | None, Query()] = None,
    x_request_id: Annotated[str | None, Query(alias="x-request-id")] = None,
) -> Response:
    context = _clinical_context_from_query(
        facility_name=facility_name,
        facility_id=facility_id,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        department_name=department_name,
        doctor_name=doctor_name,
        patient_address=patient_address,
        request_id=x_request_id,
    )
    return _render_visit_report_pdf(db, tenant_id, visit_id, "op-consultation", context)


@router.get("/{visit_id}/documents/immunization.pdf")
def get_immunization_report_pdf(
    visit_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    facility_name: Annotated[str | None, Query()] = None,
    facility_id: Annotated[str | None, Query()] = None,
    facility_address: Annotated[str | None, Query()] = None,
    facility_phone: Annotated[str | None, Query()] = None,
    facility_email: Annotated[str | None, Query()] = None,
    department_name: Annotated[str | None, Query()] = None,
    doctor_name: Annotated[str | None, Query()] = None,
    patient_address: Annotated[str | None, Query()] = None,
    x_request_id: Annotated[str | None, Query(alias="x-request-id")] = None,
) -> Response:
    context = _clinical_context_from_query(
        facility_name=facility_name,
        facility_id=facility_id,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        department_name=department_name,
        doctor_name=doctor_name,
        patient_address=patient_address,
        request_id=x_request_id,
    )
    return _render_visit_report_pdf(db, tenant_id, visit_id, "immunization", context)


@router.get("/{visit_id}/documents/prescription.html")
def get_prescription_report_html(
    visit_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    facility_name: Annotated[str | None, Query()] = None,
    facility_id: Annotated[str | None, Query()] = None,
    facility_address: Annotated[str | None, Query()] = None,
    facility_phone: Annotated[str | None, Query()] = None,
    facility_email: Annotated[str | None, Query()] = None,
    department_name: Annotated[str | None, Query()] = None,
    doctor_name: Annotated[str | None, Query()] = None,
    patient_address: Annotated[str | None, Query()] = None,
    x_request_id: Annotated[str | None, Query(alias="x-request-id")] = None,
) -> Response:
    context = _clinical_context_from_query(
        facility_name=facility_name,
        facility_id=facility_id,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        department_name=department_name,
        doctor_name=doctor_name,
        patient_address=patient_address,
        request_id=x_request_id,
    )
    return _render_visit_report_html(db, tenant_id, visit_id, "prescription", context)


@router.get("/{visit_id}/documents/op-consultation.html")
def get_op_consultation_report_html(
    visit_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    facility_name: Annotated[str | None, Query()] = None,
    facility_id: Annotated[str | None, Query()] = None,
    facility_address: Annotated[str | None, Query()] = None,
    facility_phone: Annotated[str | None, Query()] = None,
    facility_email: Annotated[str | None, Query()] = None,
    department_name: Annotated[str | None, Query()] = None,
    doctor_name: Annotated[str | None, Query()] = None,
    patient_address: Annotated[str | None, Query()] = None,
    x_request_id: Annotated[str | None, Query(alias="x-request-id")] = None,
) -> Response:
    context = _clinical_context_from_query(
        facility_name=facility_name,
        facility_id=facility_id,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        department_name=department_name,
        doctor_name=doctor_name,
        patient_address=patient_address,
        request_id=x_request_id,
    )
    return _render_visit_report_html(db, tenant_id, visit_id, "op-consultation", context)


@router.get("/{visit_id}/documents/immunization.html")
def get_immunization_report_html(
    visit_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    facility_name: Annotated[str | None, Query()] = None,
    facility_id: Annotated[str | None, Query()] = None,
    facility_address: Annotated[str | None, Query()] = None,
    facility_phone: Annotated[str | None, Query()] = None,
    facility_email: Annotated[str | None, Query()] = None,
    department_name: Annotated[str | None, Query()] = None,
    doctor_name: Annotated[str | None, Query()] = None,
    patient_address: Annotated[str | None, Query()] = None,
    x_request_id: Annotated[str | None, Query(alias="x-request-id")] = None,
) -> Response:
    context = _clinical_context_from_query(
        facility_name=facility_name,
        facility_id=facility_id,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        department_name=department_name,
        doctor_name=doctor_name,
        patient_address=patient_address,
        request_id=x_request_id,
    )
    return _render_visit_report_html(db, tenant_id, visit_id, "immunization", context)
