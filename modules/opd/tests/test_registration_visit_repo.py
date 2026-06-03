from __future__ import annotations

from opd.data_access.registration_visit_repo import (
    effective_visit_status,
    opd_status_filter_to_registration,
    registration_status_to_opd_visit_status,
)


def test_registration_status_maps_pending_to_registered() -> None:
    assert registration_status_to_opd_visit_status("pending") == "registered"
    assert registration_status_to_opd_visit_status("in_progress") == "in_progress"


def test_opd_status_filter_maps_registered_to_pending() -> None:
    assert opd_status_filter_to_registration("registered") == "pending"
    assert opd_status_filter_to_registration("in-progress") == "in_progress"


def test_effective_visit_status_overlays_final_prescription() -> None:
    assert effective_visit_status("in_progress", "final") == "completed"
    assert effective_visit_status("pending", "final") == "completed"
    assert effective_visit_status("in_progress", "draft") == "in_progress"
    assert effective_visit_status("pending", None) == "registered"


def test_registration_intake_complete_is_not_consulted() -> None:
    assert effective_visit_status("completed", None) == "registered"
    assert effective_visit_status("completed", "draft") == "registered"
