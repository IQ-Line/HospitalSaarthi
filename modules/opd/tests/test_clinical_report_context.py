from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

from opd.lib.clinical_report_context import (
    ClinicalReportContext,
    is_ndhm_facility_id,
    resolve_clinical_report_context,
)
from opd.lib.default_report_logo import load_report_logo_data_url


def test_is_ndhm_facility_id_accepts_hfr_strings() -> None:
    assert is_ndhm_facility_id("IN3610001625")
    assert is_ndhm_facility_id("IN0810043241_1")
    assert not is_ndhm_facility_id(str(uuid4()))
    assert not is_ndhm_facility_id("HIMS-001")


def test_resolve_replaces_branch_uuid_with_hip_id(monkeypatch) -> None:
    tenant_id = uuid4()
    patient_id = uuid4()
    branch_uuid = str(uuid4())

    session = MagicMock()
    session.get_bind.return_value.dialect.name = "postgresql"
    tenant_mappings = MagicMock()
    tenant_mappings.first.return_value = {
        "hip_id": "IN3610001625",
        "hip_display_name": "Demo Hospital",
        "tenant_name": "Demo Tenant",
        "address_line1": "Main Road",
        "city": "Delhi",
        "state": "Delhi",
        "pin_code": "110001",
        "contact_phone": "9999999999",
        "contact_email": "demo@hospital.in",
        "metadata": None,
    }
    address_mappings = MagicMock()
    address_mappings.all.return_value = [
        {
            "address_type": "permanent",
            "street": "12 MG Road",
            "city": "Delhi",
            "district": "Central Delhi",
            "state": "Delhi",
            "pincode": "110001",
        }
    ]
    session.execute.return_value.mappings.side_effect = [tenant_mappings, address_mappings]

    monkeypatch.setattr(
        "opd.lib.clinical_report_context.get_service_integration_settings",
        lambda: MagicMock(
            report_web_origin="",
            report_logo_url="/reportLogo.svg",
            facility_id="",
        ),
    )

    resolved = resolve_clinical_report_context(
        session,
        tenant_id,
        ClinicalReportContext(facility_id=branch_uuid),
        patient_id=patient_id,
    )

    assert resolved.facility_id == "IN3610001625"
    assert resolved.facility_name == "Demo Hospital"
    assert resolved.facility_address == "Main Road, Delhi, 110001"
    assert resolved.patient_address == "12 MG Road, Delhi, Central Delhi, 110001"
    assert resolved.logo_url == load_report_logo_data_url()
    assert resolved.logo_url.startswith("data:image/svg+xml,")


def test_resolve_uses_env_facility_id_when_profile_missing(monkeypatch) -> None:
    tenant_id = uuid4()
    session = MagicMock()
    session.get_bind.return_value.dialect.name = "postgresql"
    session.execute.return_value.mappings.return_value.first.return_value = None

    monkeypatch.setattr(
        "opd.lib.clinical_report_context.get_service_integration_settings",
        lambda: MagicMock(
            report_web_origin="",
            report_logo_url="/reportLogo.svg",
            facility_id="IN0910000237",
        ),
    )

    resolved = resolve_clinical_report_context(
        session,
        tenant_id,
        ClinicalReportContext(),
    )

    assert resolved.facility_id == "IN0910000237"
    assert resolved.logo_url == load_report_logo_data_url()
