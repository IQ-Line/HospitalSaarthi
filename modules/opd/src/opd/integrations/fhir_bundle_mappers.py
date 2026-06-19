"""Map OPD Create-RX form_data and patient snapshots to hims_sdk_fhir input dataclasses."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from hims_sdk_fhir import (
    AllergyInput,
    ChiefComplaintInput,
    DiagnosisInput,
    DocumentInput,
    EncounterInput,
    HealthDocumentInput,
    ImmunizationBundleInput,
    ImmunizationInput,
    LegacyVitalsInput,
    MedicineInput,
    OpConsultInput,
    PatientInput,
    PractitionerInput,
    PrescriptionInput,
)

from opd.integrations.clinical_form_helpers import (
    form_item_label,
    format_chief_complaint,
    immunization_rows_from_form_data,
    immunization_vaccine_name,
    normalize_gender,
    parse_float,
    parse_int_days,
    text,
)
from opd.models.health_document import HealthDocument


def to_patient_input(
    *,
    patient_name: str,
    gender: str | None = None,
    birth_date: date | None = None,
    abha_address: str | None = None,
    mrn: str | None = None,
) -> PatientInput:
    birth_iso: str | None = None
    if isinstance(birth_date, date):
        birth_iso = birth_date.isoformat()
    return PatientInput(
        full_name=patient_name or "Patient",
        gender=normalize_gender(gender),
        birth_date=birth_iso,
        abha_address=abha_address or None,
        mrn=mrn or None,
    )


def to_practitioner_input(
    name: str,
    *,
    registration_id: str | None = None,
) -> PractitionerInput:
    return PractitionerInput(
        full_name=name or "Practitioner",
        registration_id=registration_id or None,
    )


def to_encounter_input(
    visit_id: UUID,
    *,
    visit_number: str | None = None,
    start: str | None = None,
) -> EncounterInput:
    return EncounterInput(
        visit_number=visit_number or str(visit_id),
        start=start,
        status="finished",
        class_code="AMB",
    )


def to_legacy_vitals(vitals: Any) -> LegacyVitalsInput | None:
    if not isinstance(vitals, dict):
        return None
    mapped = LegacyVitalsInput(
        bp_systolic=parse_float(vitals.get("systolic_bp")),
        bp_diastolic=parse_float(vitals.get("diastolic_bp")),
        pulse_bpm=parse_float(vitals.get("pulse_rate")),
        temperature_f=parse_float(vitals.get("temperature")),
        respiratory_rate=parse_float(vitals.get("respiratory_rate")),
        spo2_percent=parse_float(vitals.get("spo2")),
        height_cm=parse_float(vitals.get("height")),
        weight_kg=parse_float(vitals.get("weight")),
        bmi=parse_float(vitals.get("bmi")),
        blood_sugar_mg_dl=parse_float(vitals.get("random_blood_sugar")),
    )
    if mapped == LegacyVitalsInput():
        return None
    return mapped


def to_chief_complaints(form_data: dict[str, Any]) -> tuple[ChiefComplaintInput, ...]:
    items = form_data.get("chiefComplaints") or form_data.get("chief_complaints") or []
    out: list[ChiefComplaintInput] = []
    if not isinstance(items, list):
        return tuple()
    for item in items:
        if not isinstance(item, dict):
            continue
        label = format_chief_complaint(item)
        if label:
            out.append(ChiefComplaintInput(text=label))
    return tuple(out)


def to_diagnoses(form_data: dict[str, Any]) -> tuple[DiagnosisInput, ...]:
    items = form_data.get("diagnosis") or []
    out: list[DiagnosisInput] = []
    if not isinstance(items, list):
        return tuple()
    for item in items:
        if not isinstance(item, dict):
            continue
        label = form_item_label(item, "notes", "name", "text")
        if not label:
            continue
        certainty = text(item.get("certainty")) or None
        out.append(DiagnosisInput(text=label, certainty=certainty))
    return tuple(out)


def to_medicines(form_data: dict[str, Any]) -> tuple[MedicineInput, ...]:
    items = form_data.get("medicines") or []
    out: list[MedicineInput] = []
    if not isinstance(items, list):
        return tuple()
    for item in items:
        if not isinstance(item, dict):
            continue
        name = form_item_label(item, "medicine", "name", "medicineName", "display_name")
        if not name:
            continue
        out.append(
            MedicineInput(
                name=name,
                form=text(item.get("form")) or None,
                strength=text(item.get("strength")) or None,
                frequency=text(item.get("frequency")) or None,
                duration_days=parse_int_days(item.get("days") or item.get("duration")),
                dosage=text(item.get("dosage")) or None,
                route=text(item.get("route")) or None,
            )
        )
    return tuple(out)


def to_allergies(form_data: dict[str, Any]) -> tuple[AllergyInput, ...]:
    items = form_data.get("allergyDetails") or []
    out: list[AllergyInput] = []
    if not isinstance(items, list):
        return tuple()
    for item in items:
        if not isinstance(item, dict):
            continue
        allergen = text(item.get("allergen") or item.get("allergies"))
        if not allergen:
            continue
        out.append(
            AllergyInput(
                text=allergen,
                reaction=text(item.get("reaction")) or None,
                severity=text(item.get("severity")) or None,
            )
        )
    return tuple(out)


def _normalize_immunization_date(value: Any) -> str | None:
    raw = text(value)
    if not raw:
        return None
    return raw[:10] if len(raw) >= 10 else raw


def to_immunization_inputs(form_data: dict[str, Any]) -> tuple[ImmunizationInput, ...]:
    out: list[ImmunizationInput] = []
    for item in immunization_rows_from_form_data(form_data):
        vaccine_name = immunization_vaccine_name(item)
        if not vaccine_name:
            continue
        dose_raw = item.get("doseNumber") or item.get("dose_number")
        dose_number: int | None = None
        if dose_raw is not None and str(dose_raw).strip() != "":
            try:
                dose_number = int(float(str(dose_raw)))
            except (TypeError, ValueError):
                dose_number = None
        out.append(
            ImmunizationInput(
                vaccine_name=vaccine_name,
                date=_normalize_immunization_date(item.get("dateOfDose") or item.get("date")),
                dose_number=dose_number,
                lot_number=text(item.get("lotNumber") or item.get("lot_number")) or None,
                manufacturer=text(item.get("manufacturer")) or None,
                next_due_date=_normalize_immunization_date(
                    item.get("nextDueDate") or item.get("next_due_date")
                ),
            )
        )
    return tuple(out)


def to_op_consult_input(
    *,
    patient: PatientInput,
    practitioner: PractitionerInput,
    encounter: EncounterInput,
    form_data: dict[str, Any],
    document_pdf_base64: str | None = None,
) -> OpConsultInput:
    document: DocumentInput | None = None
    if document_pdf_base64:
        document = DocumentInput(
            title="Consultation attachment",
            content_type="application/pdf",
            data_base64=document_pdf_base64,
        )
    legacy_vitals = to_legacy_vitals(form_data.get("vitals"))
    return OpConsultInput(
        patient=patient,
        practitioner=practitioner,
        encounter=encounter,
        chief_complaints=to_chief_complaints(form_data),
        diagnoses=to_diagnoses(form_data),
        medicines=to_medicines(form_data),
        allergies=to_allergies(form_data),
        legacy_vitals=legacy_vitals,
        document=document,
    )


def to_prescription_input(
    *,
    patient: PatientInput,
    practitioner: PractitionerInput,
    encounter: EncounterInput,
    form_data: dict[str, Any],
    pdf_base64: str | None = None,
) -> PrescriptionInput:
    return PrescriptionInput(
        patient=patient,
        practitioner=practitioner,
        encounter=encounter,
        diagnoses=to_diagnoses(form_data),
        medicines=to_medicines(form_data),
        pdf_base64=pdf_base64,
    )


def to_immunization_bundle_input(
    *,
    patient: PatientInput,
    practitioner: PractitionerInput,
    encounter: EncounterInput,
    form_data: dict[str, Any],
    document_pdf_base64: str | None = None,
) -> ImmunizationBundleInput:
    document: DocumentInput | None = None
    if document_pdf_base64:
        document = DocumentInput(
            title="Immunization record attachment",
            content_type="application/pdf",
            data_base64=document_pdf_base64,
        )
    return ImmunizationBundleInput(
        patient=patient,
        practitioner=practitioner,
        encounter=encounter,
        immunizations=to_immunization_inputs(form_data),
        document=document,
    )


def to_health_document_input(
    *,
    patient: PatientInput,
    practitioner: PractitionerInput | None,
    encounter: EncounterInput,
    document_row: HealthDocument,
    data_base64: str,
) -> HealthDocumentInput:
    return HealthDocumentInput(
        patient=patient,
        author=practitioner,
        encounter=encounter,
        document=DocumentInput(
            title=document_row.document_title or document_row.original_file_name,
            content_type=document_row.mime_type or "application/octet-stream",
            data_base64=data_base64,
            created=document_row.uploaded_at.isoformat() if document_row.uploaded_at else None,
        ),
    )
