"""Real-Postgres coverage for ``load_visit_patient_source`` — unmocked.

This is opd's most complex cross-module read: raw SQL joining ``registration.visit``
+ ``registration.registration`` with ``empi.patients`` and an ``empi.patient_identifiers``
subquery (ABHA fallbacks). Everywhere else in the suite it is mocked, so only these
tests prove the SQL runs against the real owner-shaped tables (see conftest's
external-table mirrors) and pin the composed result.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from opd.data_access.registration_patient_source import (
    VisitPatientSource,
    load_visit_patient_source,
)
from opd.models.registration_patient_snapshot import RegistrationPatientSnapshot
from opd.models.registration_visit import RegistrationVisit

_CREATED_AT = datetime(2024, 3, 5, 9, 15, tzinfo=UTC)


def _seed_registration_and_visit(
    session: Session,
    *,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    visit_id: uuid.UUID,
    abha_number: str | None = None,
    abha_address: str | None = None,
) -> None:
    session.add(
        RegistrationPatientSnapshot(
            tenant_id=tenant_id,
            registration_id=uuid.uuid4(),
            patient_id=patient_id,
            patient_uhid="UHID-7",
            patient_full_name="Asha Rao",
            patient_phone_number="9990001111",
            patient_abha_number=abha_number,
            patient_abha_address=abha_address,
        )
    )
    session.add(
        RegistrationVisit(
            tenant_id=tenant_id,
            id=visit_id,
            formatted_visit_id="VIS-42",
            patient_id=patient_id,
            created_at=_CREATED_AT,
        )
    )
    session.flush()


def _seed_empi_patient(
    session: Session, *, tenant_id: uuid.UUID, patient_id: uuid.UUID, abha_number: str | None
) -> None:
    session.execute(
        text(
            "INSERT INTO empi.patients (iq_tenant_id, id, abha_number)"
            " VALUES (:tenant_id, :patient_id, :abha_number)"
        ),
        {"tenant_id": tenant_id, "patient_id": patient_id, "abha_number": abha_number},
    )


def _seed_empi_identifier(
    session: Session,
    *,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    identifier_type: str,
    identifier_value: str,
    is_active: bool,
) -> None:
    session.execute(
        text(
            "INSERT INTO empi.patient_identifiers"
            " (iq_tenant_id, patient_id, identifier_type, identifier_value, is_active)"
            " VALUES (:tenant_id, :patient_id, :identifier_type, :identifier_value, :is_active)"
        ),
        {
            "tenant_id": tenant_id,
            "patient_id": patient_id,
            "identifier_type": identifier_type,
            "identifier_value": identifier_value,
            "is_active": is_active,
        },
    )


def test_composes_patient_fields_with_empi_abha_fallbacks(db_session: Session) -> None:
    """Blank registration ABHA fields fall back to empi — the whole composed row, pinned.

    The registration snapshot carries whitespace-only ABHA fields, so NULLIF(TRIM(..))
    must reject them; abha_number comes from ``empi.patients`` and abha_address from the
    single ACTIVE ``abha_address`` identifier (the inactive one must be filtered out).
    """
    tenant_id, patient_id, visit_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    _seed_registration_and_visit(
        db_session,
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
        abha_number="  ",
        abha_address="  ",
    )
    _seed_empi_patient(
        db_session, tenant_id=tenant_id, patient_id=patient_id, abha_number="91-1234-5678-9012"
    )
    _seed_empi_identifier(
        db_session,
        tenant_id=tenant_id,
        patient_id=patient_id,
        identifier_type="abha_address",
        identifier_value="stale@sbx",
        is_active=False,
    )
    _seed_empi_identifier(
        db_session,
        tenant_id=tenant_id,
        patient_id=patient_id,
        identifier_type="abha_address",
        identifier_value="asha@sbx",
        is_active=True,
    )

    result = load_visit_patient_source(db_session, tenant_id, visit_id)

    assert result == VisitPatientSource(
        visit_uuid=visit_id,
        visit_number="VIS-42",
        visit_created_at=_CREATED_AT,
        patient_id=patient_id,
        patient_name="Asha Rao",
        patient_uhid="UHID-7",
        patient_phone="9990001111",
        patient_abha_number="91-1234-5678-9012",
        patient_abha_address="asha@sbx",
    )


def test_registration_snapshot_abha_wins_over_empi(db_session: Session) -> None:
    tenant_id, patient_id, visit_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    _seed_registration_and_visit(
        db_session,
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
        abha_number="91-0000-0000-0001",
        abha_address="reg@sbx",
    )
    _seed_empi_patient(
        db_session, tenant_id=tenant_id, patient_id=patient_id, abha_number="91-9999-9999-9999"
    )
    _seed_empi_identifier(
        db_session,
        tenant_id=tenant_id,
        patient_id=patient_id,
        identifier_type="abha_address",
        identifier_value="empi@sbx",
        is_active=True,
    )

    result = load_visit_patient_source(db_session, tenant_id, visit_id)

    assert result is not None
    assert result.patient_abha_number == "91-0000-0000-0001"
    assert result.patient_abha_address == "reg@sbx"


def test_missing_empi_rows_still_yield_the_visit(db_session: Session) -> None:
    """LEFT JOIN semantics: no empi rows at all → row still returned, ABHA fields None."""
    tenant_id, patient_id, visit_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    _seed_registration_and_visit(
        db_session, tenant_id=tenant_id, patient_id=patient_id, visit_id=visit_id
    )

    result = load_visit_patient_source(db_session, tenant_id, visit_id)

    assert result is not None
    assert result.visit_uuid == visit_id
    assert result.patient_abha_number is None
    assert result.patient_abha_address is None


def test_visit_not_found_returns_none(db_session: Session) -> None:
    tenant_id, patient_id, visit_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    _seed_registration_and_visit(
        db_session, tenant_id=tenant_id, patient_id=patient_id, visit_id=visit_id
    )

    assert load_visit_patient_source(db_session, tenant_id, uuid.uuid4()) is None
    # Tenant-scoped: the same visit under a different tenant is invisible.
    assert load_visit_patient_source(db_session, uuid.uuid4(), visit_id) is None
