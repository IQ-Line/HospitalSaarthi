"""Prescription aggregate tables in the ``opd`` schema.

Revision ID: 001_prescription_schema
Revises: 0001_opd_visits_prescriptions
"""

import sys
from collections.abc import Sequence
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from schema_names import SCHEMA

revision: str = "001_prescription_schema"
down_revision: str | Sequence[str] | None = "0001_opd_visits_prescriptions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PRESCRIPTION_STATUS = postgresql.ENUM(
    "draft",
    "final",
    "cancelled",
    name="prescription_status",
    schema=SCHEMA,
    create_type=False,
)
_ORDER_ITEM_STATUS = postgresql.ENUM(
    "pending",
    "completed",
    "cancelled",
    name="order_item_status",
    schema=SCHEMA,
    create_type=False,
)


def _audit_columns() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    ]


def _tenant_column() -> sa.Column:
    return sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False)


def _prescription_fk() -> sa.ForeignKeyConstraint:
    return sa.ForeignKeyConstraint(
        ["tenant_id", "prescription_id"],
        [f"{SCHEMA}.prescriptions.tenant_id", f"{SCHEMA}.prescriptions.id"],
        ondelete="CASCADE",
    )


def upgrade() -> None:
    _PRESCRIPTION_STATUS.create(op.get_bind(), checkfirst=True)
    _ORDER_ITEM_STATUS.create(op.get_bind(), checkfirst=True)

    # Phase-0 ``prescriptions`` (revision 0001) uses a different shape; replace it.
    op.drop_table("prescriptions", schema=SCHEMA)

    op.create_table(
        "prescriptions",
        _tenant_column(),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "visit_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            comment="Logical ref registration.registration.visit_id; UNIQUE 1:1; no cross-schema FK",
        ),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vitals_schema_version", sa.SmallInteger(), nullable=False, server_default="1"),
        sa.Column(
            "status",
            _PRESCRIPTION_STATUS,
            nullable=False,
            server_default="draft",
        ),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *_audit_columns(),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("tenant_id", "id"),
        schema=SCHEMA,
    )
    op.create_index(
        "prescriptions_tenant_visit_active_uq",
        "prescriptions",
        ["tenant_id", "visit_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
        schema=SCHEMA,
    )
    op.create_index(
        "prescriptions_tenant_patient_idx",
        "prescriptions",
        ["tenant_id", "patient_id"],
        schema=SCHEMA,
    )
    op.create_index(
        "prescriptions_tenant_active_idx",
        "prescriptions",
        ["tenant_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
        schema=SCHEMA,
    )

    op.create_table(
        "prescription_status_history",
        _tenant_column(),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_status", _PRESCRIPTION_STATUS, nullable=True),
        sa.Column("to_status", _PRESCRIPTION_STATUS, nullable=False),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("tenant_id", "id"),
        _prescription_fk(),
        schema=SCHEMA,
    )
    op.create_index(
        "prescription_status_history_rx_idx",
        "prescription_status_history",
        ["prescription_id"],
        schema=SCHEMA,
    )

    op.create_table(
        "prescription_legacy_vitals",
        _tenant_column(),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("height_cm", sa.Numeric(6, 2), nullable=True),
        sa.Column("weight_kg", sa.Numeric(6, 2), nullable=True),
        sa.Column("bmi", sa.Numeric(5, 2), nullable=True),
        sa.Column("temperature_c", sa.Numeric(4, 1), nullable=True),
        sa.Column("pulse_bpm", sa.SmallInteger(), nullable=True),
        sa.Column("bp_systolic", sa.SmallInteger(), nullable=True),
        sa.Column("bp_diastolic", sa.SmallInteger(), nullable=True),
        sa.Column("respiratory_rate", sa.SmallInteger(), nullable=True),
        sa.Column("spo2_percent", sa.SmallInteger(), nullable=True),
        sa.Column("blood_sugar_mg_dl", sa.Numeric(6, 1), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *_audit_columns(),
        sa.PrimaryKeyConstraint("tenant_id", "prescription_id"),
        _prescription_fk(),
        schema=SCHEMA,
    )

    _line_child(
        "prescription_vital_observations",
        "prescription_vital_obs_line_key",
        [
            sa.Column("vital_code", sa.String(64), nullable=False),
            sa.Column("vital_global_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("value_text", sa.String(512), nullable=False),
            sa.Column("unit_code", sa.String(64), nullable=True),
            sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        ],
    )
    _line_child(
        "prescription_chief_complaints",
        "prescription_cc_line_key",
        [
            sa.Column("complaint_text", sa.Text(), nullable=False),
            sa.Column("duration_value", sa.String(32), nullable=True),
            sa.Column("duration_unit", sa.String(16), nullable=True),
            sa.Column("severity", sa.String(32), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _line_child(
        "prescription_diagnoses",
        "prescription_dx_line_key",
        [
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("certainty", sa.String(32), nullable=True),
            sa.Column("diagnosis_id", postgresql.UUID(as_uuid=True), nullable=True),
        ],
    )
    _line_child(
        "prescription_symptoms",
        "prescription_symptoms_line_key",
        [
            sa.Column("symptom_text", sa.String(256), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
        ],
        with_audit=False,
    )
    _embed_child(
        "prescription_medical_histories",
        [
            sa.Column("smoking_status", sa.String(64), nullable=True),
            sa.Column("alcohol_status", sa.String(64), nullable=True),
            sa.Column("other_notes", sa.Text(), nullable=True),
        ],
    )
    _line_child(
        "prescription_medical_history_allergies",
        "prescription_mh_allergy_line_key",
        [
            sa.Column("allergen_text", sa.String(256), nullable=False),
            sa.Column("reaction_text", sa.String(256), nullable=True),
            sa.Column("severity", sa.String(32), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _line_child(
        "prescription_medical_history_chronic_illnesses",
        "prescription_mh_chronic_line_key",
        [
            sa.Column("illness_text", sa.String(256), nullable=False),
            sa.Column("since_text", sa.String(64), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _line_child(
        "prescription_medicines",
        "prescription_medicines_line_key",
        [
            sa.Column("medicine_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("name", sa.String(512), nullable=False),
            sa.Column("medicine_type", sa.String(64), nullable=True),
            sa.Column("strength", sa.String(128), nullable=True),
            sa.Column("sos", sa.String(64), nullable=True),
            sa.Column("dosage", sa.String(256), nullable=True),
            sa.Column("duration", sa.String(128), nullable=True),
            sa.Column("frequency", sa.String(128), nullable=True),
            sa.Column("quantity", sa.Numeric(10, 2), nullable=True),
            sa.Column("route", sa.String(64), nullable=True),
            sa.Column("method", sa.String(128), nullable=True),
            sa.Column("status", sa.String(32), nullable=True),
        ],
    )
    op.create_table(
        "prescription_medicine_substitutions",
        _tenant_column(),
        sa.Column("prescription_medicine_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("issued_medicine_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("issued_name", sa.String(512), nullable=False),
        sa.Column("item_code", sa.String(64), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=True),
        sa.Column("form", sa.String(128), nullable=True),
        sa.Column("volume", sa.String(64), nullable=True),
        sa.Column("category", sa.String(128), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        *_audit_columns(),
        sa.PrimaryKeyConstraint("tenant_id", "prescription_medicine_id"),
        sa.ForeignKeyConstraint(
            ["tenant_id", "prescription_medicine_id"],
            [f"{SCHEMA}.prescription_medicines.tenant_id", f"{SCHEMA}.prescription_medicines.id"],
            ondelete="CASCADE",
        ),
        _prescription_fk(),
        schema=SCHEMA,
    )
    _line_child(
        "prescription_ordered_tests",
        "prescription_ordered_tests_line_key",
        [
            sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("external_id", sa.String(64), nullable=True),
            sa.Column("name", sa.String(512), nullable=False),
            sa.Column("due_by", sa.DateTime(timezone=True), nullable=True),
            sa.Column("instructions", sa.Text(), nullable=True),
            sa.Column(
                "status",
                _ORDER_ITEM_STATUS,
                nullable=False,
                server_default="pending",
            ),
        ],
    )
    _line_child(
        "prescription_ordered_imaging",
        "prescription_ordered_imaging_line_key",
        [
            sa.Column("external_id", sa.String(64), nullable=True),
            sa.Column("name", sa.String(512), nullable=False),
            sa.Column("due_by", sa.DateTime(timezone=True), nullable=True),
            sa.Column("instructions", sa.Text(), nullable=True),
            sa.Column(
                "status",
                _ORDER_ITEM_STATUS,
                nullable=False,
                server_default="pending",
            ),
        ],
    )
    _line_child(
        "prescription_vaccines_required",
        "prescription_vaccines_required_line_key",
        [
            sa.Column("vaccine_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("vaccine_code", sa.String(64), nullable=True),
            sa.Column("name", sa.String(512), nullable=False),
            sa.Column("due_by", sa.DateTime(timezone=True), nullable=True),
            sa.Column("instructions", sa.Text(), nullable=True),
            sa.Column(
                "status",
                _ORDER_ITEM_STATUS,
                nullable=False,
                server_default="pending",
            ),
        ],
    )
    _line_child(
        "prescription_advised_procedures",
        "prescription_advised_procedures_line_key",
        [
            sa.Column("procedure_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("procedure_name", sa.String(512), nullable=False),
            sa.Column("advised_date", sa.Date(), nullable=True),
        ],
    )
    _line_child(
        "prescription_physical_activity",
        "prescription_physical_activity_line_key",
        [
            sa.Column("steps_count", sa.Integer(), nullable=True),
            sa.Column("sleep_duration_min", sa.Integer(), nullable=True),
            sa.Column("calories_burned", sa.Integer(), nullable=True),
        ],
    )
    op.create_table(
        "prescription_physical_activity_exercise_types",
        _tenant_column(),
        sa.Column("physical_activity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("exercise_type", sa.String(128), nullable=False),
        sa.PrimaryKeyConstraint("tenant_id", "physical_activity_id", "exercise_type"),
        sa.ForeignKeyConstraint(
            ["tenant_id", "physical_activity_id"],
            [
                f"{SCHEMA}.prescription_physical_activity.tenant_id",
                f"{SCHEMA}.prescription_physical_activity.id",
            ],
            ondelete="CASCADE",
        ),
        _prescription_fk(),
        schema=SCHEMA,
    )
    _embed_child(
        "prescription_care_plans",
        [
            sa.Column("advice", sa.Text(), nullable=True),
            sa.Column("next_visit_value", sa.Integer(), nullable=True),
            sa.Column("next_visit_unit", sa.String(16), nullable=True),
            sa.Column("refer_to", sa.String(512), nullable=True),
        ],
    )


def _line_child(
    name: str,
    unique_name: str,
    extra_columns: list[sa.Column],
    *,
    with_audit: bool = True,
) -> None:
    cols = [
        _tenant_column(),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("line_no", sa.SmallInteger(), nullable=False),
        *extra_columns,
    ]
    if with_audit:
        cols.extend(_audit_columns())
    op.create_table(
        name,
        *cols,
        sa.PrimaryKeyConstraint("tenant_id", "id"),
        _prescription_fk(),
        sa.UniqueConstraint("tenant_id", "prescription_id", "line_no", name=unique_name),
        schema=SCHEMA,
    )


def _embed_child(name: str, extra_columns: list[sa.Column]) -> None:
    op.create_table(
        name,
        _tenant_column(),
        sa.Column("prescription_id", postgresql.UUID(as_uuid=True), nullable=False),
        *extra_columns,
        *_audit_columns(),
        sa.PrimaryKeyConstraint("tenant_id", "prescription_id"),
        _prescription_fk(),
        schema=SCHEMA,
    )


def downgrade() -> None:
    tables = [
        "prescription_care_plans",
        "prescription_physical_activity_exercise_types",
        "prescription_physical_activity",
        "prescription_advised_procedures",
        "prescription_vaccines_required",
        "prescription_ordered_imaging",
        "prescription_ordered_tests",
        "prescription_medicine_substitutions",
        "prescription_medicines",
        "prescription_medical_history_chronic_illnesses",
        "prescription_medical_history_allergies",
        "prescription_medical_histories",
        "prescription_symptoms",
        "prescription_diagnoses",
        "prescription_chief_complaints",
        "prescription_vital_observations",
        "prescription_legacy_vitals",
        "prescription_status_history",
        "prescriptions",
    ]
    for table in tables:
        op.drop_table(table, schema=SCHEMA)
    _ORDER_ITEM_STATUS.drop(op.get_bind(), checkfirst=True)
    _PRESCRIPTION_STATUS.drop(op.get_bind(), checkfirst=True)
