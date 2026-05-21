#!/usr/bin/env python3
"""Generate docs/architecture/lld/opd/prescription.erd.json for ERD Editor."""

from __future__ import annotations

from pathlib import Path

from erd_editor_common import audit, audit_actor, build_erd, pk_id, tenant_col

OUT = Path(__file__).resolve().parents[1] / "docs/architecture/lld/opd/prescription.erd.json"

TABLES: list[tuple] = []


def T(
    key: str,
    name: str,
    comment: str,
    x: int,
    y: int,
    columns: list,
    color: str = "#c8e6c9",
) -> None:
    TABLES.append((key, name, comment, x, y, columns, color))


# --- Master stub (catalog owned elsewhere) ---
T(
    "vaccines",
    "vaccines",
    "MASTER (stub). Clinical vaccine catalog; vaccinesRequired has no Mongo ref today.",
    4800,
    400,
    [
        pk_id(),
        tenant_col(),
        ("vaccine_code", "VARCHAR(64)", "Catalog code", True, False, "", True),
        ("display_name", "VARCHAR(256)", "Full label", True),
        ("short_name", "VARCHAR(64)", "Abbreviated label", False),
    ]
    + audit,
    "#fff9c4",
)

# --- Aggregate root ---
T(
    "prescriptions",
    "prescriptions",
    "TRANSACTIONAL. Mongo Prescription aggregate root. 1:1 with visit (visit_id UNIQUE).",
    2200,
    2200,
    [
        pk_id("Prescription PK"),
        tenant_col(),
        (
            "visit_id",
            "UUID",
            "Logical ref registration.registration.visit_id (registration module); UNIQUE 1:1",
            True,
            False,
            "",
            True,
        ),
        ("patient_id", "UUID", "empi.patients", True),
        ("doctor_id", "UUID", "user_management.users", True),
        ("vitals_schema_version", "SMALLINT", "Mongo vitalsSchemaVersion (default 1)", True, False, "1"),
        ("status", "prescription_status", "draft | final | cancelled", True, False, "draft"),
        ("finalized_at", "TIMESTAMPTZ", "Set when status → final", False),
        ("cancelled_at", "TIMESTAMPTZ", "Set when status → cancelled", False),
        ("deleted_at", "TIMESTAMPTZ", "Soft delete; NULL = active", False),
    ]
    + audit
    + audit_actor,
    "#a5d6a7",
)

T(
    "prescription_status_history",
    "prescription_status_history",
    "CHILD 1:N audit. Status transitions (draft→final→cancelled).",
    2200,
    1200,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("from_status", "prescription_status", "Prior status; NULL on create", False),
        ("to_status", "prescription_status", "New status", True),
        ("changed_at", "TIMESTAMPTZ", "Transition time", True, False, "now()"),
        ("changed_by", "UUID", "user_management.users", False),
        ("reason", "TEXT", "Optional cancellation/amendment reason", False),
    ],
    "#e1bee7",
)

# --- Legacy vitals embed (1:0..1) ---
T(
    "prescription_legacy_vitals",
    "prescription_legacy_vitals",
    "CHILD 1:0..1. Mongo vitals{} embed (pre–vitalsV2 flat schema).",
    400,
    2200,
    [
        ("prescription_id", "UUID", "FK prescriptions; PK", True, True),
        tenant_col(),
        ("height_cm", "NUMERIC(6,2)", "height", False),
        ("weight_kg", "NUMERIC(6,2)", "weight", False),
        ("bmi", "NUMERIC(5,2)", "bmi", False),
        ("temperature_c", "NUMERIC(4,1)", "temperature", False),
        ("pulse_bpm", "SMALLINT", "pulse", False),
        ("bp_systolic", "SMALLINT", "blood pressure systolic", False),
        ("bp_diastolic", "SMALLINT", "blood pressure diastolic", False),
        ("respiratory_rate", "SMALLINT", "respiratoryRate", False),
        ("spo2_percent", "SMALLINT", "SpO2", False),
        ("blood_sugar_mg_dl", "NUMERIC(6,1)", "bloodSugar", False),
        ("notes", "TEXT", "Free-text vitals notes", False),
    ]
    + audit,
)

# --- vitalsV2[] ---
T(
    "prescription_vital_observations",
    "prescription_vital_observations",
    "CHILD 1:N. vitalsV2[] — catalog-linked observations.",
    400,
    600,
    [
        pk_id("Line PK"),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("vital_code", "VARCHAR(64)", "master_data vitals code", True),
        ("vital_global_id", "UUID", "master_data.vitals", False),
        ("value_text", "VARCHAR(512)", "Recorded value", True),
        ("unit_code", "VARCHAR(64)", "Unit code", False),
        ("recorded_at", "TIMESTAMPTZ", "When measured", True),
    ]
    + audit,
)

# --- chiefComplaints[], diagnosis[], symptoms[] ---
T(
    "prescription_chief_complaints",
    "prescription_chief_complaints",
    "CHILD 1:N. chiefComplaints[].",
    1400,
    600,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("complaint_text", "TEXT", "complaint", True),
        ("duration_value", "VARCHAR(32)", "duration", False),
        ("duration_unit", "VARCHAR(16)", "durationUnit default days", False),
        ("severity", "VARCHAR(32)", "severity", False),
        ("notes", "TEXT", "notes", False),
    ]
    + audit,
)
T(
    "prescription_diagnoses",
    "prescription_diagnoses",
    "CHILD 1:N. diagnosis[] free-text lines — NOT master Diagnosis collection.",
    2400,
    600,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("notes", "TEXT", "Clinical line text", False),
        ("certainty", "VARCHAR(32)", "default presumed", False),
        ("diagnosis_id", "UUID", "Optional coded link (future)", False),
    ]
    + audit,
)
T(
    "prescription_symptoms",
    "prescription_symptoms",
    "CHILD 1:N. symptoms[] normalized from Mongo string array.",
    3400,
    600,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("symptom_text", "VARCHAR(256)", "Symptom label", True),
    ]
    + audit[:1],
)

# --- medicalHistory embed ---
T(
    "prescription_medical_histories",
    "prescription_medical_histories",
    "CHILD 1:0..1. medicalHistory header (habits, otherNotes).",
    400,
    3400,
    [
        ("prescription_id", "UUID", "FK prescriptions; PK", True, True),
        tenant_col(),
        ("smoking_status", "VARCHAR(64)", "smoking habit", False),
        ("alcohol_status", "VARCHAR(64)", "alcohol habit", False),
        ("other_notes", "TEXT", "otherNotes", False),
    ]
    + audit,
)
T(
    "prescription_medical_history_allergies",
    "prescription_medical_history_allergies",
    "CHILD 1:N. medicalHistory allergies / drugAllergies lines.",
    1150,
    3400,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("allergen_text", "VARCHAR(256)", "allergen / drugName", True),
        ("reaction_text", "VARCHAR(256)", "reaction", False),
        ("severity", "VARCHAR(32)", "severity", False),
        ("notes", "TEXT", "notes", False),
    ]
    + audit,
)
T(
    "prescription_medical_history_chronic_illnesses",
    "prescription_medical_history_chronic_illnesses",
    "CHILD 1:N. medicalHistory chronicIllnesses[].",
    1900,
    3400,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("illness_text", "VARCHAR(256)", "illness name", True),
        ("since_text", "VARCHAR(64)", "duration / since", False),
        ("notes", "TEXT", "notes", False),
    ]
    + audit,
)
# --- medicines[], orders ---
T(
    "prescription_medicines",
    "prescription_medicines",
    "CHILD 1:N. medicines[] — denormalized snapshot at prescribe time.",
    400,
    1300,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("medicine_id", "UUID", "master_data.medicines", False),
        ("name", "VARCHAR(512)", "Snapshot name", True),
        ("medicine_type", "VARCHAR(64)", "type", False),
        ("strength", "VARCHAR(128)", "strength", False),
        ("sos", "VARCHAR(64)", "SOS", False),
        ("dosage", "VARCHAR(256)", "dosage", False),
        ("duration", "VARCHAR(128)", "duration", False),
        ("frequency", "VARCHAR(128)", "frequency", False),
        ("quantity", "NUMERIC(10,2)", "quantity", False),
        ("route", "VARCHAR(64)", "route", False),
        ("method", "VARCHAR(128)", "method (free-text)", False),
        ("status", "VARCHAR(32)", "line status", False),
    ]
    + audit,
)
T(
    "prescription_medicine_substitutions",
    "prescription_medicine_substitutions",
    "CHILD 1:0..1. substitutionInfo per medicine line.",
    1150,
    1300,
    [
        ("prescription_medicine_id", "UUID", "FK prescription_medicines; PK", True, True),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions (denormalized)", True),
        ("issued_medicine_id", "UUID", "master_data.medicines", False),
        ("issued_name", "VARCHAR(512)", "issued drug name", True),
        ("item_code", "VARCHAR(64)", "pharmacy item code", False),
        ("quantity", "NUMERIC(10,2)", "quantity dispensed", False),
        ("form", "VARCHAR(128)", "form", False),
        ("volume", "VARCHAR(64)", "volume", False),
        ("category", "VARCHAR(128)", "category", False),
        ("reason", "TEXT", "substitution reason", False),
    ]
    + audit,
)
T(
    "prescription_ordered_tests",
    "prescription_ordered_tests",
    "CHILD 1:N. testsRequired[] — lab orders (id is string UUID in Mongo).",
    1900,
    1300,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("test_id", "UUID", "master_data.tests", False),
        ("external_id", "VARCHAR(64)", "Mongo testsRequired.id (UUID string)", False),
        ("name", "VARCHAR(512)", "name snapshot", True),
        ("due_by", "TIMESTAMPTZ", "byWhen", False),
        ("instructions", "TEXT", "instructions", False),
        ("status", "order_item_status", "order status", True, False, "pending"),
    ]
    + audit,
)
T(
    "prescription_ordered_imaging",
    "prescription_ordered_imaging",
    "CHILD 1:N. imagingRequired[].",
    2650,
    1300,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("external_id", "VARCHAR(64)", "Mongo imagingRequired.id", False),
        ("name", "VARCHAR(512)", "study name", True),
        ("due_by", "TIMESTAMPTZ", "byWhen", False),
        ("instructions", "TEXT", "instructions", False),
        ("status", "order_item_status", "order status", True, False, "pending"),
    ]
    + audit,
)
T(
    "prescription_vaccines_required",
    "prescription_vaccines_required",
    "CHILD 1:N. vaccinesRequired[] — advised vaccines (order line), NOT administration history.",
    3400,
    1300,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("vaccine_id", "UUID", "Optional FK vaccines master (no Mongo ref today)", False),
        ("vaccine_code", "VARCHAR(64)", "Optional catalog code for future link", False),
        ("name", "VARCHAR(512)", "vaccine name snapshot", True),
        ("due_by", "TIMESTAMPTZ", "byWhen", False),
        ("instructions", "TEXT", "instructions", False),
        ("status", "order_item_status", "order status", True, False, "pending"),
    ]
    + audit,
)

# --- procedures, lifestyle, womens health, care plan ---
T(
    "prescription_advised_procedures",
    "prescription_advised_procedures",
    "CHILD 1:N. medicalProcedure[].",
    400,
    4200,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("procedure_id", "UUID", "master_data.procedures", False),
        ("procedure_name", "VARCHAR(512)", "name snapshot", True),
        ("advised_date", "DATE", "advisedDate", False),
    ]
    + audit,
)
T(
    "prescription_physical_activity",
    "prescription_physical_activity",
    "CHILD 1:N. physicalActivity[] ({ _id: false } in Mongo).",
    1400,
    4200,
    [
        pk_id(),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("line_no", "SMALLINT", "Display order", True),
        ("steps_count", "INTEGER", "steps", False),
        ("sleep_duration_min", "INTEGER", "sleep", False),
        ("calories_burned", "INTEGER", "calories", False),
    ]
    + audit,
)
T(
    "prescription_physical_activity_exercise_types",
    "prescription_physical_activity_exercise_types",
    "JUNCTION. exerciseType[] per physical_activity row.",
    2150,
    4200,
    [
        ("physical_activity_id", "UUID", "FK prescription_physical_activity; PK part", True, True),
        tenant_col(),
        ("prescription_id", "UUID", "FK prescriptions", True),
        ("exercise_type", "VARCHAR(128)", "PK part", True, True),
    ],
)
T(
    "prescription_care_plans",
    "prescription_care_plans",
    "CHILD 1:0..1. carePlan embed.",
    3650,
    4200,
    [
        ("prescription_id", "UUID", "FK prescriptions; PK", True, True),
        tenant_col(),
        ("advice", "TEXT", "advice", False),
        ("next_visit_value", "INTEGER", "nextVisit", False),
        ("next_visit_unit", "VARCHAR(16)", "nextVisitUnit", False),
        ("refer_to", "VARCHAR(512)", "referTo", False),
    ]
    + audit,
)

RELS: list[tuple] = [
    ("st_rx", "prescription_status_history", "prescription_id", "prescriptions", "id", {}),
    ("lv_rx", "prescription_legacy_vitals", "prescription_id", "prescriptions", "id", {}),
    ("vit_obs_rx", "prescription_vital_observations", "prescription_id", "prescriptions", "id", {}),
    ("cc_rx", "prescription_chief_complaints", "prescription_id", "prescriptions", "id", {}),
    ("dx_rx", "prescription_diagnoses", "prescription_id", "prescriptions", "id", {}),
    ("sym_rx", "prescription_symptoms", "prescription_id", "prescriptions", "id", {}),
    ("mh_rx", "prescription_medical_histories", "prescription_id", "prescriptions", "id", {}),
    ("mha_rx", "prescription_medical_history_allergies", "prescription_id", "prescriptions", "id", {}),
    ("mhci_rx", "prescription_medical_history_chronic_illnesses", "prescription_id", "prescriptions", "id", {}),
    ("med_rx", "prescription_medicines", "prescription_id", "prescriptions", "id", {}),
    ("subst_med", "prescription_medicine_substitutions", "prescription_medicine_id", "prescription_medicines", "id", {}),
    ("subst_rx", "prescription_medicine_substitutions", "prescription_id", "prescriptions", "id", {}),
    ("test_rx", "prescription_ordered_tests", "prescription_id", "prescriptions", "id", {}),
    ("img_rx", "prescription_ordered_imaging", "prescription_id", "prescriptions", "id", {}),
    ("vac_rx", "prescription_vaccines_required", "prescription_id", "prescriptions", "id", {}),
    ("vac_cat", "prescription_vaccines_required", "vaccine_id", "vaccines", "id", {}),
    ("proc_rx", "prescription_advised_procedures", "prescription_id", "prescriptions", "id", {}),
    ("pa_rx", "prescription_physical_activity", "prescription_id", "prescriptions", "id", {}),
    ("pa_et", "prescription_physical_activity_exercise_types", "physical_activity_id", "prescription_physical_activity", "id", {}),
    ("cp_rx", "prescription_care_plans", "prescription_id", "prescriptions", "id", {}),
]

MEMO = """=== OPD Prescription (MongoDB → PostgreSQL) ===
Schema: opd | 19 transactional tables (+ 1 master stub in diagram)

VISIT: owned by registration module (modules/registration/src/schema/tables.ts).
  prescriptions.visit_id = registration.registration.visit_id (logical ref, no cross-schema FK).
  UNIQUE 1:1 visit ↔ prescription.

IMMUNISATION: vaccinesRequired → prescription_vaccines_required ONLY.

TRANSACTIONAL: prescriptions + child tables (surgeries/family/current_meds/womens_health deferred)
CHILD 1:0..1: legacy_vitals, medical_histories, care_plans
AUDIT: prescription_status_history

Cross-schema UUID refs (no FK): patient_id, doctor_id, visit_id, catalog IDs."""


def main() -> None:
    build_erd(
        out_path=OUT,
        database_name="opd",
        tables=TABLES,
        rels=RELS,
        memo_text=MEMO,
        canvas_width=9000,
        canvas_height=5200,
    )


if __name__ == "__main__":
    main()
