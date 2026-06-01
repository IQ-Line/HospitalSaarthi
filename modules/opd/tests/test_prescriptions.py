from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from opd.core.database import get_db_session
from opd.main import create_app
from opd.models import Base

TENANT = "550e8400-e29b-41d4-a716-446655440000"
PATIENT = "660e8400-e29b-41d4-a716-446655440001"


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    for table in Base.metadata.tables.values():
        table.schema = None
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db() -> Generator[Session, None, None]:
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app = create_app()
    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client


def _headers() -> dict[str, str]:
    return {"iq_tenant_id": TENANT}


def test_end_consultation_persists_form_data(client: TestClient) -> None:
    payload = {
        "form_data": {
            "vitals": {},
            "chiefComplaints": [
                {
                    "id": "1",
                    "complaint": "Fever",
                    "severity": "mild",
                    "duration": "2",
                    "durationUnit": "days",
                    "notes": "",
                }
            ],
        }
    }

    end = client.post(
        f"/api/v1/opd/patients/{PATIENT}/prescription/end",
        json=payload,
        headers=_headers(),
    )
    assert end.status_code == 200
    body = end.json()
    assert body["visit_status"] == "completed"
    assert body["is_read_only"] is True
    assert body["form_data"]["chiefComplaints"][0]["complaint"] == "Fever"

    loaded = client.get(f"/api/v1/opd/patients/{PATIENT}/prescription", headers=_headers())
    assert loaded.status_code == 200
    assert loaded.json()["form_data"]["chiefComplaints"][0]["complaint"] == "Fever"
