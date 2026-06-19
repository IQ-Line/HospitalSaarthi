"""Load registration patient snapshot for pharmacy queue projection payloads."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from opd.models.registration_patient_snapshot import RegistrationPatientSnapshot


def age_years_from_date_of_birth(
    dob: date | None,
    *,
    as_of: date | None = None,
) -> int | None:
    if dob is None:
        return None
    today = as_of or datetime.now(UTC).date()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age if age >= 0 else None


def age_years_from_year_of_birth(
    year_of_birth: int | None,
    *,
    as_of: date | None = None,
) -> int | None:
    if year_of_birth is None:
        return None
    today = as_of or datetime.now(UTC).date()
    age = today.year - year_of_birth
    return age if age >= 0 else None


def _trimmed(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


def map_registration_snapshot_to_pharmacy_patient_fields(
    row: RegistrationPatientSnapshot,
) -> dict[str, Any]:
    age = age_years_from_date_of_birth(row.patient_date_of_birth)
    if age is None:
        age = age_years_from_year_of_birth(row.patient_year_of_birth)

    return {
        "patient_name": _trimmed(row.patient_full_name),
        "uhid": _trimmed(row.patient_uhid),
        "phone": _trimmed(row.patient_phone_number),
        "age_years": age,
        "gender": _trimmed(row.patient_gender),
        "abha_address": _trimmed(row.patient_abha_address),
        "patient_date_of_birth": row.patient_date_of_birth,
    }


def load_op_consult_patient_fields(
    session: Session,
    tenant_id: UUID,
    patient_id: UUID,
) -> dict[str, Any] | None:
    """Patient demographics for ABDM OpConsult bundles (includes ABHA + DOB)."""
    stmt = (
        select(RegistrationPatientSnapshot)
        .where(
            RegistrationPatientSnapshot.tenant_id == tenant_id,
            RegistrationPatientSnapshot.patient_id == patient_id,
        )
        .order_by(desc(RegistrationPatientSnapshot.created_at))
        .limit(1)
    )
    row = session.scalars(stmt).first()
    if row is None:
        return None
    age = age_years_from_date_of_birth(row.patient_date_of_birth)
    if age is None:
        age = age_years_from_year_of_birth(row.patient_year_of_birth)
    return {
        "patient_name": _trimmed(row.patient_full_name),
        "gender": _trimmed(row.patient_gender),
        "abha_address": _trimmed(row.patient_abha_address),
        "patient_date_of_birth": row.patient_date_of_birth,
        "age_years": age,
    }


def load_pharmacy_queue_patient_fields(
    session: Session,
    tenant_id: UUID,
    patient_id: UUID,
) -> dict[str, Any] | None:
    """Return denormalized patient fields from registration snapshot, if present."""
    stmt = (
        select(RegistrationPatientSnapshot)
        .where(
            RegistrationPatientSnapshot.tenant_id == tenant_id,
            RegistrationPatientSnapshot.patient_id == patient_id,
        )
        .order_by(desc(RegistrationPatientSnapshot.created_at))
        .limit(1)
    )
    row = session.scalars(stmt).first()
    if row is None:
        return None
    return map_registration_snapshot_to_pharmacy_patient_fields(row)
