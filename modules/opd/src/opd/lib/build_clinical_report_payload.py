from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from opd.data_access.registration_patient_source import VisitPatientSource
from opd.lib.clinical_report_context import ClinicalReportContext
from opd.lib.vitals_report_bundle import build_vitals_report_bundle
from opd.schemas.prescription.prescription import PrescriptionClinicalPayload

ClinicalReportType = Literal["prescription", "op-consultation", "immunization"]

REPORT_SLUG_BY_TYPE: dict[ClinicalReportType, str] = {
    "prescription": "prescription",
    "op-consultation": "op-consultation",
    "immunization": "immunization",
}

REPORT_TITLE_BY_TYPE: dict[ClinicalReportType, str] = {
    "prescription": "Prescription Report",
    "op-consultation": "OP Consultation Report",
    "immunization": "Immunization Report",
}


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _row_id(row: dict[str, Any], index: int) -> str:
    return _text(row.get("id")) or str(index + 1)


def _clinical_base(
    source: VisitPatientSource,
    context: ClinicalReportContext,
    report_type: ClinicalReportType,
) -> dict[str, Any]:
    facility_name = _text(context.facility_name) or "Hospital"
    doctor_name = _text(context.doctor_name) or "—"
    department_name = _text(context.department_name) or None

    return {
        "facility": {
            "name": facility_name,
            "address": _text(context.facility_address) or None,
            "phone": _text(context.facility_phone) or None,
            "email": _text(context.facility_email) or None,
            "facilityId": _text(context.facility_id) or None,
            "logoUrl": _text(context.logo_url) or None,
        },
        "patient": {
            "name": source.patient_name,
            "uhid": source.patient_uhid,
            "phoneNumber": source.patient_phone,
            "abhaNumber": source.patient_abha_number,
            "abhaAddress": source.patient_abha_address,
            "address": _text(context.patient_address) or None,
        },
        "visit": {
            "createdAt": source.visit_created_at.isoformat(),
            "visitNumber": source.visit_number,
            "departmentName": department_name,
        },
        "doctor": {
            "name": doctor_name,
            "specialization": department_name,
        },
        "options": {"format": "A4"},
    }


def _map_diagnoses(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(form_data.get("diagnosis") or []):
        if not isinstance(row, dict):
            continue
        notes = _text(row.get("notes"))
        if not notes:
            continue
        certainty = _text(row.get("certainty"))
        rows.append(
            {
                "id": _row_id(row, index),
                "notes": notes,
                "certainty": certainty if certainty in ("confirmed", "presumed") else "",
            }
        )
    return rows


def _map_medicine_dosage(row: dict[str, Any]) -> str:
    dosage = _text(row.get("dosage"))
    if dosage:
        return dosage
    morning = _text(row.get("dosageMorning"))
    afternoon = _text(row.get("dosageAfternoon"))
    night = _text(row.get("dosageNight"))
    if any((morning, afternoon, night)):
        return f"{morning or '0'}-{afternoon or '0'}-{night or '0'}"
    return ""


def _map_medicines(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(form_data.get("medicines") or []):
        if not isinstance(row, dict):
            continue
        name = _text(row.get("medicine"))
        if not name:
            continue
        dosage = _map_medicine_dosage(row)
        instructions = _text(row.get("instructions"))
        toa = _text(row.get("toa"))
        rows.append(
            {
                "id": _row_id(row, index),
                "name": name,
                "dosage": dosage or None,
                "frequency": _text(row.get("frequency")) or None,
                "duration": _text(row.get("days")) or None,
                "instructions": instructions or None,
                "strength": _text(row.get("strength")) or None,
                "form": _text(row.get("dosageForm")) or None,
                "category": _text(row.get("dosageForm")) or None,
                "quantity": _text(row.get("quantity")) or None,
                "route": _text(row.get("route")) or None,
                "method": toa or None,
                "sos": toa or instructions or None,
            }
        )
    return rows


def _enrich_medicines_from_clinical(
    medicines: list[dict[str, Any]],
    clinical: PrescriptionClinicalPayload | None,
) -> list[dict[str, Any]]:
    """Backfill strength from normalized prescription rows when JSON form_data omits it."""
    if not clinical or not clinical.medicines:
        return medicines
    strength_by_name = {
        (row.name or "").strip().lower(): (row.strength or "").strip()
        for row in clinical.medicines
        if row.name and row.strength
    }
    if not strength_by_name:
        return medicines

    enriched: list[dict[str, Any]] = []
    for med in medicines:
        if med.get("strength"):
            enriched.append(med)
            continue
        name_key = (med.get("name") or "").strip().lower()
        strength = strength_by_name.get(name_key)
        enriched.append({**med, "strength": strength} if strength else med)
    return enriched


def _normalize_immunization_date(value: str) -> str | None:
    """Return YYYY-MM-DD for report payloads (no time component)."""
    raw = _text(value)
    if not raw:
        return None
    if len(raw) >= 10 and raw[4] == "-" and raw[7] == "-":
        return raw[:10]
    return raw


def _map_immunizations(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in form_data.get("immunizations") or []:
        if not isinstance(row, dict):
            continue
        vaccine_name = _text(row.get("vaccineName"))
        if not vaccine_name:
            continue
        dose_number_raw = _text(row.get("doseNumber"))
        dose_number = int(dose_number_raw) if dose_number_raw.isdigit() else None
        rows.append(
            {
                "vaccine": vaccine_name,
                "vaccineName": vaccine_name,
                "manufacturer": _text(row.get("manufacturer")) or None,
                "lotNo": _text(row.get("lotNumber")) or None,
                "dateOfDose": _normalize_immunization_date(_text(row.get("dateOfDose"))),
                "nextDueDate": _normalize_immunization_date(_text(row.get("nextDueDate"))),
                "doseNumber": dose_number,
                "vaccinatedBy": _text(row.get("vaccinatedBy")) or None,
            }
        )
    return rows


def _map_complaints(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in form_data.get("chiefComplaints") or []:
        if not isinstance(row, dict):
            continue
        complaint = _text(row.get("complaint"))
        if not complaint:
            continue
        rows.append(
            {
                "complaint": complaint,
                "severity": _text(row.get("severity")) or None,
                "duration": _text(row.get("duration")) or None,
                "durationUnit": _text(row.get("durationUnit")) or None,
                "notes": _text(row.get("notes")) or None,
            }
        )
    return rows


def _map_allergies(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in form_data.get("allergyDetails") or []:
        if not isinstance(row, dict):
            continue
        allergen = _text(row.get("allergen"))
        if not allergen:
            continue
        reaction = _text(row.get("reaction"))
        severity = _text(row.get("severity"))
        rows.append(
            {
                "allergies": allergen,
                "reactions": reaction or None,
                "severity": severity or None,
                "allergen": allergen,
                "reaction": reaction or None,
            }
        )
    return rows


def _map_tests(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in form_data.get("testsRequired") or []:
        if not isinstance(row, dict):
            continue
        name = _text(row.get("testName"))
        if not name:
            continue
        rows.append(
            {
                "name": name,
                "test": name,
                "status": _text(row.get("status")) or "pending",
            }
        )
    return rows


def _map_imaging(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in form_data.get("imagingRequired") or []:
        if not isinstance(row, dict):
            continue
        name = _text(row.get("testName"))
        if not name:
            continue
        rows.append(
            {
                "name": name,
                "instructions": _text(row.get("instructions")) or None,
                "status": _text(row.get("status")) or "pending",
            }
        )
    return rows


def _map_procedures(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in form_data.get("procedures") or []:
        if not isinstance(row, dict):
            continue
        name = _text(row.get("procedureName"))
        if not name:
            continue
        rows.append(
            {
                "procedureName": name,
                "advisedDate": _text(row.get("advisedDate")) or None,
            }
        )
    return rows


def _parse_optional_number(value: Any) -> int | float | None:
    text = _text(value)
    if not text:
        return None
    try:
        return float(text) if "." in text else int(text)
    except ValueError:
        return None


def _map_exercise_types(value: Any) -> list[str]:
    if isinstance(value, list):
        return [item for item in (_text(v) for v in value) if item]
    text = _text(value)
    return [text] if text else []


def _map_physical_activity(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in form_data.get("physicalActivity") or []:
        if not isinstance(row, dict):
            continue
        steps_count = _parse_optional_number(row.get("stepsCount", row.get("steps")))
        sleep_duration = _parse_optional_number(row.get("sleepDuration"))
        calories_burned = _parse_optional_number(row.get("caloriesBurned"))
        exercise_types = _map_exercise_types(row.get("exerciseType"))
        if not any((steps_count, sleep_duration, calories_burned, exercise_types)):
            continue
        rows.append(
            {
                "stepsCount": steps_count if steps_count is not None else 0,
                "sleepDuration": sleep_duration if sleep_duration is not None else 0,
                "caloriesBurned": calories_burned if calories_burned is not None else 0,
                "exerciseType": exercise_types,
            }
        )
    return rows


def _map_care_plan(form_data: dict[str, Any]) -> dict[str, Any] | None:
    care_plan = form_data.get("carePlan")
    if not isinstance(care_plan, dict):
        return None
    advice = _text(care_plan.get("advice"))
    refer_to = _text(care_plan.get("referTo"))
    next_visit = _text(care_plan.get("nextVisit"))
    next_visit_unit = _text(care_plan.get("nextVisitUnit"))
    if not any((advice, refer_to, next_visit)):
        return None
    return {
        "advice": advice or None,
        "referTo": refer_to or None,
        "nextVisit": next_visit or None,
        "nextVisitUnit": next_visit_unit or None,
    }


def _map_medical_history(form_data: dict[str, Any]) -> dict[str, Any] | None:
    medical_history = form_data.get("medicalHistory")
    if not isinstance(medical_history, dict):
        return None
    chronic = _text(medical_history.get("chronicIllness"))
    smoking = _text(medical_history.get("smokingStatus"))
    alcohol = _text(medical_history.get("alcoholStatus"))
    hpi = _text(medical_history.get("historyOfPresentIllness"))
    diet_type = _text(medical_history.get("dietType"))
    if not any((chronic, smoking, alcohol, hpi, diet_type)):
        return None
    return {
        "chronicIllness": chronic or None,
        "smokingStatus": smoking or None,
        "alcoholStatus": alcohol or None,
        "alcoholDrinking": alcohol or None,
        "dietType": diet_type or None,
        "historyOfPresentIllness": hpi or None,
    }


def _vaccine_row_to_immunization(row: Any) -> dict[str, Any]:
    from opd.data_access.prescription_form_data import _vaccine_db_to_immunization_row

    return _vaccine_db_to_immunization_row(
        {
            "name": row.name,
            "instructions": row.instructions,
            "due_by": row.due_by.isoformat() if row.due_by else None,
        }
    )


def clinical_payload_to_form_data(clinical: PrescriptionClinicalPayload) -> dict[str, Any]:
    """Normalize prescription clinical payload into Create-RX form_data shape."""
    legacy = clinical.legacy_vitals
    vitals: dict[str, str] = {}
    if legacy is not None:
        legacy_map = {
            "systolic_bp": legacy.bp_systolic,
            "diastolic_bp": legacy.bp_diastolic,
            "pulse_rate": legacy.pulse_bpm,
            "temperature": legacy.temperature_c,
            "spo2": legacy.spo2_percent,
            "height": legacy.height_cm,
            "weight": legacy.weight_kg,
            "random_blood_sugar": legacy.blood_sugar_mg_dl,
            "bmi": legacy.bmi,
            "respiratory_rate": legacy.respiratory_rate,
        }
        vitals = {key: str(value) for key, value in legacy_map.items() if value is not None}

    for observation in clinical.vital_observations:
        code = _text(observation.vital_code)
        value = _text(observation.value_text)
        if code and value:
            vitals[code] = value

    mh = clinical.medical_history
    chronic = (
        clinical.medical_history_chronic_illnesses[0].illness_text
        if clinical.medical_history_chronic_illnesses
        else ""
    )

    return {
        "vitals": vitals,
        "chiefComplaints": [
            {
                "id": str(index + 1),
                "complaint": row.complaint_text,
                "severity": row.severity or "",
                "duration": row.duration_value or "",
                "durationUnit": row.duration_unit or "days",
                "notes": row.notes or "",
            }
            for index, row in enumerate(clinical.chief_complaints)
        ],
        "immunizations": [_vaccine_row_to_immunization(row) for row in clinical.vaccines_required],
        "diagnosis": [
            {
                "id": str(index + 1),
                "notes": row.notes or "",
                "certainty": row.certainty or "",
            }
            for index, row in enumerate(clinical.diagnoses)
        ],
        "medicines": [
            {
                "id": str(index + 1),
                "medicine": row.name,
                "strength": row.strength or "",
                "dosage": row.dosage or "",
                "days": row.duration or "",
                "frequency": row.frequency or "",
                "quantity": str(row.quantity) if row.quantity is not None else "",
                "route": row.route or "",
                "toa": row.method or "",
                "instructions": row.sos or "",
                "dosageForm": row.medicine_type or "",
            }
            for index, row in enumerate(clinical.medicines)
        ],
        "allergyDetails": [
            {
                "id": str(index + 1),
                "allergen": row.allergen_text,
                "reaction": row.reaction_text or "",
                "severity": row.severity or "",
            }
            for index, row in enumerate(clinical.medical_history_allergies)
        ],
        "testsRequired": [
            {
                "id": str(index + 1),
                "testName": row.name,
                "status": row.status.value if hasattr(row.status, "value") else str(row.status),
            }
            for index, row in enumerate(clinical.ordered_tests)
        ],
        "imagingRequired": [
            {
                "id": str(index + 1),
                "testName": row.name,
                "instructions": row.instructions or "",
                "status": row.status.value if hasattr(row.status, "value") else str(row.status),
            }
            for index, row in enumerate(clinical.ordered_imaging)
        ],
        "procedures": [
            {
                "id": str(index + 1),
                "procedureName": row.procedure_name,
                "advisedDate": row.advised_date.isoformat() if row.advised_date else "",
            }
            for index, row in enumerate(clinical.advised_procedures)
        ],
        "physicalActivity": [
            {
                "id": str(index + 1),
                "steps": str(row.steps_count) if row.steps_count is not None else "",
                "sleepDuration": (
                    str(row.sleep_duration_min) if row.sleep_duration_min is not None else ""
                ),
                "caloriesBurned": (
                    str(row.calories_burned) if row.calories_burned is not None else ""
                ),
                "exerciseType": row.exercise_types[0] if row.exercise_types else "",
            }
            for index, row in enumerate(clinical.physical_activities)
        ],
        "medicalHistory": {
            "chronicIllness": chronic,
            "smokingStatus": mh.smoking_status if mh else "",
            "alcoholStatus": mh.alcohol_status if mh else "",
            "historyOfPresentIllness": mh.other_notes if mh else "",
        },
        "carePlan": {
            "advice": clinical.care_plan.advice if clinical.care_plan else "",
            "referTo": clinical.care_plan.refer_to if clinical.care_plan else "",
            "nextVisit": (
                str(clinical.care_plan.next_visit_value)
                if clinical.care_plan and clinical.care_plan.next_visit_value is not None
                else ""
            ),
            "nextVisitUnit": clinical.care_plan.next_visit_unit if clinical.care_plan else "days",
        },
    }


def build_clinical_report_request(
    report_type: ClinicalReportType,
    *,
    form_data: dict[str, Any],
    source: VisitPatientSource,
    context: ClinicalReportContext,
    clinical: PrescriptionClinicalPayload | None = None,
    visitpad_vitals: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build pdf-platform typed request body for prescription, OP consult, or immunization."""
    base = _clinical_base(source, context, report_type)

    if report_type == "prescription":
        return {
            **base,
            "diagnoses": _map_diagnoses(form_data),
            "medicines": _enrich_medicines_from_clinical(
                _map_medicines(form_data),
                clinical,
            ),
        }

    if report_type == "immunization":
        return {
            **base,
            "immunizations": _map_immunizations(form_data),
            "showDepartment": True,
        }

    vitals_bundle = build_vitals_report_bundle(
        form_vitals=form_data.get("vitals") if isinstance(form_data.get("vitals"), dict) else {},
        vital_observations=clinical.vital_observations if clinical else [],
        visitpad_vitals=visitpad_vitals,
    )

    request = {
        **base,
        **vitals_bundle,
        "complaints": _map_complaints(form_data),
        "allergyDetails": _map_allergies(form_data),
        "diagnoses": _map_diagnoses(form_data),
        "medicines": _enrich_medicines_from_clinical(
            _map_medicines(form_data),
            clinical,
        ),
        "tests": _map_tests(form_data),
        "imaging": _map_imaging(form_data),
        "procedures": _map_procedures(form_data),
        "immunizations": _map_immunizations(form_data),
        "medicalHistory": _map_medical_history(form_data),
        "physicalActivity": _map_physical_activity(form_data),
    }
    care_plan = _map_care_plan(form_data)
    if care_plan:
        request["carePlan"] = care_plan
    return _finalize_op_consultation_request(request)


def _finalize_op_consultation_request(body: dict[str, Any]) -> dict[str, Any]:
    """Drop empty optional sections — matches hims OPConsultationReport validation."""
    out = dict(body)
    for key in (
        "complaints",
        "allergyDetails",
        "diagnoses",
        "medicines",
        "tests",
        "imaging",
        "procedures",
        "immunizations",
        "physicalActivity",
        "vitals",
        "vitalsV2",
        "vitalsMasterDisplay",
        "medicalHistory",
    ):
        if not out.get(key):
            out.pop(key, None)
    return out


def validate_report_request(
    report_type: ClinicalReportType,
    request_body: dict[str, Any],
) -> str | None:
    """Return an error message when the report has no printable content."""
    if report_type == "prescription":
        diagnoses = request_body.get("diagnoses") or []
        medicines = request_body.get("medicines") or []
        if not diagnoses and not medicines:
            return "No prescription data available for this visit"
        return None

    if report_type == "immunization":
        immunizations = request_body.get("immunizations") or []
        if not immunizations:
            return "No immunization records available for this visit"
        return None

    has_content = any(
        (
            request_body.get("vitals"),
            request_body.get("vitalsV2"),
            request_body.get("complaints"),
            request_body.get("allergyDetails"),
            request_body.get("diagnoses"),
            request_body.get("medicines"),
            request_body.get("tests"),
            request_body.get("imaging"),
            request_body.get("procedures"),
            request_body.get("carePlan"),
            request_body.get("immunizations"),
            request_body.get("medicalHistory"),
            request_body.get("physicalActivity"),
        )
    )
    if not has_content:
        return "No consultation data available for this visit"
    return None


def report_filename(report_type: ClinicalReportType, visit_number: str) -> str:
    safe_visit = visit_number.replace("/", "-").replace("\\", "-") or str(uuid4())
    return f"{report_type}-{safe_visit}.pdf"
