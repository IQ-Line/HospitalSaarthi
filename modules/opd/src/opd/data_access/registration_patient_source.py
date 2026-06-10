from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class VisitPatientSource:
    visit_uuid: UUID
    visit_number: str
    visit_created_at: datetime
    patient_id: UUID
    patient_name: str
    patient_uhid: str
    patient_phone: str | None
    patient_abha_number: str | None
    patient_abha_address: str | None


def _qualified_table(session: Session, schema: str, table: str) -> str:
    bind = session.get_bind()
    if bind is not None and bind.dialect.name == "sqlite":
        return table
    return f"{schema}.{table}"


def load_visit_patient_source(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
) -> VisitPatientSource | None:
    visit_table = _qualified_table(session, "registration", "visit")
    registration_table = _qualified_table(session, "registration", "registration")

    row = (
        session.execute(
            text(
                f"""
                SELECT
                    v.id AS visit_uuid,
                    v.visit_id AS visit_number,
                    v.created_at AS visit_created_at,
                    v.patient_id AS patient_id,
                    r.patient_full_name AS patient_name,
                    r.patient_uhid AS patient_uhid,
                    r.patient_phone_number AS patient_phone,
                    r.patient_abha_number AS patient_abha_number,
                    r.patient_abha_address AS patient_abha_address
                FROM {visit_table} v
                INNER JOIN {registration_table} r
                    ON r.iq_tenant_id = v.iq_tenant_id
                    AND r.patient_id = v.patient_id
                WHERE v.iq_tenant_id = :tenant_id
                  AND v.id = :visit_id
                LIMIT 1
                """
            ),
            {"tenant_id": str(tenant_id), "visit_id": str(visit_id)},
        )
        .mappings()
        .first()
    )
    if row is None:
        return None

    created_at = row["visit_created_at"]
    if not isinstance(created_at, datetime):
        return None

    return VisitPatientSource(
        visit_uuid=UUID(str(row["visit_uuid"])),
        visit_number=str(row["visit_number"] or "").strip() or str(visit_id),
        visit_created_at=created_at,
        patient_id=UUID(str(row["patient_id"])),
        patient_name=str(row["patient_name"] or "").strip() or "—",
        patient_uhid=str(row["patient_uhid"] or "").strip() or "—",
        patient_phone=(str(row["patient_phone"]).strip() if row["patient_phone"] else None),
        patient_abha_number=(
            str(row["patient_abha_number"]).strip() if row["patient_abha_number"] else None
        ),
        patient_abha_address=(
            str(row["patient_abha_address"]).strip() if row["patient_abha_address"] else None
        ),
    )
