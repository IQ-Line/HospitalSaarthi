"""Bulk copy department rows from ``master_global`` into ``master_tenant``."""

from __future__ import annotations

from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import department_model
from app.core.catalog_scope import CatalogScope
from app.repositories.department_repository import (
    DepartmentRepository,
    DuplicateDepartmentKeyError,
)
from app.schemas.department import DepartmentCreate, DepartmentResponse
from app.schemas.visitpad.platform_import import (
    VisitpadPlatformImportData,
    VisitpadPlatformImportErrorItem,
)
from app.services.department_service import create_department


def _require_tenant_scope(scope: CatalogScope) -> None:
    if not scope.is_tenant:
        msg = "Import from platform requires tenant catalog scope (iq_tenant_id header)."
        raise ValueError(msg)


def _fetch_global_by_ids(session: Session, ids: list[UUID]) -> dict[UUID, object]:
    if not ids:
        return {}
    M = department_model(CatalogScope(None))
    stmt = select(M).where(M.id.in_(ids), M.is_deleted.is_(False))
    rows = session.scalars(stmt).unique().all()
    return {r.id: r for r in rows}


def _fmt_validation_error(exc: ValidationError) -> str:
    return "; ".join(f"{e['loc']}: {e['msg']}" for e in exc.errors())


def import_departments_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: DepartmentRepository,
    platform_row_ids: list[UUID],
    actor_id: UUID | None = None,
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    by_id = _fetch_global_by_ids(session, platform_row_ids)
    created: list[UUID] = []
    skipped: list[UUID] = []
    errors: list[VisitpadPlatformImportErrorItem] = []

    for pid in platform_row_ids:
        pub = by_id.get(pid)
        if pub is None:
            errors.append(
                VisitpadPlatformImportErrorItem(
                    platform_row_id=pid,
                    message="Platform row not found.",
                ),
            )
            continue
        try:
            resp = DepartmentResponse.model_validate(pub)
            payload = DepartmentCreate.model_validate(
                {k: getattr(resp, k) for k in DepartmentCreate.model_fields}
            )
        except ValidationError as exc:
            errors.append(
                VisitpadPlatformImportErrorItem(
                    platform_row_id=pid,
                    message=_fmt_validation_error(exc),
                ),
            )
            continue

        if tenant_repo.get_department_by_code(payload.code) is not None:
            skipped.append(pid)
            continue

        try:
            with session.begin_nested():
                row = create_department(tenant_repo, payload, actor_id=actor_id)
            created.append(row.id)
        except DuplicateDepartmentKeyError:
            skipped.append(pid)

    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
