"""Real-Postgres coverage for the prescription tenant/visit partial-unique.

`prescriptions_tenant_visit_active_uq` = UNIQUE (iq_tenant_id, visit_id) WHERE
deleted_at IS NULL — at most one *active* prescription per (tenant, visit). SQLite
proves parity via `sqlite_where`, but only real Postgres proves the constraint as it
ships, and only Citus proves it holds with iq_tenant_id as the distribution column
(so the same visit under a different tenant is independent).
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from opd.models.prescription.prescription import PrescriptionModel


def _prescription(tenant: uuid.UUID, visit: uuid.UUID) -> PrescriptionModel:
    # ORM attribute is `tenant_id`; it maps to the `iq_tenant_id` distribution column.
    return PrescriptionModel(
        tenant_id=tenant,
        visit_id=visit,
        patient_id=uuid.uuid4(),
        doctor_id=uuid.uuid4(),
    )


def test_one_active_prescription_per_tenant_visit(pg_session: Session) -> None:
    tenant, visit = uuid.uuid4(), uuid.uuid4()
    pg_session.add(_prescription(tenant, visit))
    pg_session.flush()

    # A second ACTIVE prescription for the same (tenant, visit) violates the
    # partial-unique index under real Postgres.
    pg_session.add(_prescription(tenant, visit))
    with pytest.raises(IntegrityError):
        pg_session.flush()
    pg_session.rollback()


def test_partial_unique_is_tenant_scoped(pg_session: Session) -> None:
    visit = uuid.uuid4()
    tenant_a, tenant_b = uuid.uuid4(), uuid.uuid4()

    pg_session.add(_prescription(tenant_a, visit))
    pg_session.flush()

    # SAME visit under a DIFFERENT tenant is allowed: the unique key is
    # (iq_tenant_id, visit_id) and iq_tenant_id is the Citus distribution column.
    pg_session.add(_prescription(tenant_b, visit))
    pg_session.flush()  # must not raise
