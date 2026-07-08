"""Squash the OPD Alembic chain into a single baseline.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-07-08

Reproduces the EXACT final state of the former chain (previous head
``0007_opd_distribute_citus``), which was two clashing numbering schemes merged
into one line:

    0001_opd_visits_prescriptions      (visits + phase-0 JSONB prescriptions)
      -> 001_prescription_schema       (normalized prescription aggregate)
           -> 002_health_documents            \\  (branch)
           -> 0002_rx_doctor_vitals -> 0003    /  merge at 003
      -> 003_merge_opd_prescription_heads
      -> 0004_opd_iq_tenant_id         (tenant_id -> iq_tenant_id, D4)
      -> 0005_rx_when_diet             (+imaging.when_text, +med_hist.diet_type)
      -> 0006_drop_rx_form_data        (drop phase-0 JSONB blob)
      -> 0007_opd_distribute_citus     (Citus hash-distribute all 21 by iq_tenant_id)

The end-state, verified by an empty ``pg_dump --schema-only -n opd`` diff:

* the ``opd`` schema with 2 enum types (``order_item_status``,
  ``prescription_status``) and 21 tables with the exact server defaults and
  physical column order the chain produced (``visits`` leads its PK/columns with
  ``id`` then ``iq_tenant_id`` because 0001 created it ``tenant_id``-second and
  0004 renamed in place; every other table leads with ``iq_tenant_id``);
* all primary keys, unique constraints, partial-unique / plain indexes, the
  composite ``(iq_tenant_id, ...)`` ON DELETE CASCADE foreign keys, and the
  ``prescriptions.visit_id`` column comment;
* Citus hash-distribution of all 21 tables on ``iq_tenant_id`` (guarded so plain
  PostgreSQL / SQLite test DBs skip it). OPD owns no catalog/control-plane tables,
  so there are no Citus reference tables — every table is a tenant-scoped fact.

OPD migrations never seeded data (schema-only chain), so the baseline is
schema-only. FKs are created while all tables are still local, then the tables
are distributed parent-before-child — the exact sequence the former 0007 proved,
which keeps the co-located distributed->distributed FK graph valid on Citus.
"""

from __future__ import annotations

import json
from collections.abc import Sequence

from alembic import op

revision: str = "0001_baseline"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "opd"

# Parents strictly before children (Citus co-location: a distributed->distributed FK
# is only valid once the referenced table is itself distributed). ``prescriptions`` is
# the FK root (``visit_id`` is a *logical* ref to registration.visit — no DB-level FK);
# the last two entries are grandchildren of medicines / physical_activity.
_DISTRIBUTE_ORDER: tuple[str, ...] = (
    "visits",
    "health_documents",
    "prescriptions",
    "prescription_status_history",
    "prescription_legacy_vitals",
    "prescription_vital_observations",
    "prescription_chief_complaints",
    "prescription_diagnoses",
    "prescription_symptoms",
    "prescription_medical_histories",
    "prescription_medical_history_allergies",
    "prescription_medical_history_chronic_illnesses",
    "prescription_medicines",
    "prescription_ordered_tests",
    "prescription_ordered_imaging",
    "prescription_vaccines_required",
    "prescription_advised_procedures",
    "prescription_physical_activity",
    "prescription_care_plans",
    "prescription_medicine_substitutions",
    "prescription_physical_activity_exercise_types",
)

# --- Schema DDL captured from the former chain's final state (faithful) --------
# Buckets applied in order: enum TYPEs -> CREATE TABLE -> primary keys/unique
# constraints -> indexes -> foreign keys -> column comment -> (Citus distribution).
_DDL = json.loads(
    r"""{
"types": [
"CREATE TYPE opd.order_item_status AS ENUM ('pending', 'completed', 'cancelled');",
"CREATE TYPE opd.prescription_status AS ENUM ('draft', 'final', 'cancelled');"
],
"tables": [
"CREATE TABLE opd.health_documents (\n    iq_tenant_id uuid NOT NULL,\n    id uuid NOT NULL,\n    patient_id uuid NOT NULL,\n    visit_id uuid,\n    hi_type text NOT NULL,\n    document_title text NOT NULL,\n    original_file_name text NOT NULL,\n    storage_key text NOT NULL,\n    blob_url text NOT NULL,\n    mime_type text NOT NULL,\n    file_size_bytes bigint,\n    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,\n    status text DEFAULT 'active'::text NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid,\n    CONSTRAINT health_documents_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'deleted'::text])))\n);",
"CREATE TABLE opd.prescription_advised_procedures (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    procedure_id uuid,\n    procedure_name character varying(512) NOT NULL,\n    advised_date date,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_care_plans (\n    iq_tenant_id uuid NOT NULL,\n    prescription_id uuid NOT NULL,\n    advice text,\n    next_visit_value integer,\n    next_visit_unit character varying(16),\n    refer_to character varying(512),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_chief_complaints (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    complaint_text text NOT NULL,\n    duration_value character varying(32),\n    duration_unit character varying(16),\n    severity character varying(32),\n    notes text,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_diagnoses (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    notes text,\n    certainty character varying(32),\n    diagnosis_id uuid,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_legacy_vitals (\n    iq_tenant_id uuid NOT NULL,\n    prescription_id uuid NOT NULL,\n    height_cm numeric(6,2),\n    weight_kg numeric(6,2),\n    bmi numeric(5,2),\n    temperature_c numeric(4,1),\n    pulse_bpm smallint,\n    bp_systolic smallint,\n    bp_diastolic smallint,\n    respiratory_rate smallint,\n    spo2_percent smallint,\n    blood_sugar_mg_dl numeric(6,1),\n    notes text,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_medical_histories (\n    iq_tenant_id uuid NOT NULL,\n    prescription_id uuid NOT NULL,\n    smoking_status character varying(64),\n    alcohol_status character varying(64),\n    other_notes text,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    diet_type character varying(64)\n);",
"CREATE TABLE opd.prescription_medical_history_allergies (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    allergen_text character varying(256) NOT NULL,\n    reaction_text character varying(256),\n    severity character varying(32),\n    notes text,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_medical_history_chronic_illnesses (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    illness_text character varying(256) NOT NULL,\n    since_text character varying(64),\n    notes text,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_medicine_substitutions (\n    iq_tenant_id uuid NOT NULL,\n    prescription_medicine_id uuid NOT NULL,\n    prescription_id uuid NOT NULL,\n    issued_medicine_id uuid,\n    issued_name character varying(512) NOT NULL,\n    item_code character varying(64),\n    quantity numeric(10,2),\n    form character varying(128),\n    volume character varying(64),\n    category character varying(128),\n    reason text,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_medicines (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    medicine_id uuid,\n    name character varying(512) NOT NULL,\n    medicine_type character varying(64),\n    strength character varying(128),\n    sos character varying(64),\n    dosage character varying(256),\n    duration character varying(128),\n    frequency character varying(128),\n    quantity numeric(10,2),\n    route character varying(64),\n    method character varying(128),\n    status character varying(32),\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_ordered_imaging (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    external_id character varying(64),\n    name character varying(512) NOT NULL,\n    due_by timestamp with time zone,\n    instructions text,\n    status opd.order_item_status DEFAULT 'pending'::opd.order_item_status NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    when_text character varying(256)\n);",
"CREATE TABLE opd.prescription_ordered_tests (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    test_id uuid,\n    external_id character varying(64),\n    name character varying(512) NOT NULL,\n    due_by timestamp with time zone,\n    instructions text,\n    status opd.order_item_status DEFAULT 'pending'::opd.order_item_status NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_physical_activity (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    steps_count integer,\n    sleep_duration_min integer,\n    calories_burned integer,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_physical_activity_exercise_types (\n    iq_tenant_id uuid NOT NULL,\n    physical_activity_id uuid NOT NULL,\n    prescription_id uuid NOT NULL,\n    exercise_type character varying(128) NOT NULL\n);",
"CREATE TABLE opd.prescription_status_history (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    from_status opd.prescription_status,\n    to_status opd.prescription_status NOT NULL,\n    changed_at timestamp with time zone DEFAULT now() NOT NULL,\n    changed_by uuid,\n    reason text\n);",
"CREATE TABLE opd.prescription_symptoms (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    symptom_text character varying(256) NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_vaccines_required (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    vaccine_id uuid,\n    vaccine_code character varying(64),\n    name character varying(512) NOT NULL,\n    due_by timestamp with time zone,\n    instructions text,\n    status opd.order_item_status DEFAULT 'pending'::opd.order_item_status NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescription_vital_observations (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    prescription_id uuid NOT NULL,\n    line_no smallint NOT NULL,\n    vital_code character varying(64) NOT NULL,\n    vital_global_id uuid,\n    value_text character varying(512) NOT NULL,\n    unit_code character varying(64),\n    recorded_at timestamp with time zone NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);",
"CREATE TABLE opd.prescriptions (\n    iq_tenant_id uuid NOT NULL,\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    visit_id uuid NOT NULL,\n    patient_id uuid NOT NULL,\n    doctor_id uuid NOT NULL,\n    vitals_schema_version smallint DEFAULT '1'::smallint NOT NULL,\n    status opd.prescription_status DEFAULT 'draft'::opd.prescription_status NOT NULL,\n    finalized_at timestamp with time zone,\n    cancelled_at timestamp with time zone,\n    deleted_at timestamp with time zone,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL,\n    created_by uuid,\n    updated_by uuid\n);",
"CREATE TABLE opd.visits (\n    id uuid DEFAULT gen_random_uuid() NOT NULL,\n    iq_tenant_id uuid NOT NULL,\n    patient_id uuid NOT NULL,\n    status text DEFAULT 'in_progress'::text NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone DEFAULT now() NOT NULL\n);"
],
"pk_uc": [
"ALTER TABLE ONLY opd.health_documents\n    ADD CONSTRAINT health_documents_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_advised_procedures\n    ADD CONSTRAINT prescription_advised_procedures_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_advised_procedures\n    ADD CONSTRAINT prescription_advised_procedures_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_care_plans\n    ADD CONSTRAINT prescription_care_plans_pkey PRIMARY KEY (iq_tenant_id, prescription_id);",
"ALTER TABLE ONLY opd.prescription_chief_complaints\n    ADD CONSTRAINT prescription_cc_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_chief_complaints\n    ADD CONSTRAINT prescription_chief_complaints_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_diagnoses\n    ADD CONSTRAINT prescription_diagnoses_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_diagnoses\n    ADD CONSTRAINT prescription_dx_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_legacy_vitals\n    ADD CONSTRAINT prescription_legacy_vitals_pkey PRIMARY KEY (iq_tenant_id, prescription_id);",
"ALTER TABLE ONLY opd.prescription_medical_histories\n    ADD CONSTRAINT prescription_medical_histories_pkey PRIMARY KEY (iq_tenant_id, prescription_id);",
"ALTER TABLE ONLY opd.prescription_medical_history_allergies\n    ADD CONSTRAINT prescription_medical_history_allergies_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_medical_history_chronic_illnesses\n    ADD CONSTRAINT prescription_medical_history_chronic_illnesses_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_medicine_substitutions\n    ADD CONSTRAINT prescription_medicine_substitutions_pkey PRIMARY KEY (iq_tenant_id, prescription_medicine_id);",
"ALTER TABLE ONLY opd.prescription_medicines\n    ADD CONSTRAINT prescription_medicines_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_medicines\n    ADD CONSTRAINT prescription_medicines_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_medical_history_allergies\n    ADD CONSTRAINT prescription_mh_allergy_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_medical_history_chronic_illnesses\n    ADD CONSTRAINT prescription_mh_chronic_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_ordered_imaging\n    ADD CONSTRAINT prescription_ordered_imaging_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_ordered_imaging\n    ADD CONSTRAINT prescription_ordered_imaging_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_ordered_tests\n    ADD CONSTRAINT prescription_ordered_tests_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_ordered_tests\n    ADD CONSTRAINT prescription_ordered_tests_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_physical_activity_exercise_types\n    ADD CONSTRAINT prescription_physical_activity_exercise_types_pkey PRIMARY KEY (iq_tenant_id, physical_activity_id, exercise_type);",
"ALTER TABLE ONLY opd.prescription_physical_activity\n    ADD CONSTRAINT prescription_physical_activity_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_physical_activity\n    ADD CONSTRAINT prescription_physical_activity_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_status_history\n    ADD CONSTRAINT prescription_status_history_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_symptoms\n    ADD CONSTRAINT prescription_symptoms_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_symptoms\n    ADD CONSTRAINT prescription_symptoms_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_vaccines_required\n    ADD CONSTRAINT prescription_vaccines_required_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_vaccines_required\n    ADD CONSTRAINT prescription_vaccines_required_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescription_vital_observations\n    ADD CONSTRAINT prescription_vital_obs_line_key UNIQUE (iq_tenant_id, prescription_id, line_no);",
"ALTER TABLE ONLY opd.prescription_vital_observations\n    ADD CONSTRAINT prescription_vital_observations_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.prescriptions\n    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (iq_tenant_id, id);",
"ALTER TABLE ONLY opd.visits\n    ADD CONSTRAINT visits_pkey PRIMARY KEY (iq_tenant_id, id);"
],
"idx": [
"CREATE INDEX health_documents_tenant_patient_idx ON opd.health_documents USING btree (iq_tenant_id, patient_id);",
"CREATE INDEX health_documents_tenant_visit_idx ON opd.health_documents USING btree (iq_tenant_id, visit_id);",
"CREATE INDEX ix_opd_visits_tenant_patient_updated ON opd.visits USING btree (iq_tenant_id, patient_id, updated_at);",
"CREATE INDEX prescription_status_history_rx_idx ON opd.prescription_status_history USING btree (prescription_id);",
"CREATE INDEX prescriptions_tenant_active_idx ON opd.prescriptions USING btree (iq_tenant_id) WHERE (deleted_at IS NULL);",
"CREATE INDEX prescriptions_tenant_patient_idx ON opd.prescriptions USING btree (iq_tenant_id, patient_id);",
"CREATE UNIQUE INDEX prescriptions_tenant_visit_active_uq ON opd.prescriptions USING btree (iq_tenant_id, visit_id) WHERE (deleted_at IS NULL);"
],
"fk": [
"ALTER TABLE ONLY opd.prescription_advised_procedures\n    ADD CONSTRAINT prescription_advised_procedures_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_care_plans\n    ADD CONSTRAINT prescription_care_plans_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_chief_complaints\n    ADD CONSTRAINT prescription_chief_complaints_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_diagnoses\n    ADD CONSTRAINT prescription_diagnoses_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_legacy_vitals\n    ADD CONSTRAINT prescription_legacy_vitals_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_medical_histories\n    ADD CONSTRAINT prescription_medical_histories_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_medical_history_allergies\n    ADD CONSTRAINT prescription_medical_history_all_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_medical_history_chronic_illnesses\n    ADD CONSTRAINT prescription_medical_history_chr_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_medicine_substitutions\n    ADD CONSTRAINT prescription_medicine_substit_tenant_id_prescription_medic_fkey FOREIGN KEY (iq_tenant_id, prescription_medicine_id) REFERENCES opd.prescription_medicines(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_medicine_substitutions\n    ADD CONSTRAINT prescription_medicine_substituti_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_medicines\n    ADD CONSTRAINT prescription_medicines_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_ordered_imaging\n    ADD CONSTRAINT prescription_ordered_imaging_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_ordered_tests\n    ADD CONSTRAINT prescription_ordered_tests_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_physical_activity_exercise_types\n    ADD CONSTRAINT prescription_physical_activit_tenant_id_physical_activity__fkey FOREIGN KEY (iq_tenant_id, physical_activity_id) REFERENCES opd.prescription_physical_activity(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_physical_activity_exercise_types\n    ADD CONSTRAINT prescription_physical_activity_e_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_physical_activity\n    ADD CONSTRAINT prescription_physical_activity_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_status_history\n    ADD CONSTRAINT prescription_status_history_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_symptoms\n    ADD CONSTRAINT prescription_symptoms_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_vaccines_required\n    ADD CONSTRAINT prescription_vaccines_required_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;",
"ALTER TABLE ONLY opd.prescription_vital_observations\n    ADD CONSTRAINT prescription_vital_observations_tenant_id_prescription_id_fkey FOREIGN KEY (iq_tenant_id, prescription_id) REFERENCES opd.prescriptions(iq_tenant_id, id) ON DELETE CASCADE;"
],
"comments": [
"COMMENT ON COLUMN opd.prescriptions.visit_id IS 'Logical ref registration.registration.visit_id; UNIQUE 1:1; no cross-schema FK';"
]
}"""
)


def _distribute(table: str) -> None:
    """Hash-distribute ``opd.<table>`` by ``iq_tenant_id``; no-op off Citus / if already done."""
    op.get_bind().exec_driver_sql(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_distributed_table') THEN "
        "  IF NOT EXISTS ("
        f"    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'opd.{table}'::regclass"
        "  ) THEN "
        f"    PERFORM create_distributed_table('opd.{table}', 'iq_tenant_id'); "
        "  END IF; "
        "END IF; END $$;"
    )


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")

    for stmt in _DDL["types"]:
        op.execute(stmt)
    for stmt in _DDL["tables"]:
        op.execute(stmt)
    for stmt in _DDL["pk_uc"]:
        op.execute(stmt)
    for stmt in _DDL["idx"]:
        op.execute(stmt)
    # FKs are created while all tables are still local (empty DB — validation is trivial),
    # then the tables are distributed parent-before-child so Citus co-locates the
    # distributed->distributed FK graph. This mirrors the former chain's proven sequence.
    for stmt in _DDL["fk"]:
        op.execute(stmt)
    for stmt in _DDL["comments"]:
        op.execute(stmt)

    # Citus hash-distribution (guarded: skipped on plain PostgreSQL / SQLite test DBs).
    if op.get_bind().dialect.name == "postgresql":
        for table in _DISTRIBUTE_ORDER:
            _distribute(table)


def downgrade() -> None:
    op.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
