from __future__ import annotations

from uuid import uuid4

from opd.data_access.registration_visit_display import load_formatted_visit_id
from opd.models.registration_visit import RegistrationVisit


def test_load_formatted_visit_id_reads_registration_visit_id(db_session) -> None:
    tenant_id = uuid4()
    visit_id = uuid4()
    db_session.add(
        RegistrationVisit(
            tenant_id=tenant_id,
            id=visit_id,
            formatted_visit_id="OP2606090000019",
            patient_id=uuid4(),
            status="pending",
        )
    )
    db_session.flush()

    assert load_formatted_visit_id(db_session, tenant_id, visit_id) == "OP2606090000019"


def test_load_formatted_visit_id_falls_back_when_visit_row_missing(db_session) -> None:
    tenant_id = uuid4()
    visit_id = uuid4()

    assert load_formatted_visit_id(db_session, tenant_id, visit_id) is None
