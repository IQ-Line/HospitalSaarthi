"""SQL pagination for list_completed_visits (pharmacy queue source)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from opd.data_access.prescription_repo import PrescriptionRepository
from opd.models import Base
from opd.models.legacy_base import LegacyBase
from opd.models.prescription_row import Prescription
from opd.models.registration_visit import RegistrationVisit
from opd.models.visit import Visit

TENANT = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
PATIENT = uuid.UUID("660e8400-e29b-41d4-a716-446655440001")
DOCTOR = uuid.UUID("880e8400-e29b-41d4-a716-446655440003")


@pytest.fixture
def queue_repo() -> PrescriptionRepository:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    phase0_base_tables = (
        Base.metadata.tables[f"opd.visits"],
        Base.metadata.tables["registration.visit"],
    )
    for table in (*phase0_base_tables, *LegacyBase.metadata.tables.values()):
        table.schema = None
    Base.metadata.create_all(engine, tables=list(phase0_base_tables), checkfirst=True)
    LegacyBase.metadata.create_all(engine, checkfirst=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session: Session = session_factory()
    now = datetime.now(UTC)

    for index in range(12):
        visit_id = uuid.uuid4()
        updated_at = now - timedelta(hours=index)
        session.add(
            RegistrationVisit(
                id=visit_id,
                tenant_id=TENANT,
                formatted_visit_id=f"VIS-QUEUE{index:04d}",
                patient_id=PATIENT,
                doctor_id=DOCTOR,
                status="pending",
                created_at=updated_at,
                updated_at=updated_at,
            )
        )

    rx_visit_id = uuid.uuid4()
    rx_updated = now + timedelta(hours=1)
    session.add(
        RegistrationVisit(
            id=rx_visit_id,
            tenant_id=TENANT,
            formatted_visit_id="VIS-RX0001",
            patient_id=PATIENT,
            doctor_id=DOCTOR,
            status="pending",
            created_at=rx_updated,
            updated_at=rx_updated,
        )
    )
    session.add(
        Visit(
            id=rx_visit_id,
            tenant_id=TENANT,
            patient_id=PATIENT,
            status="completed",
            created_at=rx_updated,
            updated_at=rx_updated,
        )
    )
    session.add(
        Prescription(
            id=uuid.uuid4(),
            tenant_id=TENANT,
            visit_id=rx_visit_id,
            patient_id=PATIENT,
            doctor_id=DOCTOR,
            status="final",
            form_data={"medicines": [{"id": "1"}]},
            created_at=rx_updated,
            updated_at=rx_updated,
        )
    )
    session.commit()

    repo = PrescriptionRepository(session, TENANT)
    yield repo
    session.close()


def test_list_completed_visits_returns_accurate_total(queue_repo: PrescriptionRepository) -> None:
    _, total = queue_repo.list_completed_visits(page=1, limit=10)
    assert total == 13


def test_list_completed_visits_paginates_by_updated_at_desc(
    queue_repo: PrescriptionRepository,
) -> None:
    page1, total = queue_repo.list_completed_visits(page=1, limit=10)
    page2, _ = queue_repo.list_completed_visits(page=2, limit=10)

    assert total == 13
    assert len(page1) == 10
    assert len(page2) == 3
    assert page1[0].prescription_id is not None
    assert all(row.prescription_id is None for row in page2)
    timestamps = [row.updated_at for row in page1]
    assert timestamps == sorted(timestamps, reverse=True)
