"""Seed completed OPD visits with prescriptions for pharmacy queue dev/demo."""

from __future__ import annotations

import sys
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from opd.core.config import get_settings
from opd.models.prescription import Prescription
from opd.models.visit import Visit

# Bootstrap hospital tenant (same as platform login / make seed).
TENANT_ID = uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d480")
DOCTOR_ID = uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d482")

SEED_ROWS: tuple[dict[str, object], ...] = (
    {
        "visit_id": uuid.UUID("b1111111-1111-4111-8111-111111111101"),
        "patient_id": uuid.UUID("a1111111-1111-4111-8111-111111111101"),
        "complaint": "Fever and body ache",
        "medicines": (
            {"medicine": "Paracetamol", "strength": "500mg", "dosage": "1 tab", "frequency": "TDS", "days": "3", "quantity": "9"},
            {"medicine": "Cetirizine", "strength": "10mg", "dosage": "1 tab", "frequency": "OD", "days": "5", "quantity": "5"},
        ),
    },
    {
        "visit_id": uuid.UUID("b1111111-1111-4111-8111-111111111102"),
        "patient_id": uuid.UUID("a1111111-1111-4111-8111-111111111102"),
        "complaint": "Upper respiratory infection",
        "medicines": (
            {"medicine": "Amoxicillin", "strength": "500mg", "dosage": "1 cap", "frequency": "TDS", "days": "7", "quantity": "21"},
            {"medicine": "Ambroxol", "strength": "30mg", "dosage": "10ml", "frequency": "BD", "days": "5", "quantity": "1"},
        ),
    },
    {
        "visit_id": uuid.UUID("b1111111-1111-4111-8111-111111111103"),
        "patient_id": uuid.UUID("a1111111-1111-4111-8111-111111111103"),
        "complaint": "Hypertension follow-up",
        "medicines": (
            {"medicine": "Amlodipine", "strength": "5mg", "dosage": "1 tab", "frequency": "OD", "days": "30", "quantity": "30"},
        ),
    },
)


def _form_data(complaint: str, medicines: tuple[dict[str, str], ...]) -> dict[str, object]:
    return {
        "vitals": {"systolic_bp": "120", "diastolic_bp": "80", "pulse_rate": "72"},
        "chiefComplaints": [
            {
                "id": "1",
                "complaint": complaint,
                "severity": "mild",
                "duration": "2",
                "durationUnit": "days",
                "notes": "Dev seed data",
            }
        ],
        "medicines": [
            {
                "id": str(uuid.uuid4()),
                "route": "oral",
                **medicine,
            }
            for medicine in medicines
        ],
    }


def seed(session: Session) -> int:
    now = datetime.now(UTC)
    inserted = 0

    for index, row in enumerate(SEED_ROWS):
        visit_id = row["visit_id"]
        assert isinstance(visit_id, uuid.UUID)
        existing = session.get(Visit, visit_id)
        if existing is not None:
            continue

        updated_at = now - timedelta(minutes=index * 5)
        visit = Visit(
            id=visit_id,
            tenant_id=TENANT_ID,
            patient_id=row["patient_id"],
            status="completed",
            created_at=updated_at - timedelta(minutes=30),
            updated_at=updated_at,
        )
        session.add(visit)

        complaint = str(row["complaint"])
        medicines = row["medicines"]
        assert isinstance(medicines, tuple)

        prescription = Prescription(
            tenant_id=TENANT_ID,
            visit_id=visit_id,
            patient_id=row["patient_id"],
            doctor_id=DOCTOR_ID,
            vitals_schema_version=1,
            status="final",
            form_data=_form_data(complaint, medicines),
            finalized_at=updated_at,
            created_at=updated_at - timedelta(minutes=25),
            updated_at=updated_at,
        )
        session.add(prescription)
        inserted += 1

    return inserted


def main() -> None:
    engine = create_engine(get_settings().database_url)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with session_factory() as session:
        existing_count = session.scalar(
            select(Visit.id).where(
                Visit.tenant_id == TENANT_ID,
                Visit.status == "completed",
            ).limit(1)
        )
        inserted = seed(session)
        session.commit()

    if inserted == 0 and existing_count is not None:
        print("[opd] completed visits already seeded — nothing to do", file=sys.stderr)
        return

    print(
        f"[opd] seeded {inserted} completed visit(s) for tenant {TENANT_ID}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
