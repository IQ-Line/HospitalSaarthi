from __future__ import annotations

from datetime import date
from uuid import uuid4

from opd.data_access.registration_patient_snapshot import (
    age_years_from_date_of_birth,
    load_pharmacy_queue_patient_fields,
    map_registration_snapshot_to_pharmacy_patient_fields,
)
from opd.models.registration_patient_snapshot import RegistrationPatientSnapshot


def test_map_registration_snapshot_to_pharmacy_patient_fields() -> None:
    row = RegistrationPatientSnapshot(
        tenant_id=uuid4(),
        registration_id=uuid4(),
        patient_id=uuid4(),
        patient_uhid="UHID-001",
        patient_full_name="Asha Patil",
        patient_phone_number="9810100001",
        patient_gender="female",
        patient_date_of_birth=date(1990, 6, 15),
        patient_year_of_birth=1990,
    )

    fields = map_registration_snapshot_to_pharmacy_patient_fields(row)

    assert fields["patient_name"] == "Asha Patil"
    assert fields["uhid"] == "UHID-001"
    assert fields["phone"] == "9810100001"
    assert fields["gender"] == "female"
    assert fields["age_years"] == age_years_from_date_of_birth(date(1990, 6, 15))


def test_load_pharmacy_queue_patient_fields_returns_none_when_missing(db_session) -> None:
    tenant_id = uuid4()
    patient_id = uuid4()

    assert load_pharmacy_queue_patient_fields(db_session, tenant_id, patient_id) is None


def test_load_pharmacy_queue_patient_fields_reads_registration_row(db_session) -> None:
    tenant_id = uuid4()
    patient_id = uuid4()
    db_session.add(
        RegistrationPatientSnapshot(
            tenant_id=tenant_id,
            registration_id=uuid4(),
            patient_id=patient_id,
            patient_uhid="UHID-002",
            patient_full_name="Ravi Kumar",
            patient_phone_number="9810100002",
            patient_gender="male",
            patient_date_of_birth=date(1985, 1, 1),
            patient_year_of_birth=1985,
        )
    )
    db_session.flush()

    fields = load_pharmacy_queue_patient_fields(db_session, tenant_id, patient_id)

    assert fields is not None
    assert fields["patient_name"] == "Ravi Kumar"
    assert fields["uhid"] == "UHID-002"
