"""Shared Create-RX form_data formatting for clinical summaries and FHIR mappers."""

from __future__ import annotations

from typing import Any


def text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def form_item_label(item: Any, *keys: str) -> str:
    if isinstance(item, str):
        return text(item)
    if not isinstance(item, dict):
        return text(item)
    for key in keys:
        val = text(item.get(key))
        if val:
            return val
    return ""


def format_chief_complaint(item: dict[str, Any]) -> str:
    complaint = text(item.get("complaint"))
    if not complaint:
        return ""
    parts = [complaint]
    duration = text(item.get("duration"))
    unit = text(item.get("durationUnit") or "days")
    if duration:
        parts.append(f"{duration} {unit}")
    severity = text(item.get("severity"))
    if severity:
        parts.append(severity)
    return " — ".join(parts)


def format_medicine_line(med: dict[str, Any]) -> str:
    name = form_item_label(med, "medicine", "name", "medicineName", "display_name")
    if not name:
        return ""
    dose = text(med.get("dosage"))
    frequency = text(med.get("frequency"))
    days = text(med.get("days") or med.get("duration"))
    strength = text(med.get("strength"))
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


def vitals_lines(vitals: Any) -> list[str]:
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
        val = text(vitals.get(key))
        if val:
            lines.append(f"{label}: {val}")
    return lines


def lines_from_items(items: Any, section_label: str) -> list[str]:
    if not isinstance(items, list):
        return []
    lines: list[str] = []
    for item in items:
        if isinstance(item, dict) and text(item.get("complaint")):
            line = format_chief_complaint(item)
        elif isinstance(item, dict):
            line = form_item_label(item, "notes", "name", "text", "display", "medicine")
        else:
            line = text(item)
        if line:
            lines.append(line)
    if not lines:
        return []
    return [f"{section_label}: {', '.join(lines)}"]


def clinical_summary_from_form_data(form_data: dict[str, Any] | None) -> str:
    if not isinstance(form_data, dict):
        return "OP consultation record"

    sections: list[str] = []
    sections += lines_from_items(
        form_data.get("chiefComplaints") or form_data.get("chief_complaints"),
        "Chief complaints",
    )

    medical_history = form_data.get("medicalHistory")
    if isinstance(medical_history, dict):
        hpi = text(medical_history.get("historyOfPresentIllness"))
        if hpi:
            sections.append(f"History of present illness: {hpi}")

    sections += lines_from_items(form_data.get("diagnosis"), "Diagnosis")

    vitals = vitals_lines(form_data.get("vitals"))
    if vitals:
        sections.append(f"Vitals: {', '.join(vitals)}")

    medicines = form_data.get("medicines")
    if isinstance(medicines, list) and medicines:
        med_lines = [
            line
            for med in medicines
            if isinstance(med, dict)
            for line in [format_medicine_line(med)]
            if line
        ]
        if med_lines:
            sections.append(f"Medicines: {'; '.join(med_lines)}")

    care_plan = form_data.get("carePlan")
    if isinstance(care_plan, dict):
        advice = care_plan.get("advice")
        if isinstance(advice, list):
            sections += lines_from_items(advice, "Advice")
        elif text(advice):
            sections.append(f"Advice: {text(advice)}")

    return "\n\n".join(sections) if sections else "OP consultation record"


def escape_xml(text_value: str) -> str:
    return (
        text_value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def clinical_summary_html(summary: str) -> str:
    paragraphs = [p.strip() for p in summary.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = ["OP consultation record"]
    body = "".join(f"<p>{escape_xml(p)}</p>" for p in paragraphs)
    return f'<div xmlns="http://www.w3.org/1999/xhtml">{body}</div>'


def normalize_gender(raw: str | None) -> str:
    gender_raw = text(raw).lower()
    if gender_raw in {"male", "female", "other", "unknown"}:
        return gender_raw
    if gender_raw.startswith("m"):
        return "male"
    if gender_raw.startswith("f"):
        return "female"
    return "unknown"


def parse_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_int_days(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def has_prescription_clinical_data(form_data: dict[str, Any]) -> bool:
    diagnosis = form_data.get("diagnosis")
    medicines = form_data.get("medicines")
    has_dx = isinstance(diagnosis, list) and any(
        isinstance(item, dict) and form_item_label(item, "notes", "name", "text")
        for item in diagnosis
    )
    has_meds = isinstance(medicines, list) and any(
        isinstance(item, dict)
        and form_item_label(item, "medicine", "name", "medicineName", "display_name")
        for item in medicines
    )
    return has_dx or has_meds


def has_immunization_data(form_data: dict[str, Any]) -> bool:
    return bool(immunization_rows_from_form_data(form_data))


def immunization_vaccine_name(row: dict[str, Any]) -> str:
    return text(row.get("vaccineName") or row.get("vaccine_name") or row.get("name"))


def immunization_rows_from_form_data(form_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Create-RX immunizations plus normalized vaccines_required rows (deduped by vaccine name)."""
    from opd.data_access.prescription_form_data import _vaccine_db_to_immunization_row

    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for key in ("immunizations", "vaccines_required"):
        items = form_data.get(key)
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            row = _vaccine_db_to_immunization_row(item) if key == "vaccines_required" else item
            name = immunization_vaccine_name(row)
            if not name or name in seen:
                continue
            seen.add(name)
            rows.append(row)
    return rows


def abdm_immunization_debug(form_data: dict[str, Any] | None) -> dict[str, Any]:
    """Serializable snapshot for ABDM M2 immunization gate diagnostics."""
    if not isinstance(form_data, dict):
        return {
            "has_immunization_data": False,
            "reason": "form_data_missing_or_not_dict",
        }

    immunizations = form_data.get("immunizations")
    vaccines_required = form_data.get("vaccines_required")
    rows = immunization_rows_from_form_data(form_data)

    def _row_preview(item: Any) -> dict[str, str]:
        if not isinstance(item, dict):
            return {"type": type(item).__name__}
        return {
            "vaccineName": text(item.get("vaccineName")),
            "vaccine_name": text(item.get("vaccine_name")),
            "name": text(item.get("name")),
        }

    immunization_previews: list[dict[str, str]] = []
    if isinstance(immunizations, list):
        immunization_previews = [_row_preview(item) for item in immunizations[:3]]

    vaccine_required_previews: list[dict[str, str]] = []
    if isinstance(vaccines_required, list):
        vaccine_required_previews = [_row_preview(item) for item in vaccines_required[:3]]

    return {
        "has_immunization_data": bool(rows),
        "resolved_row_count": len(rows),
        "resolved_vaccine_names": [immunization_vaccine_name(row) for row in rows],
        "immunizations_len": len(immunizations) if isinstance(immunizations, list) else None,
        "vaccines_required_len": (
            len(vaccines_required) if isinstance(vaccines_required, list) else None
        ),
        "immunizations_preview": immunization_previews,
        "vaccines_required_preview": vaccine_required_previews,
        "form_data_keys": sorted(form_data.keys()),
    }
