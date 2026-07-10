from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import exists, or_, select
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from opd.models.prescription import PrescriptionModel

IMMUNIZATION_META_PREFIX = "__hims_immunization_v1:"

# Create-RX vitals grid codes → prescription_legacy_vitals columns
# (matches web opd-legacy-vitals.ts)
FORM_VITAL_TO_LEGACY_COLUMN: dict[str, str] = {
    "systolic_bp": "bp_systolic",
    "diastolic_bp": "bp_diastolic",
    "pulse_rate": "pulse_bpm",
    "temperature": "temperature_c",
    "spo2": "spo2_percent",
    "height": "height_cm",
    "weight": "weight_kg",
    "random_blood_sugar": "blood_sugar_mg_dl",
    "bmi": "bmi",
    "respiratory_rate": "respiratory_rate",
}
LEGACY_COLUMN_TO_FORM_VITAL: dict[str, str] = {
    legacy: form for form, legacy in FORM_VITAL_TO_LEGACY_COLUMN.items()
}
_LEGACY_VITAL_COLUMNS = frozenset(FORM_VITAL_TO_LEGACY_COLUMN.values())


def _empty_form_data() -> dict[str, Any]:
    return {
        "vitals": {},
        "chiefComplaints": [],
        "immunizations": [],
        "physicalActivity": [],
        "medicalHistory": {
            "chronicIllness": "",
            "smokingStatus": "",
            "alcoholStatus": "",
            "dietType": "",
            "historyOfPresentIllness": "",
        },
        "allergyDetails": [],
        "diagnosis": [],
        "medicines": [],
        "testsRequired": [],
        "imagingRequired": [],
        "procedures": [],
        "carePlan": {"advice": "", "referTo": "", "nextVisit": "", "nextVisitUnit": "days"},
    }


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _prescription_model_has_normalized_clinical_content(
    session: Session,
    rx: PrescriptionModel,
) -> bool:
    """True when normalized child tables carry clinical input for this prescription."""
    from opd.models.prescription.children import (
        PrescriptionChiefComplaintModel,
        PrescriptionLegacyVitalsModel,
        PrescriptionMedicineModel,
        PrescriptionVaccineRequiredModel,
        PrescriptionVitalObservationModel,
    )

    pid = rx.id
    tid = rx.tenant_id
    child_exists = or_(
        exists(
            select(PrescriptionChiefComplaintModel.id).where(
                PrescriptionChiefComplaintModel.prescription_id == pid,
                PrescriptionChiefComplaintModel.tenant_id == tid,
            )
        ),
        exists(
            select(PrescriptionMedicineModel.id).where(
                PrescriptionMedicineModel.prescription_id == pid,
                PrescriptionMedicineModel.tenant_id == tid,
            )
        ),
        exists(
            select(PrescriptionVaccineRequiredModel.id).where(
                PrescriptionVaccineRequiredModel.prescription_id == pid,
                PrescriptionVaccineRequiredModel.tenant_id == tid,
            )
        ),
        exists(
            select(PrescriptionVitalObservationModel.id).where(
                PrescriptionVitalObservationModel.prescription_id == pid,
                PrescriptionVitalObservationModel.tenant_id == tid,
            )
        ),
        exists(
            select(PrescriptionLegacyVitalsModel.prescription_id).where(
                PrescriptionLegacyVitalsModel.prescription_id == pid,
                PrescriptionLegacyVitalsModel.tenant_id == tid,
            )
        ),
    )
    return bool(session.scalar(select(child_exists)))


def prescription_form_data_has_content(
    rx: PrescriptionModel | None,
    *,
    session: Session | None = None,
) -> bool:
    """True when a draft prescription carries nurse/doctor clinical input (not an empty shell).

    Content lives entirely in the normalized child tables — the legacy ``form_data`` JSONB
    column is gone (dropped in alembic ``0006``).
    """
    from opd.models.prescription import PrescriptionModel

    if not isinstance(rx, PrescriptionModel) or session is None:
        return False
    return _prescription_model_has_normalized_clinical_content(session, rx)


def _legacy_columns_to_form_vitals(legacy: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, raw in legacy.items():
        if key not in _LEGACY_VITAL_COLUMNS or raw is None:
            continue
        code = LEGACY_COLUMN_TO_FORM_VITAL.get(key, key)
        out[code] = str(raw)
    return out


def _iso_date_only(value: Any) -> str:
    raw = _text(value)
    if not raw:
        return ""
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed.date().isoformat()
    except ValueError:
        return raw[:10] if len(raw) >= 10 else raw


def _vaccine_db_to_immunization_row(row: dict[str, Any]) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "vaccineName": row.get("name") or "",
        "manufacturer": "",
        "lotNumber": "",
        "dateOfDose": "",
        "doseNumber": "",
        "nextDueDate": _iso_date_only(row.get("due_by")),
        "notes": "",
    }
    instructions = _text(row.get("instructions"))
    if not instructions.startswith(IMMUNIZATION_META_PREFIX):
        return {**base, "notes": instructions}

    try:
        meta = json.loads(instructions[len(IMMUNIZATION_META_PREFIX) :])
    except json.JSONDecodeError:
        return {**base, "notes": instructions}

    return {
        **base,
        "manufacturer": _text(meta.get("manufacturer")),
        "lotNumber": _text(meta.get("lotNumber")),
        "dateOfDose": _text(meta.get("dateOfDose")),
        "doseNumber": _text(meta.get("doseNumber")),
        "notes": _text(meta.get("notes")),
    }


def build_form_data_from_prescription_model(rx: PrescriptionModel) -> dict[str, Any]:
    """Build ABDM/FHIR Create-RX form_data directly from a normalized prescription aggregate.

    This is the single source of truth for the ABDM-M2 trigger's no-override path
    (normalized ``/finalize``). It covers every child collection the FHIR bundle mappers
    and content gates actually consume.

    The aggregate MUST be loaded with children eager-loaded — ``PrescriptionRepository``
    ``get_by_visit_id`` / ``get_by_id`` already ``selectinload`` all of them. This
    function performs no DB I/O of its own.

    Keys intentionally left empty (``testsRequired`` / ``imagingRequired`` / ``procedures``
    / ``physicalActivity`` / vital_observations): no FHIR bundle or clinical summary reads
    them today, so projecting them would be dead data. Add them here when a consumer needs
    them.

    Immunization meta (manufacturer/lot/dose) has no dedicated normalized columns, so the
    JSONB write path encodes it into ``vaccines_required.instructions`` via the
    ``__hims_immunization_v1:`` prefix. We reuse ``_vaccine_db_to_immunization_row`` to
    decode it on read — necessary to stay lossless until that data gets real columns (a
    follow-up); for normalized-written rows ``instructions`` is plain text and decodes to
    a notes string, so the decoder is harmless there.
    """
    form = _empty_form_data()

    lv = rx.legacy_vitals
    if lv is not None:
        legacy_cols = {
            column: getattr(lv, column)
            for column in _LEGACY_VITAL_COLUMNS
            if getattr(lv, column, None) is not None
        }
        mapped_vitals = _legacy_columns_to_form_vitals(legacy_cols)
        if mapped_vitals:
            form["vitals"] = mapped_vitals

    for cc in rx.chief_complaints:
        form["chiefComplaints"].append(
            {
                "id": str(cc.id),
                "complaint": cc.complaint_text or "",
                "severity": cc.severity or "",
                "duration": cc.duration_value or "",
                "durationUnit": cc.duration_unit or "days",
                "notes": cc.notes or "",
            }
        )

    for dx in rx.diagnoses:
        form["diagnosis"].append(
            {
                "id": str(dx.id),
                "notes": dx.notes or "",
                "certainty": dx.certainty or "",
            }
        )

    for med in rx.medicines:
        # Only fields the FHIR mappers (to_medicines) + content gates actually read are
        # projected — quantity is deliberately omitted (no consumer reads it, and it is a
        # Numeric/Decimal that would make form_data non-JSON-serializable).
        medicine_row: dict[str, Any] = {
            "id": str(med.id),
            "medicine": med.name or "",
            "strength": med.strength or "",
            "dosage": med.dosage or "",
            "days": med.duration or "",
            "frequency": med.frequency or "",
            "route": med.route or "",
        }
        if med.medicine_id is not None:
            catalog_id = str(med.medicine_id)
            medicine_row["medicineId"] = catalog_id
            medicine_row["medicine_id"] = catalog_id
        form["medicines"].append(medicine_row)

    for allergy in rx.medical_history_allergies:
        form["allergyDetails"].append(
            {
                "id": str(allergy.id),
                "allergen": allergy.allergen_text or "",
                "reaction": allergy.reaction_text or "",
                "severity": allergy.severity or "",
            }
        )

    for vaccine in rx.vaccines_required:
        form["immunizations"].append(
            _vaccine_db_to_immunization_row(
                {
                    "name": vaccine.name,
                    "instructions": vaccine.instructions,
                    "due_by": vaccine.due_by,
                }
            )
        )

    mh = rx.medical_history
    if mh is not None:
        form["medicalHistory"] = {
            **form["medicalHistory"],
            "smokingStatus": mh.smoking_status or "",
            "alcoholStatus": mh.alcohol_status or "",
            "historyOfPresentIllness": mh.other_notes or "",
        }

    cp = rx.care_plan
    if cp is not None:
        form["carePlan"] = {
            **form["carePlan"],
            "advice": cp.advice or "",
            "referTo": cp.refer_to or "",
            "nextVisit": str(cp.next_visit_value) if cp.next_visit_value is not None else "",
            "nextVisitUnit": cp.next_visit_unit or "days",
        }

    return form
