"""Distribute the OPD tenant tables on Citus by ``iq_tenant_id``.

Revision ID: 0007_opd_distribute_citus
Revises: 0006_drop_rx_form_data
Create Date: 2026-07-07

Every ``opd.*`` table is a tenant-scoped fact table, so all 21 distribute by the
platform key ``iq_tenant_id`` (partmethod ``h``). OPD owns no catalog/control-plane
tables — the medicine/diagnosis/test catalogs it references live in master-data and are
reached by nullable UUID with **no** cross-schema FK — so there are no reference tables
here.

Two structural prerequisites (Phase-1 deferral, cleanup map §11/§12 item 1):

1. ``opd.visits`` was created (revision 0001) with a single-column PK ``(id)``. Citus
   requires the distribution column in the PK (and in every UNIQUE constraint), so this
   revision reshapes it to ``(iq_tenant_id, id)`` first. Every other ``opd`` table
   already leads its PK/uniques with ``iq_tenant_id`` (revisions 001/002; the tenant
   column was canonicalized to ``iq_tenant_id`` in 0004), so no further reshape is needed.
2. The one-time legacy-vs-normalized duplicate mapping of ``prescriptions`` was already
   removed during the W1.5 JSONB retirement (the ``/prescriptions`` normalized REST family
   is the sole writer); nothing to reconcile here.

FK-safe ordering: Citus can only co-locate a distributed→distributed FK once the
referenced table is itself distributed, so parents are distributed before children —
``prescriptions`` (the FK root; ``visit_id`` is a *logical* ref to ``registration.visit``
with no DB-level FK) → its direct children → the two grandchildren
(``prescription_medicine_substitutions`` after ``prescription_medicines``;
``prescription_physical_activity_exercise_types`` after ``prescription_physical_activity``).
Same dist column + type ⇒ Citus co-locates the whole graph, so intra-tenant joins and the
ON DELETE CASCADE FKs stay local to a shard.

PostgreSQL only. SQLite (test) databases are built from the ORM models — the ``Visit``
model carries the composite ``(iq_tenant_id, id)`` PK, and Citus is a no-op concept there.
On plain single-node PostgreSQL (no Citus extension) the distribution calls are guarded to
no-op. Each step is idempotent (PK reshape only when the PK is still single-column;
distribution skipped when the table is already in ``pg_dist_partition``), so the revision is
safe to re-run against a partially migrated database.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0007_opd_distribute_citus"
down_revision: str | Sequence[str] | None = "0006_drop_rx_form_data"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "opd"

# Parents strictly before children (Citus co-location requirement). ``prescriptions`` is
# the FK root; the last two entries are grandchildren of medicines / physical_activity.
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


def _reshape_visits_pk() -> None:
    """Make ``iq_tenant_id`` part of the ``visits`` PK. Idempotent (single-col PK only)."""
    op.get_bind().exec_driver_sql(
        "DO $$ BEGIN "
        "IF EXISTS ("
        "  SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid "
        "  WHERE c.relname = 'visits' AND c.relnamespace = 'opd'::regnamespace "
        "    AND i.indisprimary AND array_length(i.indkey::int[], 1) = 1"
        ") THEN "
        "  ALTER TABLE opd.visits DROP CONSTRAINT visits_pkey; "
        "  ALTER TABLE opd.visits ADD CONSTRAINT visits_pkey PRIMARY KEY (iq_tenant_id, id); "
        "END IF; END $$;"
    )


def _distribute(table: str) -> None:
    """Distribute ``opd.<table>`` by ``iq_tenant_id``; no-op off Citus / if already done."""
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
    if op.get_bind().dialect.name != "postgresql":
        return
    _reshape_visits_pk()
    for table in _DISTRIBUTE_ORDER:
        _distribute(table)


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    # Undistribute in reverse (children first) so co-located FKs are torn down safely, then
    # restore the original single-column visits PK. ``undistribute_table`` is a no-op guard
    # off Citus / when the table is already local.
    for table in reversed(_DISTRIBUTE_ORDER):
        op.get_bind().exec_driver_sql(
            "DO $$ BEGIN "
            "IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'undistribute_table') THEN "
            "  IF EXISTS ("
            f"    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'opd.{table}'::regclass"
            "  ) THEN "
            f"    PERFORM undistribute_table('opd.{table}'); "
            "  END IF; "
            "END IF; END $$;"
        )
    op.get_bind().exec_driver_sql(
        "DO $$ BEGIN "
        "IF EXISTS ("
        "  SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid "
        "  WHERE c.relname = 'visits' AND c.relnamespace = 'opd'::regnamespace "
        "    AND i.indisprimary AND array_length(i.indkey::int[], 1) = 2"
        ") THEN "
        "  ALTER TABLE opd.visits DROP CONSTRAINT visits_pkey; "
        "  ALTER TABLE opd.visits ADD CONSTRAINT visits_pkey PRIMARY KEY (id); "
        "END IF; END $$;"
    )
