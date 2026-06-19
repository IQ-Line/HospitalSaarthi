from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, replace
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from opd.core.config import get_service_integration_settings
from opd.lib.default_report_logo import (
    fetch_remote_logo_as_data_url,
    load_report_logo_data_url,
)

logger = logging.getLogger(__name__)

_NDHM_FACILITY_ID_RE = re.compile(r"^IN(\d{10,}|\d*_\d{10,}|\d{10,}_\d*)$", re.IGNORECASE)


@dataclass(frozen=True)
class ClinicalReportContext:
    """Desk / facility context for clinical PDF generation (query params)."""

    facility_name: str | None = None
    facility_id: str | None = None
    facility_address: str | None = None
    facility_phone: str | None = None
    facility_email: str | None = None
    department_name: str | None = None
    doctor_name: str | None = None
    patient_address: str | None = None
    logo_url: str | None = None
    request_id: str | None = None


def is_ndhm_facility_id(value: str | None) -> bool:
    """True when value looks like an ABDM HFR / HIP id (e.g. IN3610001625)."""
    if not value:
        return False
    return _NDHM_FACILITY_ID_RE.match(value.strip()) is not None


def resolve_report_logo_url(*, web_origin: str = "", logo_path: str = "/reportLogo.svg") -> str | None:
    """Build an absolute logo URL for server-side pdf-platform renders."""
    origin = web_origin.strip().rstrip("/")
    path = (logo_path or "/reportLogo.svg").strip()
    if not origin:
        return None
    if path.startswith(("http://", "https://", "data:")):
        return path
    return f"{origin}{path if path.startswith('/') else f'/{path}'}"


def _qualified_table(session: Session, schema: str, table: str) -> str:
    bind = session.get_bind()
    if bind is not None and bind.dialect.name == "sqlite":
        return table
    return f"{schema}.{table}"


def _text(value: object | None) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _format_address_row(row: dict[str, object]) -> str:
    parts: list[str] = []
    for key in ("street", "city", "district", "state", "pincode"):
        value = _text(row.get(key))
        if value and value not in parts:
            parts.append(value)
    return ", ".join(parts)


def _format_tenant_address_row(row: dict[str, object]) -> str:
    parts: list[str] = []
    for key in ("address_line1", "city", "state", "pin_code"):
        value = _text(row.get(key))
        if value and value not in parts:
            parts.append(value)
    return ", ".join(parts)


def _parse_metadata(value: object | None) -> dict[str, object] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _extract_logo_url_from_metadata(metadata: object | None) -> str | None:
    meta = _parse_metadata(metadata)
    if not meta:
        return None
    logo = meta.get("logo")
    if not isinstance(logo, dict):
        return None
    blob_url = _text(logo.get("blob_url"))
    return blob_url or None


def load_tenant_report_facility(session: Session, tenant_id: UUID) -> dict[str, object] | None:
    """Load NDHM hip id, display name, and tenant contact fields from configurator."""
    bind = session.get_bind()
    if bind is not None and bind.dialect.name == "sqlite":
        return None

    profile_table = _qualified_table(session, "configurator", "tenant_integration_profiles")
    tenant_table = _qualified_table(session, "configurator", "tenants")
    row = (
        session.execute(
            text(
                f"""
                SELECT
                    p.hip_id,
                    p.hip_display_name,
                    t.name AS tenant_name,
                    t.address_line1,
                    t.city,
                    t.state,
                    t.pin_code,
                    t.contact_phone,
                    t.contact_email,
                    t.metadata
                FROM {tenant_table} t
                LEFT JOIN {profile_table} p
                  ON p.iq_tenant_id = t.iq_tenant_id
                 AND p.integration_kind = 'abdm'
                 AND p.is_active = true
                WHERE t.iq_tenant_id = :tenant_id
                LIMIT 1
                """
            ),
            {"tenant_id": str(tenant_id)},
        )
        .mappings()
        .first()
    )
    if row is None:
        return None
    return dict(row)


def load_patient_address_for_report(
    session: Session,
    tenant_id: UUID,
    patient_id: UUID,
) -> str | None:
    bind = session.get_bind()
    if bind is not None and bind.dialect.name == "sqlite":
        print(
            f"[clinical-report] patient address skipped: sqlite bind "
            f"tenant_id={tenant_id} patient_id={patient_id}",
        )
        return None

    address_table = _qualified_table(session, "empi", "patient_addresses")
    rows = (
        session.execute(
            text(
                f"""
                SELECT address_type, street, city, district, state, pincode
                FROM {address_table}
                WHERE iq_tenant_id = :tenant_id AND patient_id = :patient_id
                ORDER BY
                    CASE address_type
                        WHEN 'permanent' THEN 0
                        WHEN 'current' THEN 1
                        ELSE 2
                    END,
                    updated_at DESC NULLS LAST
                """
            ),
            {"tenant_id": str(tenant_id), "patient_id": str(patient_id)},
        )
        .mappings()
        .all()
    )
    print(
        f"[clinical-report] patient address query tenant_id={tenant_id} "
        f"patient_id={patient_id} row_count={len(rows)}",
    )
    if not rows:
        print(
            f"[clinical-report] patient address not found in empi.patient_addresses "
            f"tenant_id={tenant_id} patient_id={patient_id}",
        )
        return None

    for index, row in enumerate(rows):
        formatted = _format_address_row(dict(row))
        print(
            f"[clinical-report] patient address candidate[{index}] "
            f"type={row.get('address_type')!r} formatted={formatted!r}",
        )
        if formatted:
            return formatted

    print(
        f"[clinical-report] patient address rows exist but all fields empty "
        f"tenant_id={tenant_id} patient_id={patient_id}",
    )
    return None


def _resolve_logo_url(
    *,
    base_logo_url: str | None,
    tenant_metadata: object | None,
    integration_web_origin: str,
    integration_logo_path: str,
) -> str:
    """Embed logo as data URL for Gotenberg — same asset chain as desk print."""
    if base_logo_url and base_logo_url.strip().startswith("data:"):
        return base_logo_url.strip()

    tenant_blob = _extract_logo_url_from_metadata(tenant_metadata)
    if tenant_blob:
        fetched = fetch_remote_logo_as_data_url(tenant_blob)
        if fetched:
            return fetched

    origin = integration_web_origin.strip().rstrip("/")
    logo_path = (integration_logo_path or "/reportLogo.svg").strip()
    if origin:
        absolute = logo_path if logo_path.startswith("/") else f"/{logo_path}"
        fetched = fetch_remote_logo_as_data_url(f"{origin}{absolute}")
        if fetched:
            return fetched

    return load_report_logo_data_url()


def resolve_clinical_report_context(
    session: Session,
    tenant_id: UUID,
    context: ClinicalReportContext | None,
    *,
    visit_id: UUID | None = None,
    patient_id: UUID | None = None,
) -> ClinicalReportContext:
    """Fill logo, NDHM facility id, facility contact, and patient address when absent."""
    del visit_id  # registration.visit.facility_id is an internal UUID, not HFR id
    base = context or ClinicalReportContext()
    integration = get_service_integration_settings()
    tenant_row = load_tenant_report_facility(session, tenant_id)

    facility_id = base.facility_id
    if not is_ndhm_facility_id(facility_id):
        if tenant_row and is_ndhm_facility_id(_text(tenant_row.get("hip_id"))):
            facility_id = _text(tenant_row.get("hip_id"))
        elif is_ndhm_facility_id(integration.facility_id):
            facility_id = integration.facility_id.strip()
        else:
            facility_id = None
            logger.warning(
                "clinical report: no NDHM facility id for tenant %s (query=%r, env=%r)",
                tenant_id,
                base.facility_id,
                integration.facility_id or None,
            )

    facility_name = base.facility_name
    if not facility_name and tenant_row:
        facility_name = _text(tenant_row.get("hip_display_name")) or _text(tenant_row.get("tenant_name"))

    facility_address = base.facility_address
    if not facility_address and tenant_row:
        facility_address = _format_tenant_address_row(tenant_row) or None

    facility_phone = base.facility_phone
    if not facility_phone and tenant_row:
        facility_phone = _text(tenant_row.get("contact_phone")) or None

    facility_email = base.facility_email
    if not facility_email and tenant_row:
        facility_email = _text(tenant_row.get("contact_email")) or None

    logo_url = _resolve_logo_url(
        base_logo_url=base.logo_url,
        tenant_metadata=tenant_row.get("metadata") if tenant_row else None,
        integration_web_origin=integration.report_web_origin,
        integration_logo_path=integration.report_logo_url,
    )

    patient_address = base.patient_address
    if not patient_address and patient_id is not None:
        patient_address = load_patient_address_for_report(session, tenant_id, patient_id)
    else:
        print(
            f"[clinical-report] patient address from request context: "
            f"{patient_address!r} patient_id={patient_id}",
        )

    if (
        facility_id == base.facility_id
        and facility_name == base.facility_name
        and facility_address == base.facility_address
        and facility_phone == base.facility_phone
        and facility_email == base.facility_email
        and logo_url == base.logo_url
        and patient_address == base.patient_address
    ):
        return base

    resolved = replace(
        base,
        facility_id=facility_id,
        facility_name=facility_name,
        facility_address=facility_address,
        facility_phone=facility_phone,
        facility_email=facility_email,
        patient_address=patient_address,
        logo_url=logo_url,
    )
    print(
        f"[clinical-report] resolved context tenant_id={tenant_id} "
        f"facility_id={resolved.facility_id!r} facility_name={resolved.facility_name!r} "
        f"logo={'data-url' if resolved.logo_url and resolved.logo_url.startswith('data:') else resolved.logo_url!r} "
        f"patient_address={resolved.patient_address!r}",
    )
    return resolved
