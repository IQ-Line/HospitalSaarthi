"""Fire-and-forget Record Foundation ingest + integration-hub M2 after OPD consultation ends."""

from __future__ import annotations

import base64
import json
import logging
import traceback
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, TypedDict
from uuid import UUID

from hims_sdk_fhir import (
    NRCES_PROFILES,
    NrcesProfile,
    build_health_document_bundle,
    build_immunization_bundle,
    build_op_consult_bundle,
    build_prescription_bundle,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from opd.core.config import get_service_integration_settings, get_settings
from opd.core.database import get_session_factory
from opd.data_access.health_document_repo import HealthDocumentRepository
from opd.data_access.prescription_form_data import build_form_data_from_prescription_model
from opd.data_access.prescription_repository import (
    PrescriptionNotFoundError,
    PrescriptionRepository,
)
from opd.data_access.registration_patient_snapshot import load_op_consult_patient_fields
from opd.data_access.registration_patient_source import load_visit_patient_source
from opd.integrations.clinical_form_helpers import (
    abdm_immunization_debug,
    clinical_summary_from_form_data,
    has_immunization_data,
    has_prescription_clinical_data,
    text,
)
from opd.integrations.fhir_bundle_mappers import (
    to_encounter_input,
    to_health_document_input,
    to_immunization_bundle_input,
    to_immunization_inputs,
    to_op_consult_input,
    to_patient_input,
    to_practitioner_input,
    to_prescription_input,
)
from opd.integrations.op_consult_report import (
    OP_CONSULT_HI_TYPE,
    OPD_SLIP_HI_TYPE,
)
from opd.lib import azure_blob_storage
from opd.lib.clinical_report_context import ClinicalReportContext, resolve_clinical_report_context
from opd.services.clinical_documents_service import (
    PdfPlatformRenderError,
    get_clinical_report_pdf,
)

logger = logging.getLogger(__name__)

ABDM_M2_LOG_PREFIX = "[ABDM-M2]"

BUNDLE_IDENTIFIER_SYSTEM = "https://www.max.in/bundle"

# Must stay below record-foundation store-bundle limit (50 MiB).
MAX_BUNDLE_JSON_BYTES = 50 * 1024 * 1024
BUNDLE_STORE_HTTP_TIMEOUT_SECONDS = 120.0

HI_TYPE_OP_CONSULT = "OPCONSULTATION"
HI_TYPE_PRESCRIPTION = "PRESCRIPTION"
HI_TYPE_IMMUNIZATION = "IMMUNIZATIONRECORD"
HI_TYPE_HEALTH_DOCUMENT = "HEALTHDOCUMENTRECORD"


class M2CareContext(TypedDict):
    referenceNumber: str
    display: str
    hiType: str


@dataclass(frozen=True)
class _VisitClinicalSnapshot:
    patient_id: UUID
    patient_name: str
    patient_gender: str | None
    patient_birth_date: date | None
    patient_abha_address: str | None
    practitioner_name: str
    practitioner_registration_id: str
    clinical_summary: str
    form_data: dict[str, Any]
    visit_number: str


def op_consult_care_context_ref(visit_id: UUID) -> str:
    """Stable care-context id (legacy HIMS: visit + bundle type suffix)."""
    return f"{visit_id}_OPConsultNote"


def prescription_care_context_ref(visit_id: UUID) -> str:
    return f"{visit_id}_Prescription"


def immunization_care_context_ref(visit_id: UUID) -> str:
    return f"{visit_id}_ImmunizationRecord"


def health_document_care_context_ref(document_id: UUID) -> str:
    return f"{document_id}_HealthDocument"


def stamp_bundle_identifier(bundle: dict[str, Any], care_context_ref: str) -> None:
    bundle["identifier"] = {
        "system": BUNDLE_IDENTIFIER_SYSTEM,
        "value": care_context_ref,
    }


def _bundle_json_byte_size(bundle_json: dict[str, Any]) -> int:
    return len(json.dumps(bundle_json, separators=(",", ":")).encode("utf-8"))


def _integration_hub_base_url() -> str | None:
    settings = get_settings()
    base = (settings.integration_hub_base_url or "").strip().rstrip("/")
    return base or None


def _record_foundation_base_url() -> str | None:
    settings = get_settings()
    base = (settings.record_foundation_base_url or "").strip().rstrip("/")
    return base or None


def _tenant_headers(tenant_id: UUID) -> dict[str, str]:
    tid = str(tenant_id)
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-tenant-id": tid,
        "iq_tenant_id": tid,
    }


def _http_json(
    *,
    method: str,
    url: str,
    tenant_id: UUID,
    body: dict[str, Any] | None = None,
    timeout: float = 30,
) -> dict[str, Any] | None:
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=payload,
        method=method,
        headers=_tenant_headers(tenant_id),
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        raw = res.read().decode("utf-8")
        if not raw.strip():
            return None
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None


def _resolve_practitioner_name(tenant_id: UUID, doctor_id: UUID) -> str:
    base = (get_service_integration_settings().user_management_url or "").strip().rstrip("/")
    if not base:
        return "Practitioner"
    url = f"{base}/api/user-management/v1/users/{doctor_id}"
    try:
        res = _http_json(method="GET", url=url, tenant_id=tenant_id, timeout=10)
        if not res:
            return "Practitioner"
        data = res if isinstance(res, dict) else {}
        if "data" in data and isinstance(data["data"], dict):
            data = data["data"]
        name = text(
            data.get("full_name")
            or data.get("display_name")
            or data.get("displayName")
        )
        if name:
            return name
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
        logger.debug("Practitioner name lookup failed for doctor %s: %s", doctor_id, exc)
    return "Practitioner"


def _log_abdm_m2(message: str, *args: Any) -> None:
    """Stdout trace for opd-svc terminal (uvicorn) — no log file required."""
    try:
        body = message % args if args else message
    except (TypeError, ValueError):
        body = " ".join([message, *[str(arg) for arg in args]])
    print(f"{ABDM_M2_LOG_PREFIX} {body}", flush=True)


def _log_abdm_m2_exception(message: str, *args: Any) -> None:
    _log_abdm_m2(message, *args)
    traceback.print_exc()


def _load_visit_clinical_snapshot(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
) -> _VisitClinicalSnapshot | None:
    try:
        # get_by_visit_id filters deleted_at IS NULL — a soft-deleted prescription is
        # intentionally NOT sourced for ABDM-M2 (we never push a deleted record to ABDM).
        # Deliberate semantics change from the replaced JSONB get_prescription_by_visit_id,
        # which had no such filter; locked by a test in test_abdm_m2_sourcing_equivalence.py.
        rx = PrescriptionRepository(session).get_by_visit_id(tenant_id, visit_id)
    except PrescriptionNotFoundError:
        return None

    patient_fields = load_op_consult_patient_fields(session, tenant_id, rx.patient_id) or {}
    patient_name = text(patient_fields.get("patient_name")) or "Patient"
    gender_raw = text(patient_fields.get("gender")).lower()
    patient_gender: str | None = None
    if gender_raw in {"male", "female", "other", "unknown"}:
        patient_gender = gender_raw
    elif gender_raw.startswith("m"):
        patient_gender = "male"
    elif gender_raw.startswith("f"):
        patient_gender = "female"

    abha_address = text(patient_fields.get("abha_address")) or None
    birth_date = patient_fields.get("patient_date_of_birth")
    if not isinstance(birth_date, date):
        birth_date = None

    form_data = build_form_data_from_prescription_model(rx)
    _log_abdm_m2(
        "visit %s clinical snapshot immunization gate: %s",
        visit_id,
        abdm_immunization_debug(form_data),
    )
    source = load_visit_patient_source(session, tenant_id, visit_id)
    visit_number = source.visit_number if source else str(visit_id)

    return _VisitClinicalSnapshot(
        patient_id=rx.patient_id,
        patient_name=patient_name,
        patient_gender=patient_gender,
        patient_birth_date=birth_date,
        patient_abha_address=abha_address,
        practitioner_name=_resolve_practitioner_name(tenant_id, rx.doctor_id),
        practitioner_registration_id=str(rx.doctor_id),
        clinical_summary=clinical_summary_from_form_data(form_data),
        form_data=form_data,
        visit_number=visit_number,
    )


def _common_inputs(
    snapshot: _VisitClinicalSnapshot,
    visit_id: UUID,
    *,
    period_iso: str,
) -> tuple[Any, Any, Any]:
    patient = to_patient_input(
        patient_name=snapshot.patient_name,
        gender=snapshot.patient_gender,
        birth_date=snapshot.patient_birth_date,
        abha_address=snapshot.patient_abha_address,
        mrn=str(snapshot.patient_id),
    )
    practitioner = to_practitioner_input(
        snapshot.practitioner_name,
        registration_id=snapshot.practitioner_registration_id,
    )
    encounter = to_encounter_input(
        visit_id,
        visit_number=snapshot.visit_number,
        start=period_iso,
    )
    return patient, practitioner, encounter


def _persist_care_context_bundle(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    care_ref: str,
    display: str,
    source_record_type: str,
    profile: NrcesProfile,
    bundle_json: dict[str, Any],
    produced_at: datetime,
) -> M2CareContext | None:
    _log_abdm_m2(
        "visit %s Record Foundation persist start hiType=%s care_ref=%s profile=%s",
        visit_id,
        source_record_type,
        care_ref,
        profile.canonical_url,
    )
    base = _record_foundation_base_url()
    if not base:
        _log_abdm_m2(
            "visit %s Record Foundation persist aborted hiType=%s — base URL missing",
            visit_id,
            source_record_type,
        )
        return None

    try:
        create_res = _http_json(
            method="POST",
            url=f"{base}/api/record-foundation/v1/care-contexts",
            tenant_id=tenant_id,
            body={
                "patient_id": str(patient_id),
                "source_origin": "platform_module",
                "source_system_id": "opd",
                "source_record_type": source_record_type,
                "source_record_id": care_ref,
                "encounter_id": str(visit_id),
                "display": display,
                "period_start": produced_at.isoformat(),
                "period_end": produced_at.isoformat(),
                "status": "active",
            },
        )
        if not create_res or "data" not in create_res:
            _log_abdm_m2(
                "visit %s care-context create failed hiType=%s care_ref=%s response=%s",
                visit_id,
                source_record_type,
                care_ref,
                create_res,
            )
            return None

        care_context_id = create_res["data"]["id"]
        _log_abdm_m2(
            "visit %s care-context created hiType=%s care_context_id=%s",
            visit_id,
            source_record_type,
            care_context_id,
        )
        bundle_bytes = _bundle_json_byte_size(bundle_json)
        _log_abdm_m2(
            "visit %s bundle store start hiType=%s care_ref=%s bytes=%s",
            visit_id,
            source_record_type,
            care_ref,
            bundle_bytes,
        )
        if bundle_bytes > MAX_BUNDLE_JSON_BYTES:
            _log_abdm_m2(
                "visit %s bundle store aborted hiType=%s care_ref=%s — size %s exceeds limit %s",
                visit_id,
                source_record_type,
                care_ref,
                bundle_bytes,
                MAX_BUNDLE_JSON_BYTES,
            )
            return None
        store_res = _http_json(
            method="POST",
            url=f"{base}/api/record-foundation/v1/bundles",
            tenant_id=tenant_id,
            body={
                "care_context_id": care_context_id,
                "bundle_kind": "document",
                "fhir_profile_url": profile.canonical_url,
                "fhir_profile_version": profile.version,
                "producer_kind": "platform_module",
                "producer_id": "opd",
                "bundle_json": bundle_json,
                "produced_at": produced_at.isoformat(),
            },
            timeout=BUNDLE_STORE_HTTP_TIMEOUT_SECONDS,
        )
        if not store_res or "data" not in store_res:
            _log_abdm_m2(
                "visit %s bundle store failed hiType=%s care_ref=%s response=%s",
                visit_id,
                source_record_type,
                care_ref,
                store_res,
            )
            return None

        bundle_id = store_res["data"].get("id")
        _log_abdm_m2(
            "visit %s bundle stored hiType=%s bundle_id=%s identifier=%s",
            visit_id,
            source_record_type,
            bundle_id,
            bundle_json.get("identifier", {}).get("value"),
        )

        return M2CareContext(
            referenceNumber=care_ref,
            display=display,
            hiType=source_record_type,
        )
    except urllib.error.HTTPError as exc:
        _log_abdm_m2(
            "visit %s Record Foundation HTTP error hiType=%s care_ref=%s status=%s reason=%s",
            visit_id,
            source_record_type,
            care_ref,
            exc.code,
            exc.reason,
        )
    except urllib.error.URLError as exc:
        _log_abdm_m2(
            "visit %s Record Foundation unreachable hiType=%s care_ref=%s reason=%s",
            visit_id,
            source_record_type,
            care_ref,
            exc.reason,
        )
    except OSError as exc:
        _log_abdm_m2(
            "visit %s Record Foundation failed hiType=%s care_ref=%s error=%s",
            visit_id,
            source_record_type,
            care_ref,
            exc,
        )
    return None


def _clinical_report_context(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    snapshot: _VisitClinicalSnapshot,
) -> ClinicalReportContext:
    return resolve_clinical_report_context(
        session,
        tenant_id,
        ClinicalReportContext(doctor_name=snapshot.practitioner_name or None),
        visit_id=visit_id,
        patient_id=snapshot.patient_id,
    )


def _render_report_pdf_base64(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    report_type: str,
    *,
    snapshot: _VisitClinicalSnapshot,
) -> str | None:
    """Best-effort clinical report PDF; bundle persist continues without attachment."""
    try:
        result = get_clinical_report_pdf(
            session,
            tenant_id,
            visit_id,
            report_type,  # type: ignore[arg-type]
            _clinical_report_context(session, tenant_id, visit_id, snapshot),
        )
        if not result.pdf_bytes or not result.pdf_bytes.startswith(b"%PDF-"):
            _log_abdm_m2(
                "visit %s clinical report PDF skipped type=%s reason=invalid_pdf_bytes",
                visit_id,
                report_type,
            )
            return None
        return base64.b64encode(result.pdf_bytes).decode("ascii")
    except (
        LookupError,
        PermissionError,
        SQLAlchemyError,
        ValueError,
        PdfPlatformRenderError,
        RuntimeError,
        OSError,
    ) as exc:
        _log_abdm_m2(
            "visit %s clinical report PDF skipped type=%s reason=%s (bundle continues without PDF)",
            visit_id,
            report_type,
            exc,
        )
        return None


def _persist_op_consult(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    snapshot: _VisitClinicalSnapshot,
    session: Session,
    now: datetime,
) -> M2CareContext | None:
    _log_abdm_m2("visit %s OPCONSULTATION bundle build start", visit_id)
    care_ref = op_consult_care_context_ref(visit_id)
    display = f"OP consultation {care_ref}"

    document_pdf_base64 = _render_report_pdf_base64(
        session,
        tenant_id,
        visit_id,
        "op-consultation",
        snapshot=snapshot,
    )

    period_iso = now.isoformat()
    patient, practitioner, encounter = _common_inputs(snapshot, visit_id, period_iso=period_iso)
    bundle_input = to_op_consult_input(
        patient=patient,
        practitioner=practitioner,
        encounter=encounter,
        form_data=snapshot.form_data,
        document_pdf_base64=document_pdf_base64,
    )
    bundle = build_op_consult_bundle(bundle_input)
    stamp_bundle_identifier(bundle, care_ref)

    ctx = _persist_care_context_bundle(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
        care_ref=care_ref,
        display=display,
        source_record_type=HI_TYPE_OP_CONSULT,
        profile=NRCES_PROFILES["OpConsultRecord"],
        bundle_json=bundle,
        produced_at=now,
    )
    if ctx is None:
        _log_abdm_m2(
            "visit %s OPCONSULTATION bundle persist failed care_ref=%s", visit_id, care_ref
        )
    else:
        _log_abdm_m2("visit %s OPCONSULTATION bundle persist ok care_ref=%s", visit_id, care_ref)
    return ctx


def _persist_prescription(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    snapshot: _VisitClinicalSnapshot,
    session: Session,
    now: datetime,
) -> M2CareContext | None:
    has_rx = has_prescription_clinical_data(snapshot.form_data)
    _log_abdm_m2(
        "visit %s PRESCRIPTION gate has_prescription_clinical_data=%s "
        "diagnosis_len=%s medicines_len=%s",
        visit_id,
        has_rx,
        len(snapshot.form_data.get("diagnosis") or []),
        len(snapshot.form_data.get("medicines") or []),
    )
    if not has_rx:
        _log_abdm_m2("visit %s skipping PRESCRIPTION — no diagnosis/medicines", visit_id)
        return None

    _log_abdm_m2("visit %s PRESCRIPTION bundle build start", visit_id)
    care_ref = prescription_care_context_ref(visit_id)
    display = f"Prescription {care_ref}"
    pdf_base64 = _render_report_pdf_base64(
        session, tenant_id, visit_id, "prescription", snapshot=snapshot
    )

    period_iso = now.isoformat()
    patient, practitioner, encounter = _common_inputs(snapshot, visit_id, period_iso=period_iso)
    bundle_input = to_prescription_input(
        patient=patient,
        practitioner=practitioner,
        encounter=encounter,
        form_data=snapshot.form_data,
        pdf_base64=pdf_base64,
    )
    bundle = build_prescription_bundle(bundle_input)
    stamp_bundle_identifier(bundle, care_ref)

    ctx = _persist_care_context_bundle(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
        care_ref=care_ref,
        display=display,
        source_record_type=HI_TYPE_PRESCRIPTION,
        profile=NRCES_PROFILES["Prescription"],
        bundle_json=bundle,
        produced_at=now,
    )
    if ctx is None:
        _log_abdm_m2("visit %s PRESCRIPTION bundle persist failed care_ref=%s", visit_id, care_ref)
    else:
        _log_abdm_m2("visit %s PRESCRIPTION bundle persist ok care_ref=%s", visit_id, care_ref)
    return ctx


def _persist_immunization(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    snapshot: _VisitClinicalSnapshot,
    session: Session,
    now: datetime,
) -> M2CareContext | None:
    debug = abdm_immunization_debug(snapshot.form_data)
    if not has_immunization_data(snapshot.form_data):
        _log_abdm_m2(
            "visit %s skipping ImmunizationRecord — has_immunization_data=false debug=%s",
            visit_id,
            debug,
        )
        return None

    immunization_count = len(to_immunization_inputs(snapshot.form_data))
    _log_abdm_m2(
        "visit %s persisting ImmunizationRecord immunization_input_count=%s debug=%s",
        visit_id,
        immunization_count,
        debug,
    )

    care_ref = immunization_care_context_ref(visit_id)
    display = f"Immunization {care_ref}"
    pdf_base64 = _render_report_pdf_base64(
        session, tenant_id, visit_id, "immunization", snapshot=snapshot
    )

    period_iso = now.isoformat()
    patient, practitioner, encounter = _common_inputs(snapshot, visit_id, period_iso=period_iso)
    bundle_input = to_immunization_bundle_input(
        patient=patient,
        practitioner=practitioner,
        encounter=encounter,
        form_data=snapshot.form_data,
        document_pdf_base64=pdf_base64,
    )
    bundle = build_immunization_bundle(bundle_input)
    stamp_bundle_identifier(bundle, care_ref)

    ctx = _persist_care_context_bundle(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
        care_ref=care_ref,
        display=display,
        source_record_type=HI_TYPE_IMMUNIZATION,
        profile=NRCES_PROFILES["ImmunizationRecord"],
        bundle_json=bundle,
        produced_at=now,
    )
    if ctx is None:
        _log_abdm_m2(
            "visit %s ImmunizationRecord persist failed for care_ref=%s",
            visit_id,
            care_ref,
        )
    else:
        _log_abdm_m2(
            "visit %s ImmunizationRecord persisted care_ref=%s hiType=%s",
            visit_id,
            care_ref,
            HI_TYPE_IMMUNIZATION,
        )
    return ctx


def _persist_health_documents(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    snapshot: _VisitClinicalSnapshot,
    session: Session,
    now: datetime,
) -> list[M2CareContext]:
    _log_abdm_m2(
        "visit %s HEALTHDOCUMENTRECORD bundle pass start — user-uploaded documents only",
        visit_id,
    )

    repo = HealthDocumentRepository(session, tenant_id)
    documents = repo.list_active_for_visit(visit_id)
    _log_abdm_m2(
        "visit %s HEALTHDOCUMENTRECORD found %s active health document row(s)",
        visit_id,
        len(documents),
    )
    contexts: list[M2CareContext] = []

    period_iso = now.isoformat()
    patient, practitioner, encounter = _common_inputs(snapshot, visit_id, period_iso=period_iso)

    for doc in documents:
        if doc.hi_type in (OP_CONSULT_HI_TYPE, OPD_SLIP_HI_TYPE):
            _log_abdm_m2(
                "visit %s HEALTHDOCUMENTRECORD skip doc_id=%s hi_type=%s "
                "reason=system_generated_type",
                visit_id,
                doc.id,
                doc.hi_type,
            )
            continue
        if doc.created_by is None:
            _log_abdm_m2(
                "visit %s HEALTHDOCUMENTRECORD skip doc_id=%s hi_type=%s reason=no_uploader",
                visit_id,
                doc.id,
                doc.hi_type,
            )
            continue

        _log_abdm_m2(
            "visit %s HEALTHDOCUMENTRECORD build doc_id=%s hi_type=%s title=%s",
            visit_id,
            doc.id,
            doc.hi_type,
            doc.document_title,
        )

        try:
            content, _ = azure_blob_storage.download_health_document_bytes(doc.storage_key)
        except (RuntimeError, OSError) as exc:
            _log_abdm_m2(
                "visit %s HEALTHDOCUMENTRECORD skip doc_id=%s reason=download_failed error=%s",
                visit_id,
                doc.id,
                exc,
            )
            continue
        if not content:
            _log_abdm_m2(
                "visit %s HEALTHDOCUMENTRECORD skip doc_id=%s reason=empty_content",
                visit_id,
                doc.id,
            )
            continue

        data_base64 = base64.b64encode(content).decode("ascii")
        care_ref = health_document_care_context_ref(doc.id)
        display = doc.document_title or f"Health document {care_ref}"

        bundle_input = to_health_document_input(
            patient=patient,
            practitioner=practitioner,
            encounter=encounter,
            document_row=doc,
            data_base64=data_base64,
        )
        bundle = build_health_document_bundle(bundle_input)
        stamp_bundle_identifier(bundle, care_ref)

        ctx = _persist_care_context_bundle(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
            care_ref=care_ref,
            display=display,
            source_record_type=HI_TYPE_HEALTH_DOCUMENT,
            profile=NRCES_PROFILES["HealthDocumentRecord"],
            bundle_json=bundle,
            produced_at=now,
        )
        if ctx is not None:
            contexts.append(ctx)
            _log_abdm_m2(
                "visit %s HEALTHDOCUMENTRECORD persisted doc_id=%s care_ref=%s",
                visit_id,
                doc.id,
                care_ref,
            )
        else:
            _log_abdm_m2(
                "visit %s HEALTHDOCUMENTRECORD persist failed doc_id=%s care_ref=%s",
                visit_id,
                doc.id,
                care_ref,
            )

    _log_abdm_m2(
        "visit %s HEALTHDOCUMENTRECORD bundle pass done contexts=%s",
        visit_id,
        len(contexts),
    )
    return contexts


def persist_visit_abdm_bundles(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> list[M2CareContext]:
    """
    Create care contexts + store FHIR bundles in Record Foundation for all applicable HI-Types.
    Returns M2 care-context descriptors for orchestration.
    """
    settings = get_settings()
    if not settings.abdm_m2_enabled:
        _log_abdm_m2("visit %s bundle persist skipped: OPD_ABDM_M2_ENABLED=false", visit_id)
        return []

    if not _record_foundation_base_url():
        _log_abdm_m2(
            "visit %s bundle persist skipped: RECORD_FOUNDATION_BASE_URL not configured",
            visit_id,
        )
        return []

    now = datetime.now(UTC)
    session = get_session_factory()()
    contexts: list[M2CareContext] = []
    try:
        snapshot = _load_visit_clinical_snapshot(session, tenant_id, visit_id)
        if snapshot is None:
            _log_abdm_m2(
                "visit %s bundle persist skipped — no prescription snapshot found",
                visit_id,
            )
            return []

        _log_abdm_m2(
            "visit %s bundle persist pipeline: OPCONSULTATION -> PRESCRIPTION -> "
            "IMMUNIZATIONRECORD -> HEALTHDOCUMENTRECORD",
            visit_id,
        )

        persist_steps: tuple[tuple[str, Any], ...] = (
            ("OPConsultation", lambda: _persist_op_consult(
                tenant_id=tenant_id,
                patient_id=patient_id,
                visit_id=visit_id,
                snapshot=snapshot,
                session=session,
                now=now,
            )),
            ("Prescription", lambda: _persist_prescription(
                tenant_id=tenant_id,
                patient_id=patient_id,
                visit_id=visit_id,
                snapshot=snapshot,
                session=session,
                now=now,
            )),
            ("ImmunizationRecord", lambda: _persist_immunization(
                tenant_id=tenant_id,
                patient_id=patient_id,
                visit_id=visit_id,
                snapshot=snapshot,
                session=session,
                now=now,
            )),
        )
        for hi_type_label, persist_fn in persist_steps:
            _log_abdm_m2("visit %s -> entering %s bundle function", visit_id, hi_type_label)
            try:
                ctx = persist_fn()
            except Exception:
                _log_abdm_m2_exception(
                    "visit %s %s bundle persist raised",
                    visit_id,
                    hi_type_label,
                )
                continue
            if ctx is not None:
                contexts.append(ctx)
                _log_abdm_m2(
                    "visit %s collected care context hiType=%s ref=%s",
                    visit_id,
                    ctx["hiType"],
                    ctx["referenceNumber"],
                )
            else:
                _log_abdm_m2(
                    "visit %s no care context for %s",
                    visit_id,
                    hi_type_label,
                )

        try:
            health_contexts = _persist_health_documents(
                tenant_id=tenant_id,
                patient_id=patient_id,
                visit_id=visit_id,
                snapshot=snapshot,
                session=session,
                now=now,
            )
        except Exception:
            _log_abdm_m2_exception("visit %s HEALTHDOCUMENTRECORD bundle persist raised", visit_id)
            health_contexts = []
        contexts.extend(health_contexts)
    except Exception:
        _log_abdm_m2_exception("visit %s persist_visit_abdm_bundles failed", visit_id)
        return []
    finally:
        session.close()

    _log_abdm_m2(
        "visit %s persist_visit_abdm_bundles finished total_contexts=%s hi_types=%s",
        visit_id,
        len(contexts),
        [ctx["hiType"] for ctx in contexts],
    )
    return contexts


def persist_op_consult_to_record_foundation(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> bool:
    """Backward-compatible wrapper — returns True when any bundle was persisted."""
    return bool(
        persist_visit_abdm_bundles(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
        )
    )


def trigger_m2_after_end_consultation(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> None:
    """
    Persist consultation bundles to Record Foundation, then POST integration-hub M2 orchestration.
    Non-blocking best-effort — failures are logged only.
    """
    _log_abdm_m2("visit %s end-consultation trigger started", visit_id)
    contexts = persist_visit_abdm_bundles(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    settings = get_settings()
    if not settings.abdm_m2_enabled or not contexts:
        _log_abdm_m2(
            "visit %s M2 orchestration skipped enabled=%s context_count=%s",
            visit_id,
            settings.abdm_m2_enabled,
            len(contexts),
        )
        return

    base = _integration_hub_base_url()
    if not base:
        _log_abdm_m2("visit %s M2 orchestration skipped — integration hub URL missing", visit_id)
        return

    _log_abdm_m2(
        "visit %s M2 orchestration POST careContexts=%s",
        visit_id,
        [{"hiType": c["hiType"], "ref": c["referenceNumber"]} for c in contexts],
    )

    url = f"{base}/api/abdm/v1/m2/orchestrate/after-care-contexts"
    body = {
        "patientId": str(patient_id),
        "careContexts": contexts,
    }
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers=_tenant_headers(tenant_id),
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            if res.status >= 400:
                _log_abdm_m2(
                    "visit %s M2 orchestration returned HTTP %s",
                    visit_id,
                    res.status,
                )
            else:
                _log_abdm_m2("visit %s M2 orchestration HTTP %s ok", visit_id, res.status)
    except urllib.error.HTTPError as exc:
        _log_abdm_m2(
            "visit %s M2 orchestration HTTP error status=%s reason=%s",
            visit_id,
            exc.code,
            exc.reason,
        )
    except urllib.error.URLError as exc:
        _log_abdm_m2(
            "visit %s M2 orchestration unreachable reason=%s",
            visit_id,
            exc.reason,
        )
    except OSError as exc:
        _log_abdm_m2("visit %s M2 orchestration failed error=%s", visit_id, exc)


# Re-export for tests that import clinical summary helpers from this module.
_clinical_summary_from_form_data = clinical_summary_from_form_data
