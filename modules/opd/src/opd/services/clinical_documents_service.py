from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from opd.data_access.prescription_repository import PrescriptionNotFoundError, PrescriptionRepository
from opd.data_access.registration_patient_source import load_visit_patient_source
from opd.lib.build_clinical_report_payload import (
    ClinicalReportType,
    build_clinical_report_request,
    clinical_payload_to_form_data,
    report_filename,
    validate_report_request,
)
from opd.lib.clinical_report_context import ClinicalReportContext
from opd.lib.master_data_client import fetch_visitpad_vitals_catalog
from opd.lib.pdf_platform_client import (
    PdfPlatformRenderError,
    render_clinical_report_html,
    render_clinical_report_pdf,
)
from opd.models.prescription.enums import PrescriptionStatus
from opd.services.prescription_mapper import prescription_to_detail


@dataclass(frozen=True)
class ClinicalReportPdfResult:
    filename: str
    pdf_bytes: bytes


@dataclass(frozen=True)
class ClinicalReportHtmlResult:
    filename: str
    html: str


def _build_clinical_report_request_body(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    report_type: ClinicalReportType,
    context: ClinicalReportContext,
) -> tuple[dict[str, Any], str]:
    source = load_visit_patient_source(session, tenant_id, visit_id)
    if source is None:
        raise LookupError("Visit not found")

    repository = PrescriptionRepository(session)
    try:
        prescription_row = repository.get_by_visit_id(tenant_id, visit_id)
    except PrescriptionNotFoundError as exc:
        raise LookupError("Prescription not found for this visit") from exc

    prescription = prescription_to_detail(prescription_row)
    if prescription.status != PrescriptionStatus.FINAL:
        raise PermissionError("Reports are available only after consultation is completed")

    form_data = clinical_payload_to_form_data(prescription.clinical)
    visitpad_vitals = fetch_visitpad_vitals_catalog(tenant_id)
    request_body = build_clinical_report_request(
        report_type,
        form_data=form_data,
        source=source,
        context=context,
        clinical=prescription.clinical,
        visitpad_vitals=visitpad_vitals,
    )
    validation_error = validate_report_request(report_type, request_body)
    if validation_error:
        raise ValueError(validation_error)

    return request_body, report_filename(report_type, source.visit_number)


def get_clinical_report_pdf(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    report_type: ClinicalReportType,
    context: ClinicalReportContext,
) -> ClinicalReportPdfResult:
    request_body, filename = _build_clinical_report_request_body(
        session,
        tenant_id,
        visit_id,
        report_type,
        context,
    )

    try:
        pdf_bytes = render_clinical_report_pdf(
            report_type,
            request_body,
            request_id=context.request_id,
        )
    except PdfPlatformRenderError as exc:
        raise RuntimeError(exc.args[0]) from exc

    return ClinicalReportPdfResult(filename=filename, pdf_bytes=pdf_bytes)


def get_clinical_report_html(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    report_type: ClinicalReportType,
    context: ClinicalReportContext,
) -> ClinicalReportHtmlResult:
    request_body, filename = _build_clinical_report_request_body(
        session,
        tenant_id,
        visit_id,
        report_type,
        context,
    )

    try:
        html = render_clinical_report_html(
            report_type,
            request_body,
            request_id=context.request_id,
        )
    except PdfPlatformRenderError as exc:
        raise RuntimeError(exc.args[0]) from exc

    return ClinicalReportHtmlResult(filename=filename, html=html)
