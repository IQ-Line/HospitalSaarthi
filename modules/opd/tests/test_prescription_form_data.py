from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock

from opd.data_access.prescription_form_data import (
    _legacy_columns_to_form_vitals,
    _vaccine_db_to_immunization_row,
    _vitals_has_content,
    effective_form_data,
    persist_normalized_from_form_data,
)
from opd.models.prescription import Prescription


def test_legacy_columns_to_form_vitals_maps_create_rx_codes() -> None:
    form_vitals = _legacy_columns_to_form_vitals(
        {
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "pulse_bpm": 72,
            "prescription_id": "ignored",
        }
    )
    assert form_vitals == {
        "systolic_bp": "120",
        "diastolic_bp": "80",
        "pulse_rate": "72",
    }


def test_vitals_has_content() -> None:
    assert not _vitals_has_content({})
    assert not _vitals_has_content({"systolic_bp": ""})
    assert _vitals_has_content({"systolic_bp": "120"})


def test_effective_form_data_loads_legacy_chief_complaints() -> None:
    rx_id = uuid.uuid4()
    rx = Prescription(
        id=rx_id,
        tenant_id=uuid.uuid4(),
        visit_id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        status="final",
        form_data={},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    session = MagicMock()

    def execute_side_effect(*_args, **_kwargs):
        result = MagicMock()
        sql = str(_args[0]) if _args else ""
        if "prescription_chief_complaints" in sql:
            result.mappings.return_value.all.return_value = [
                {
                    "line_no": 1,
                    "complaint_text": "Cough",
                    "duration_value": "1",
                    "duration_unit": "days",
                    "severity": "mild",
                    "notes": None,
                }
            ]
            result.mappings.return_value.first.return_value = None
        elif "prescription_vaccines_required" in sql:
            result.mappings.return_value.all.return_value = []
            result.mappings.return_value.first.return_value = None
        else:
            result.mappings.return_value.all.return_value = []
            result.mappings.return_value.first.return_value = None
        return result

    session.execute.side_effect = execute_side_effect

    form = effective_form_data(session, rx)

    assert form["chiefComplaints"][0]["complaint"] == "Cough"
    assert form["chiefComplaints"][0]["durationUnit"] == "days"


def test_effective_form_data_loads_vaccines_required_as_immunizations() -> None:
    row = _vaccine_db_to_immunization_row(
        {
            "name": "Ebola vaccine",
            "instructions": None,
            "due_by": "2026-07-01T00:00:00+00:00",
            "status": "pending",
        }
    )
    assert row["vaccineName"] == "Ebola vaccine"
    assert row["nextDueDate"] == "2026-07-01"


def test_persist_normalized_writes_vaccines_required() -> None:
    session = MagicMock()
    tenant_id = uuid.uuid4()
    prescription_id = uuid.uuid4()
    form_data = {
        "immunizations": [
            {
                "vaccineName": "Hepatitis B",
                "manufacturer": "Acme",
                "lotNumber": "LOT1",
                "dateOfDose": "2026-06-01",
                "doseNumber": "1",
                "nextDueDate": "2026-12-01",
                "notes": "booster",
            }
        ]
    }

    persist_normalized_from_form_data(session, tenant_id, prescription_id, form_data)

    assert session.execute.call_count >= 2
    insert_sql = str(session.execute.call_args_list[-1][0][0])
    assert "prescription_vaccines_required" in insert_sql
