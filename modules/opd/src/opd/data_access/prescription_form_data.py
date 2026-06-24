from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import exists, or_, select, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from opd.models.prescription_row import Prescription

if TYPE_CHECKING:
    from opd.models.prescription import PrescriptionModel

_FORM_DATA_ATTR = object()

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


def _list_has_content(items: Any) -> bool:
    return isinstance(items, list) and len(items) > 0


def _immunization_list_has_content(items: Any) -> bool:
    if not isinstance(items, list):
        return False
    return any(
        isinstance(row, dict)
        and _text(row.get("vaccineName") or row.get("vaccine_name") or row.get("name"))
        for row in items
    )


def _vitals_has_content(vitals: Any) -> bool:
    if not isinstance(vitals, dict):
        return False
    return any(_text(value) for value in vitals.values())


def _stored_form_data_has_content(stored: dict[str, Any]) -> bool:
    if not stored:
        return False
    if _list_has_content(stored.get("chiefComplaints")) or _list_has_content(
        stored.get("chief_complaints")
    ):
        return True
    if _list_has_content(stored.get("immunizations")):
        return True
    if _list_has_content(stored.get("medicines")):
        return True
    if _vitals_has_content(stored.get("vitals")):
        return True
    return False


def _prescription_form_data_column(
    session: Session,
    prescription_id: UUID,
    tenant_id: UUID,
) -> dict[str, Any]:
    """Read JSONB form_data for normalized PrescriptionModel rows (same table, legacy column)."""
    try:
        table = _qualified_table(session, "prescriptions")
        raw = session.execute(
            text(
                f"""
                SELECT form_data
                FROM {table}
                WHERE id = :pid AND iq_tenant_id = :tenant
                LIMIT 1
                """
            ),
            {"pid": str(prescription_id), "tenant": str(tenant_id)},
        ).scalar_one_or_none()
    except (OperationalError, ProgrammingError):
        return {}
    return raw if isinstance(raw, dict) else {}


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
    rx: Prescription | PrescriptionModel | None,
    *,
    session: Session | None = None,
) -> bool:
    """True when a draft prescription carries nurse/doctor clinical input (not an empty shell)."""
    if rx is None:
        return False

    form_data = getattr(rx, "form_data", _FORM_DATA_ATTR)
    if form_data is not _FORM_DATA_ATTR:
        return _stored_form_data_has_content(form_data or {})

    from opd.models.prescription import PrescriptionModel

    if not isinstance(rx, PrescriptionModel):
        return False
    if session is None:
        return False

    if _stored_form_data_has_content(
        _prescription_form_data_column(session, rx.id, rx.tenant_id)
    ):
        return True
    return _prescription_model_has_normalized_clinical_content(session, rx)


def _coerce_vital_number(raw: str) -> int | float:
    if "." in raw:
        return float(raw)
    return int(raw)


def _form_vitals_to_legacy_columns(vitals: dict[str, Any]) -> dict[str, int | float]:
    out: dict[str, int | float] = {}
    for code, raw in vitals.items():
        text = _text(raw)
        if not text:
            continue
        column = FORM_VITAL_TO_LEGACY_COLUMN.get(code, code)
        if (
            column not in _LEGACY_VITAL_COLUMNS
            and column not in FORM_VITAL_TO_LEGACY_COLUMN.values()
        ):
            continue
        try:
            out[column] = _coerce_vital_number(text)
        except ValueError:
            continue
    return out


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


def _to_iso_datetime(value: Any) -> str | None:
    raw = _text(value)
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed.isoformat()
    except ValueError:
        return None


def _immunization_has_meta(row: dict[str, Any]) -> bool:
    return bool(
        _text(row.get("manufacturer"))
        or _text(row.get("lotNumber"))
        or _text(row.get("dateOfDose"))
        or _text(row.get("doseNumber"))
        or _text(row.get("notes"))
    )


def _immunization_row_to_vaccine_db(row: dict[str, Any], line_no: int) -> dict[str, Any]:
    due_by = _to_iso_datetime(row.get("nextDueDate"))
    if not _immunization_has_meta(row):
        return {
            "line_no": line_no,
            "name": _text(row.get("vaccineName")),
            "vaccine_code": None,
            "instructions": _text(row.get("notes")) or None,
            "due_by": due_by,
            "status": "pending",
        }

    meta = {
        "manufacturer": _text(row.get("manufacturer")) or None,
        "lotNumber": _text(row.get("lotNumber")) or None,
        "dateOfDose": _text(row.get("dateOfDose")) or None,
        "doseNumber": _text(row.get("doseNumber")) or None,
        "notes": _text(row.get("notes")) or None,
    }
    meta = {k: v for k, v in meta.items() if v}
    return {
        "line_no": line_no,
        "name": _text(row.get("vaccineName")),
        "vaccine_code": None,
        "instructions": f"{IMMUNIZATION_META_PREFIX}{json.dumps(meta, separators=(',', ':'))}",
        "due_by": due_by,
        "status": "pending",
    }


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


def _qualified_table(session: Session, table: str) -> str:
    bind = session.get_bind()
    if bind is not None and bind.dialect.name == "sqlite":
        return table
    return f"opd.{table}"


def _load_normalized_clinical(session: Session, prescription_id: UUID) -> dict[str, Any]:
    try:
        return _load_normalized_clinical_impl(session, prescription_id)
    except (OperationalError, ProgrammingError):
        return {}


def _load_normalized_clinical_impl(session: Session, prescription_id: UUID) -> dict[str, Any]:
    pid = str(prescription_id)
    clinical: dict[str, Any] = {}
    cc_table = _qualified_table(session, "prescription_chief_complaints")
    vaccines_table = _qualified_table(session, "prescription_vaccines_required")
    medicines_table = _qualified_table(session, "prescription_medicines")
    vitals_table = _qualified_table(session, "prescription_legacy_vitals")
    mh_table = _qualified_table(session, "prescription_medical_histories")

    cc_rows = session.execute(
        text(
            f"""
            SELECT line_no, complaint_text, duration_value, duration_unit, severity, notes
            FROM {cc_table}
            WHERE prescription_id = :pid
            ORDER BY line_no
            """
        ),
        {"pid": pid},
    ).mappings().all()
    if cc_rows:
        clinical["chief_complaints"] = [dict(row) for row in cc_rows]

    vaccine_rows = session.execute(
        text(
            f"""
            SELECT line_no, name, vaccine_code, instructions, due_by, status
            FROM {vaccines_table}
            WHERE prescription_id = :pid
            ORDER BY line_no
            """
        ),
        {"pid": pid},
    ).mappings().all()
    if vaccine_rows:
        clinical["vaccines_required"] = [dict(row) for row in vaccine_rows]

    med_rows = session.execute(
        text(
            f"""
            SELECT line_no, medicine_id, name, strength, dosage, duration,
                   frequency, quantity, route
            FROM {medicines_table}
            WHERE prescription_id = :pid
            ORDER BY line_no
            """
        ),
        {"pid": pid},
    ).mappings().all()
    if med_rows:
        clinical["medicines"] = [dict(row) for row in med_rows]

    lv = session.execute(
        text(
            f"""
            SELECT height_cm, weight_kg, bmi, temperature_c, pulse_bpm, respiratory_rate,
                   bp_systolic, bp_diastolic, spo2_percent, blood_sugar_mg_dl
            FROM {vitals_table}
            WHERE prescription_id = :pid
            LIMIT 1
            """
        ),
        {"pid": pid},
    ).mappings().first()
    if lv:
        clinical["legacy_vitals"] = dict(lv)

    mh = session.execute(
        text(
            f"""
            SELECT smoking_status, alcohol_status, other_notes
            FROM {mh_table}
            WHERE prescription_id = :pid
            LIMIT 1
            """
        ),
        {"pid": pid},
    ).mappings().first()
    if mh:
        clinical["medical_history"] = dict(mh)

    return clinical


def _clinical_to_form_data(clinical: dict[str, Any]) -> dict[str, Any]:
    form = _empty_form_data()

    for row in clinical.get("chief_complaints") or []:
        form["chiefComplaints"].append(
            {
                "id": str(uuid.uuid4()),
                "complaint": row.get("complaint_text") or "",
                "severity": row.get("severity") or "",
                "duration": row.get("duration_value") or "",
                "durationUnit": row.get("duration_unit") or "days",
                "notes": row.get("notes") or "",
            }
        )

    for row in clinical.get("vaccines_required") or []:
        form["immunizations"].append(_vaccine_db_to_immunization_row(row))

    legacy = clinical.get("legacy_vitals") or {}
    mapped_vitals = _legacy_columns_to_form_vitals(legacy)
    if mapped_vitals:
        form["vitals"] = mapped_vitals

    mh = clinical.get("medical_history") or {}
    if mh:
        form["medicalHistory"] = {
            **form["medicalHistory"],
            "smokingStatus": mh.get("smoking_status") or "",
            "alcoholStatus": mh.get("alcohol_status") or "",
            "historyOfPresentIllness": mh.get("other_notes") or "",
        }

    for row in clinical.get("medicines") or []:
        medicine_id = row.get("medicine_id")
        catalog_id = str(medicine_id).strip() if medicine_id is not None else ""
        medicine_row: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "medicine": row.get("name") or "",
            "strength": row.get("strength") or "",
            "dosage": row.get("dosage") or "",
            "days": row.get("duration") or "",
            "frequency": row.get("frequency") or "",
            "quantity": row.get("quantity") or "",
            "route": row.get("route") or "",
        }
        if catalog_id:
            medicine_row["medicineId"] = catalog_id
            medicine_row["medicine_id"] = catalog_id
        form["medicines"].append(medicine_row)

    return form


def build_form_data_from_prescription_model(rx: PrescriptionModel) -> dict[str, Any]:
    """Build ABDM/FHIR Create-RX form_data directly from a normalized prescription aggregate.

    This is the single source of truth for the ABDM-M2 trigger's no-override path
    (normalized ``/finalize``). It covers every child collection the FHIR bundle mappers
    and content gates actually consume, so it is strictly *more* complete than the legacy
    ``effective_form_data`` 5-table reconstruction — which silently dropped diagnosis,
    allergies, and care plan. (``effective_form_data`` survives for the JSONB read/PDF
    paths; this function only replaces it as the M2 bundle source.)

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


def _medicine_row_catalog_id(row: dict[str, Any]) -> str | None:
    for key in ("medicineId", "medicine_id"):
        raw = row.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    return None


def _enrich_medicines_with_catalog_ids(
    medicines: list[Any],
    catalog_source: list[Any],
) -> list[Any]:
    """Fill missing catalog ids on stored JSON rows from normalized prescription_medicines."""
    if not isinstance(medicines, list) or not isinstance(catalog_source, list):
        return medicines

    enriched: list[Any] = []
    for index, row in enumerate(medicines):
        if not isinstance(row, dict):
            enriched.append(row)
            continue
        if _medicine_row_catalog_id(row):
            enriched.append(row)
            continue
        source = catalog_source[index] if index < len(catalog_source) else None
        if isinstance(source, dict):
            catalog_id = _medicine_row_catalog_id(source)
            if catalog_id:
                enriched.append({**row, "medicineId": catalog_id, "medicine_id": catalog_id})
                continue
        enriched.append(row)
    return enriched


def _merge_form_data(base: dict[str, Any], stored: dict[str, Any]) -> dict[str, Any]:
    """Prefer non-empty JSON sections; fill gaps from normalized clinical tables."""
    merged = _empty_form_data()
    merged.update({k: v for k, v in base.items() if k in merged})

    for key, value in stored.items():
        if key not in merged:
            merged[key] = value
            continue
        if (
            isinstance(merged[key], list)
            and key == "immunizations"
            and _immunization_list_has_content(value)
        ):
            merged[key] = value
        elif isinstance(merged[key], list) and key != "immunizations" and _list_has_content(value):
            merged[key] = value
        elif key == "vitals" and _vitals_has_content(value):
            merged[key] = value
        elif key == "medicalHistory" and isinstance(value, dict):
            merged[key] = {**merged[key], **value}
        elif key == "carePlan" and isinstance(value, dict):
            merged[key] = {**merged[key], **value}

    list_keys = (
        "chiefComplaints",
        "immunizations",
        "medicines",
        "allergyDetails",
        "diagnosis",
        "testsRequired",
        "imagingRequired",
        "procedures",
        "physicalActivity",
    )
    for key in list_keys:
        if key == "immunizations":
            if not _immunization_list_has_content(
                merged.get(key)
            ) and _immunization_list_has_content(base.get(key)):
                merged[key] = base[key]
            continue
        if not _list_has_content(merged.get(key)) and _list_has_content(base.get(key)):
            merged[key] = base[key]

    if not _vitals_has_content(merged.get("vitals")) and _vitals_has_content(base.get("vitals")):
        merged["vitals"] = base["vitals"]

    if _list_has_content(merged.get("medicines")):
        merged["medicines"] = _enrich_medicines_with_catalog_ids(
            merged.get("medicines") or [],
            base.get("medicines") or [],
        )

    return merged


def effective_form_data(session: Session, rx: Prescription) -> dict[str, Any]:
    """Return Create-RX form_data from JSON column and legacy normalized tables."""
    stored = rx.form_data or {}
    clinical = _load_normalized_clinical(session, rx.id)
    from_normalized = _clinical_to_form_data(clinical) if clinical else _empty_form_data()

    if not _stored_form_data_has_content(stored):
        return from_normalized if clinical else stored or _empty_form_data()

    return _merge_form_data(from_normalized, stored)


def effective_form_data_for_prescription(
    session: Session,
    tenant_id: UUID,
    prescription_id: UUID,
) -> dict[str, Any]:
    """Load merged Create-RX form_data for a prescription id (JSON + normalized tables)."""
    from sqlalchemy import select

    rx = session.scalar(
        select(Prescription).where(
            Prescription.tenant_id == tenant_id,
            Prescription.id == prescription_id,
        )
    )
    if rx is None:
        return _empty_form_data()
    return effective_form_data(session, rx)


def persist_normalized_from_form_data(
    session: Session,
    tenant_id: UUID,
    prescription_id: UUID,
    form_data: dict[str, Any],
) -> None:
    """Sync legacy normalized child tables from Create-RX form_data (phase-0 subset)."""
    try:
        with session.begin_nested():
            _persist_normalized_from_form_data_impl(session, tenant_id, prescription_id, form_data)
    except (OperationalError, ProgrammingError):
        # Child-table sync is best-effort; rollback savepoint only (keep outer txn valid).
        return


def _persist_normalized_from_form_data_impl(
    session: Session,
    tenant_id: UUID,
    prescription_id: UUID,
    form_data: dict[str, Any],
) -> None:
    pid = str(prescription_id)
    tid = str(tenant_id)
    now = datetime.now(UTC)
    vaccines_table = _qualified_table(session, "prescription_vaccines_required")

    session.execute(
        text(f"DELETE FROM {vaccines_table} WHERE prescription_id = :pid"),
        {"pid": pid},
    )

    vitals_table = _qualified_table(session, "prescription_legacy_vitals")
    legacy_columns = _form_vitals_to_legacy_columns(form_data.get("vitals") or {})
    session.execute(
        text(f"DELETE FROM {vitals_table} WHERE prescription_id = :pid"),
        {"pid": pid},
    )
    if legacy_columns:
        columns = ", ".join(legacy_columns.keys())
        placeholders = ", ".join(f":{col}" for col in legacy_columns.keys())
        session.execute(
            text(
                f"""
                INSERT INTO {vitals_table} (
                    prescription_id, iq_tenant_id, {columns}, created_at, updated_at
                )
                VALUES (
                    :pid, :tenant, {placeholders}, :now, :now
                )
                """
            ),
            {"tenant": tid, "pid": pid, "now": now, **legacy_columns},
        )

    line_no = 0
    for row in form_data.get("immunizations") or []:
        if not isinstance(row, dict):
            continue
        vaccine_name = _text(
            row.get("vaccineName") or row.get("vaccine_name") or row.get("name")
        )
        if not vaccine_name:
            continue
        line_no += 1
        payload = _immunization_row_to_vaccine_db(row, line_no)
        session.execute(
            text(
                f"""
                INSERT INTO {vaccines_table} (
                    id, iq_tenant_id, prescription_id, line_no, vaccine_code, name,
                    due_by, instructions, status, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid(), :tenant, :pid, :line_no, :vaccine_code, :name,
                    :due_by, :instructions, CAST(:status AS opd.order_item_status), :now, :now
                )
                """
            ),
            {
                "tenant": tid,
                "pid": pid,
                "line_no": payload["line_no"],
                "vaccine_code": payload["vaccine_code"],
                "name": payload["name"],
                "due_by": payload["due_by"],
                "instructions": payload["instructions"],
                "status": payload["status"],
                "now": now,
            },
        )
