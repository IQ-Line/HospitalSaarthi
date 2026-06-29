from __future__ import annotations

import uuid

from opd.data_access.prescription_form_data import (
    _legacy_columns_to_form_vitals,
    _vaccine_db_to_immunization_row,
    _vitals_has_content,
)


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


def test_merge_enriches_stored_medicines_missing_catalog_ids() -> None:
    from opd.data_access.prescription_form_data import _merge_form_data

    med_id = uuid.uuid4()
    merged = _merge_form_data(
        {
            "medicines": [
                {
                    "id": "row-1",
                    "medicineId": str(med_id),
                    "medicine_id": str(med_id),
                    "medicine": "Paracetamol",
                }
            ]
        },
        {
            "medicines": [
                {
                    "id": "stored-1",
                    "medicine": "Paracetamol",
                    "strength": "500mg",
                }
            ],
        },
    )

    assert merged["medicines"][0]["medicineId"] == str(med_id)
    assert merged["medicines"][0]["medicine_id"] == str(med_id)


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
