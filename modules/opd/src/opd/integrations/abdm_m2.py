"""Fire-and-forget Record Foundation ingest + integration-hub M2 after OPD consultation ends."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from opd.core.config import get_service_integration_settings, get_settings
from opd.core.database import get_session_factory
from opd.data_access.prescription_bundle import get_prescription_by_visit_id
from opd.data_access.prescription_form_data import effective_form_data
from opd.data_access.registration_patient_snapshot import load_op_consult_patient_fields
from opd.integrations.op_consult_report import (
    ensure_op_consult_report_pdf_base64,
    wrap_op_consult_report_document,
)

logger = logging.getLogger(__name__)

DOCUMENT_BUNDLE_PROFILE_URL = (
    "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"
)
OP_CONSULT_PROFILE_URL = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord"
DOCUMENT_REFERENCE_PROFILE_URL = (
    "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentReference"
)
OP_CONSULT_PROFILE_VERSION = "6.5.0"
ABHA_IDENTIFIER_SYSTEM = "https://healthid.ndhm.gov.in"
SNOMED_SYSTEM = "http://snomed.info/sct"
V3_ACT_CODE_SYSTEM = "http://terminology.hl7.org/CodeSystem/v3-ActCode"


@dataclass(frozen=True)
class _OpConsultSnapshot:
    patient_name: str
    patient_gender: str | None
    patient_birth_date: date | None
    patient_abha_address: str | None
    practitioner_name: str
    clinical_summary: str
    form_data: dict[str, Any]


def _integration_hub_base_url() -> str | None:
    settings = get_settings()
    base = (settings.integration_hub_base_url or "").strip().rstrip("/")
    return base or None


def _record_foundation_base_url() -> str | None:
    settings = get_settings()
    base = (settings.record_foundation_base_url or "").strip().rstrip("/")
    return base or None


def op_consult_care_context_ref(visit_id: UUID) -> str:
    """Stable care-context id (legacy HIMS: visit + bundle type suffix)."""
    return f"{visit_id}_OPConsultNote"


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


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _form_item_label(item: Any, *keys: str) -> str:
    if isinstance(item, str):
        return _text(item)
    if not isinstance(item, dict):
        return _text(item)
    for key in keys:
        val = _text(item.get(key))
        if val:
            return val
    return ""


def _format_chief_complaint(item: dict[str, Any]) -> str:
    complaint = _text(item.get("complaint"))
    if not complaint:
        return ""
    parts = [complaint]
    duration = _text(item.get("duration"))
    unit = _text(item.get("durationUnit") or "days")
    if duration:
        parts.append(f"{duration} {unit}")
    severity = _text(item.get("severity"))
    if severity:
        parts.append(severity)
    return " — ".join(parts)


def _format_medicine_line(med: dict[str, Any]) -> str:
    name = _form_item_label(med, "medicine", "name", "medicineName", "display_name")
    if not name:
        return ""
    dose = _text(med.get("dosage"))
    frequency = _text(med.get("frequency"))
    days = _text(med.get("days") or med.get("duration"))
    strength = _text(med.get("strength"))
    parts = [name]
    if strength:
        parts.append(strength)
    if dose:
        parts.append(dose)
    if frequency:
        parts.append(frequency)
    if days:
        parts.append(f"{days} days")
    return " — ".join(parts)


def _vitals_lines(vitals: Any) -> list[str]:
    if not isinstance(vitals, dict):
        return []
    labels = {
        "systolic_bp": "BP systolic",
        "diastolic_bp": "BP diastolic",
        "pulse_rate": "Pulse",
        "temperature": "Temperature",
        "spo2": "SpO2",
        "height": "Height",
        "weight": "Weight",
        "bmi": "BMI",
        "respiratory_rate": "Respiratory rate",
        "random_blood_sugar": "Blood sugar",
    }
    lines: list[str] = []
    for key, label in labels.items():
        val = _text(vitals.get(key))
        if val:
            lines.append(f"{label}: {val}")
    return lines


def _lines_from_items(items: Any, section_label: str) -> list[str]:
    if not isinstance(items, list):
        return []
    lines: list[str] = []
    for item in items:
        if isinstance(item, dict) and _text(item.get("complaint")):
            line = _format_chief_complaint(item)
        elif isinstance(item, dict):
            line = _form_item_label(item, "notes", "name", "text", "display", "medicine")
        else:
            line = _text(item)
        if line:
            lines.append(line)
    if not lines:
        return []
    return [f"{section_label}: {', '.join(lines)}"]


def _clinical_summary_from_form_data(form_data: dict[str, Any] | None) -> str:
    if not isinstance(form_data, dict):
        return "OP consultation record"

    sections: list[str] = []
    sections += _lines_from_items(
        form_data.get("chiefComplaints") or form_data.get("chief_complaints"),
        "Chief complaints",
    )

    medical_history = form_data.get("medicalHistory")
    if isinstance(medical_history, dict):
        hpi = _text(medical_history.get("historyOfPresentIllness"))
        if hpi:
            sections.append(f"History of present illness: {hpi}")

    sections += _lines_from_items(form_data.get("diagnosis"), "Diagnosis")

    vitals = _vitals_lines(form_data.get("vitals"))
    if vitals:
        sections.append(f"Vitals: {', '.join(vitals)}")

    medicines = form_data.get("medicines")
    if isinstance(medicines, list) and medicines:
        med_lines = [
            line
            for med in medicines
            if isinstance(med, dict)
            for line in [_format_medicine_line(med)]
            if line
        ]
        if med_lines:
            sections.append(f"Medicines: {'; '.join(med_lines)}")

    care_plan = form_data.get("carePlan")
    if isinstance(care_plan, dict):
        advice = care_plan.get("advice")
        if isinstance(advice, list):
            sections += _lines_from_items(advice, "Advice")
        elif _text(advice):
            sections.append(f"Advice: {_text(advice)}")

    return "\n\n".join(sections) if sections else "OP consultation record"


def _clinical_summary_html(summary: str) -> str:
    paragraphs = [p.strip() for p in summary.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = ["OP consultation record"]
    body = "".join(f"<p>{_escape_xml(p)}</p>" for p in paragraphs)
    return f'<div xmlns="http://www.w3.org/1999/xhtml">{body}</div>'


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
        name = _text(
            data.get("full_name")
            or data.get("display_name")
            or data.get("displayName")
        )
        if name:
            return name
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
        logger.debug("Practitioner name lookup failed for doctor %s: %s", doctor_id, exc)
    return "Practitioner"


def _load_op_consult_snapshot(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
) -> _OpConsultSnapshot | None:
    bundle = get_prescription_by_visit_id(session, tenant_id, visit_id)
    if bundle is None:
        return None

    patient_fields = load_op_consult_patient_fields(session, tenant_id, bundle.patient_id) or {}
    patient_name = _text(patient_fields.get("patient_name")) or "Patient"
    gender_raw = _text(patient_fields.get("gender")).lower()
    patient_gender: str | None = None
    if gender_raw in {"male", "female", "other", "unknown"}:
        patient_gender = gender_raw
    elif gender_raw.startswith("m"):
        patient_gender = "male"
    elif gender_raw.startswith("f"):
        patient_gender = "female"

    abha_address = _text(patient_fields.get("abha_address")) or None
    birth_date = patient_fields.get("patient_date_of_birth")
    if not isinstance(birth_date, date):
        birth_date = None

    form_data = effective_form_data(session, bundle.rx)
    return _OpConsultSnapshot(
        patient_name=patient_name,
        patient_gender=patient_gender,
        patient_birth_date=birth_date,
        patient_abha_address=abha_address,
        practitioner_name=_resolve_practitioner_name(tenant_id, bundle.rx.doctor_id),
        clinical_summary=_clinical_summary_from_form_data(form_data),
        form_data=form_data,
    )


def _patient_name_element(full_name: str) -> dict[str, Any]:
    parts = [part for part in full_name.split() if part.strip()]
    if not parts:
        return {"text": full_name or "Patient"}
    if len(parts) == 1:
        return {"text": full_name, "given": [parts[0]]}
    return {
        "text": full_name,
        "family": parts[-1],
        "given": parts[:-1],
    }


def _escape_xml(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _condition_resource(
    *,
    cond_id: str,
    label: str,
    patient_id: str,
    patient_name: str,
    ts: str,
) -> dict[str, Any]:
    return {
        "resourceType": "Condition",
        "id": cond_id,
        "clinicalStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active",
                    "display": "Active",
                }
            ],
            "text": "Active",
        },
        "code": {"text": label},
        "subject": {"reference": f"urn:uuid:{patient_id}", "display": patient_name},
        "recordedDate": ts,
    }


def _medication_request_resource(
    *,
    med_id: str,
    med: dict[str, Any],
    patient_id: str,
    patient_name: str,
    practitioner_id: str,
    practitioner_name: str,
    ts: str,
) -> dict[str, Any]:
    name = _form_item_label(med, "medicine", "name", "medicineName")
    dosage = _text(med.get("dosage"))
    frequency = _text(med.get("frequency"))
    days = _text(med.get("days") or med.get("duration"))
    instruction_parts = [part for part in (dosage, frequency, f"for {days} days" if days else "") if part]
    return {
        "resourceType": "MedicationRequest",
        "id": med_id,
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {"text": name or "Medicine"},
        "subject": {"reference": f"urn:uuid:{patient_id}", "display": patient_name},
        "authoredOn": ts,
        "requester": {
            "reference": f"urn:uuid:{practitioner_id}",
            "display": practitioner_name,
        },
        "dosageInstruction": [{"text": ", ".join(instruction_parts) or "As directed"}],
    }


def _build_op_consult_bundle(
    *,
    care_context_ref: str,
    display: str,
    snapshot: _OpConsultSnapshot | None = None,
    document_pdf_base64: str | None = None,
) -> dict[str, Any]:
    ts = datetime.now(UTC).isoformat()
    bundle_id = str(uuid4())
    patient_id = str(uuid4())
    composition_id = str(uuid4())
    practitioner_id = str(uuid4())
    encounter_id = str(uuid4())
    document_ref_id = str(uuid4())
    patient_name = snapshot.patient_name if snapshot else "Patient"
    practitioner_name = snapshot.practitioner_name if snapshot else "Practitioner"
    clinical_summary = snapshot.clinical_summary if snapshot else display
    form_data = snapshot.form_data if snapshot else {}
    html_summary = _clinical_summary_html(clinical_summary)
    composition_profile = f"{OP_CONSULT_PROFILE_URL}|{OP_CONSULT_PROFILE_VERSION}"

    patient_resource: dict[str, Any] = {
        "resourceType": "Patient",
        "id": patient_id,
        "name": [_patient_name_element(patient_name)],
    }
    if snapshot and snapshot.patient_gender:
        patient_resource["gender"] = snapshot.patient_gender
    if snapshot and snapshot.patient_birth_date:
        patient_resource["birthDate"] = snapshot.patient_birth_date.isoformat()
    if snapshot and snapshot.patient_abha_address:
        patient_resource["identifier"] = [
            {
                "system": ABHA_IDENTIFIER_SYSTEM,
                "value": snapshot.patient_abha_address,
            }
        ]

    clinical_entries: list[dict[str, Any]] = []
    composition_sections: list[dict[str, Any]] = []

    chief_entries: list[dict[str, str]] = []
    for item in form_data.get("chiefComplaints") or []:
        if not isinstance(item, dict):
            continue
        label = _format_chief_complaint(item)
        if not label:
            continue
        cond_id = str(uuid4())
        clinical_entries.append(
            {
                "fullUrl": f"urn:uuid:{cond_id}",
                "resource": _condition_resource(
                    cond_id=cond_id,
                    label=label,
                    patient_id=patient_id,
                    patient_name=patient_name,
                    ts=ts,
                ),
            }
        )
        chief_entries.append({"reference": f"urn:uuid:{cond_id}", "display": "Chief complaint"})
    if chief_entries:
        composition_sections.append({"title": "Chief complaints", "entry": chief_entries})

    hpi = ""
    medical_history = form_data.get("medicalHistory")
    if isinstance(medical_history, dict):
        hpi = _text(medical_history.get("historyOfPresentIllness"))
    if hpi:
        composition_sections.append(
            {
                "title": "History of present illness",
                "text": {
                    "status": "generated",
                    "div": (
                        '<div xmlns="http://www.w3.org/1999/xhtml">'
                        f"<p>{_escape_xml(hpi)}</p></div>"
                    ),
                },
            }
        )

    diagnosis_entries: list[dict[str, str]] = []
    for item in form_data.get("diagnosis") or []:
        if not isinstance(item, dict):
            continue
        label = _form_item_label(item, "notes", "name", "text")
        if not label:
            continue
        cond_id = str(uuid4())
        clinical_entries.append(
            {
                "fullUrl": f"urn:uuid:{cond_id}",
                "resource": _condition_resource(
                    cond_id=cond_id,
                    label=label,
                    patient_id=patient_id,
                    patient_name=patient_name,
                    ts=ts,
                ),
            }
        )
        diagnosis_entries.append({"reference": f"urn:uuid:{cond_id}", "display": "Diagnosis"})
    if diagnosis_entries:
        composition_sections.append({"title": "Diagnosis", "entry": diagnosis_entries})

    medicine_entries: list[dict[str, str]] = []
    for med in form_data.get("medicines") or []:
        if not isinstance(med, dict):
            continue
        if not _form_item_label(med, "medicine", "name", "medicineName"):
            continue
        med_id = str(uuid4())
        clinical_entries.append(
            {
                "fullUrl": f"urn:uuid:{med_id}",
                "resource": _medication_request_resource(
                    med_id=med_id,
                    med=med,
                    patient_id=patient_id,
                    patient_name=patient_name,
                    practitioner_id=practitioner_id,
                    practitioner_name=practitioner_name,
                    ts=ts,
                ),
            }
        )
        medicine_entries.append({"reference": f"urn:uuid:{med_id}", "display": "Medication"})
    if medicine_entries:
        composition_sections.append({"title": "Medications", "entry": medicine_entries})

    if document_pdf_base64:
        composition_sections.append(
            {
                "title": "Document Reference",
                "code": {
                    "coding": [
                        {
                            "system": SNOMED_SYSTEM,
                            "code": "371530004",
                            "display": "Clinical consultation report",
                        }
                    ],
                    "text": "Clinical consultation report",
                },
                "entry": [
                    {
                        "reference": f"urn:uuid:{document_ref_id}",
                        "display": "DocumentReference",
                    }
                ],
            }
        )

    composition_resource = {
        "resourceType": "Composition",
        "id": composition_id,
        "meta": {"profile": [composition_profile]},
        "language": "en-IN",
        "status": "final",
        "type": {
            "coding": [
                {
                    "system": SNOMED_SYSTEM,
                    "code": "371530004",
                    "display": "Clinical consultation report",
                }
            ],
            "text": "Clinical Consultation report",
        },
        "subject": {
            "reference": f"urn:uuid:{patient_id}",
            "display": patient_name,
        },
        "encounter": {
            "reference": f"urn:uuid:{encounter_id}",
            "display": "Ambulatory encounter",
        },
        "date": ts,
        "author": [
            {
                "reference": f"urn:uuid:{practitioner_id}",
                "display": practitioner_name,
            }
        ],
        "title": "Consultation Report",
        "section": composition_sections,
        "text": {
            "status": "generated",
            "div": html_summary,
        },
    }

    entries: list[dict[str, Any]] = [
        {"fullUrl": f"urn:uuid:{composition_id}", "resource": composition_resource},
        {"fullUrl": f"urn:uuid:{patient_id}", "resource": patient_resource},
        {
            "fullUrl": f"urn:uuid:{practitioner_id}",
            "resource": {
                "resourceType": "Practitioner",
                "id": practitioner_id,
                "name": [{"text": practitioner_name}],
            },
        },
        {
            "fullUrl": f"urn:uuid:{encounter_id}",
            "resource": {
                "resourceType": "Encounter",
                "id": encounter_id,
                "status": "finished",
                "class": {
                    "system": V3_ACT_CODE_SYSTEM,
                    "code": "AMB",
                    "display": "ambulatory",
                },
                "subject": {
                    "reference": f"urn:uuid:{patient_id}",
                    "display": patient_name,
                },
                "period": {"start": ts},
            },
        },
        *clinical_entries,
    ]
    if document_pdf_base64:
        entries.append(
            {
                "fullUrl": f"urn:uuid:{document_ref_id}",
                "resource": {
                    "resourceType": "DocumentReference",
                    "id": document_ref_id,
                    "meta": {"profile": [DOCUMENT_REFERENCE_PROFILE_URL]},
                    "status": "current",
                    "docStatus": "final",
                    "type": {
                        "coding": [
                            {
                                "system": SNOMED_SYSTEM,
                                "code": "371530004",
                                "display": "Clinical consultation report",
                            }
                        ],
                        "text": "Consultation Report",
                    },
                    "subject": {
                        "reference": f"urn:uuid:{patient_id}",
                        "display": patient_name,
                    },
                    "author": [
                        {
                            "reference": f"urn:uuid:{practitioner_id}",
                            "display": practitioner_name,
                        }
                    ],
                    "content": [
                        {
                            "attachment": {
                                "contentType": "application/pdf",
                                "language": "en-IN",
                                "data": document_pdf_base64,
                                "title": "Consultation Report",
                                "creation": ts,
                            }
                        }
                    ],
                },
            }
        )

    return {
        "resourceType": "Bundle",
        "id": bundle_id,
        "type": "document",
        "timestamp": ts,
        "meta": {
            "profile": [DOCUMENT_BUNDLE_PROFILE_URL, OP_CONSULT_PROFILE_URL],
            "lastUpdated": ts,
        },
        "identifier": {
            "system": "https://www.max.in/bundle",
            "value": care_context_ref,
        },
        "entry": entries,
    }


def persist_op_consult_to_record_foundation(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> bool:
    """
    Create care context + store FHIR bundle in Record Foundation.
    Returns True when persisted (or already exists), False when skipped/unreachable.
    """
    settings = get_settings()
    if not settings.abdm_m2_enabled:
        return False

    base = _record_foundation_base_url()
    if not base:
        logger.debug("OPD Record Foundation skipped: record_foundation_base_url not configured")
        return False

    care_ref = op_consult_care_context_ref(visit_id)
    display = f"OP consultation {care_ref}"
    now = datetime.now(UTC)

    session = get_session_factory()()
    snapshot: _OpConsultSnapshot | None = None
    document_pdf_base64: str | None = None
    try:
        snapshot = _load_op_consult_snapshot(session, tenant_id, visit_id)
        if snapshot is not None:
            report_html = wrap_op_consult_report_document(
                patient_name=snapshot.patient_name,
                practitioner_name=snapshot.practitioner_name,
                clinical_html=_clinical_summary_html(snapshot.clinical_summary),
            )
            document_pdf_base64 = ensure_op_consult_report_pdf_base64(
                session,
                tenant_id,
                visit_id,
                patient_id,
                report_html=report_html,
                fallback_summary=snapshot.clinical_summary,
            )
    finally:
        session.close()

    try:
        create_body = {
            "patient_id": str(patient_id),
            "source_origin": "platform_module",
            "source_system_id": "opd",
            "source_record_type": "opd_visit",
            "source_record_id": care_ref,
            "encounter_id": str(visit_id),
            "display": display,
            "period_start": now.isoformat(),
            "period_end": now.isoformat(),
            "status": "active",
        }
        create_res = _http_json(
            method="POST",
            url=f"{base}/api/record-foundation/v1/care-contexts",
            tenant_id=tenant_id,
            body=create_body,
        )
        if not create_res or "data" not in create_res:
            logger.warning(
                "Record Foundation care-context create failed for visit %s",
                visit_id,
            )
            return False

        care_context_id = create_res["data"]["id"]
        bundle_json = _build_op_consult_bundle(
            care_context_ref=care_ref,
            display=display,
            snapshot=snapshot,
            document_pdf_base64=document_pdf_base64,
        )
        store_res = _http_json(
            method="POST",
            url=f"{base}/api/record-foundation/v1/bundles",
            tenant_id=tenant_id,
            body={
                "care_context_id": care_context_id,
                "bundle_kind": "document",
                "fhir_profile_url": OP_CONSULT_PROFILE_URL,
                "fhir_profile_version": OP_CONSULT_PROFILE_VERSION,
                "producer_kind": "platform_module",
                "producer_id": "opd",
                "bundle_json": bundle_json,
                "produced_at": now.isoformat(),
            },
        )
        if not store_res or "data" not in store_res:
            logger.warning(
                "Record Foundation bundle store failed for visit %s care_context %s",
                visit_id,
                care_context_id,
            )
            return False
        return True
    except urllib.error.HTTPError as exc:
        logger.warning(
            "Record Foundation HTTP error for visit %s: %s %s",
            visit_id,
            exc.code,
            exc.reason,
        )
    except urllib.error.URLError as exc:
        logger.warning(
            "Record Foundation unreachable for visit %s: %s",
            visit_id,
            exc.reason,
        )
    except OSError as exc:
        logger.warning("Record Foundation failed for visit %s: %s", visit_id, exc)
    return False


def trigger_m2_after_end_consultation(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> None:
    """
    Persist consultation to Record Foundation, then POST integration-hub M2 orchestration.
    Non-blocking best-effort — failures are logged only.
    """
    persist_op_consult_to_record_foundation(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    settings = get_settings()
    if not settings.abdm_m2_enabled:
        return

    base = _integration_hub_base_url()
    if not base:
        logger.debug("OPD ABDM M2 skipped: integration_hub_base_url not configured")
        return

    url = f"{base}/api/abdm/v1/m2/orchestrate/after-care-contexts"
    care_ref = op_consult_care_context_ref(visit_id)
    body = {
        "patientId": str(patient_id),
        "careContexts": [
            {
                "referenceNumber": care_ref,
                "display": f"OP consultation {care_ref}",
                "hiType": "OPCONSULTATION",
            }
        ],
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
                logger.warning(
                    "ABDM M2 orchestration returned HTTP %s for visit %s",
                    res.status,
                    visit_id,
                )
    except urllib.error.HTTPError as exc:
        logger.warning(
            "ABDM M2 orchestration HTTP error for visit %s: %s %s",
            visit_id,
            exc.code,
            exc.reason,
        )
    except urllib.error.URLError as exc:
        logger.warning(
            "ABDM M2 orchestration unreachable for visit %s: %s",
            visit_id,
            exc.reason,
        )
    except OSError as exc:
        logger.warning("ABDM M2 orchestration failed for visit %s: %s", visit_id, exc)
