from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException

# No FK on opd.prescriptions.doctor_id in phase-0 dev DB; used when gateway omits user id.
SYSTEM_DOCTOR_ID = UUID("00000000-0000-0000-0000-000000000000")


def resolve_doctor_id(
    x_user_id: str | None = Header(default=None, alias="x-user-id"),
    iq_user_id: str | None = Header(default=None, alias="iq_user_id"),
) -> UUID:
    raw = (x_user_id or iq_user_id or "").strip()
    if not raw:
        return SYSTEM_DOCTOR_ID
    try:
        return UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid x-user-id") from exc
