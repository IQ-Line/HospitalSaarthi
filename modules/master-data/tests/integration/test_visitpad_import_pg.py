"""Real-Postgres coverage for the visitpad platform bulk-import ON CONFLICT path.

The SQLite unit suites always take the row-by-row ``_sqlite_insert_skip_duplicates``
fallback, so ``platform_bulk_import_pg.pg_import_units`` — the production path that
issues a single ``INSERT ... ON CONFLICT DO NOTHING`` against the partial-unique
``index_where`` — was never executed by any test. These prove it: idempotency on
re-import, and that the conflict target is the *tenant-scoped* unique
``(iq_tenant_id, code)`` (one tenant's rows never block another's). All 12 other
visitpad catalogs import through the same ``pg_bulk_insert_ignore_returning`` helper.
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.catalog_scope import CatalogScope
from app.models.visitpad.unit import VisitpadUnitPublicModel
from app.repositories.visitpad.unit import VisitpadUnitRepository
from app.services.visitpad._pg_bulk_insert import session_is_postgresql
from app.services.visitpad.platform_bulk_import import import_visitpad_units_from_platform


def _seed_global_units(session: Session, codes: list[str]) -> list[uuid.UUID]:
    """Insert active platform-catalog (master_global) unit rows to import FROM."""
    ids: list[uuid.UUID] = []
    for code in codes:
        row = VisitpadUnitPublicModel(
            id=uuid.uuid4(),
            code=code,
            display_name=code.upper(),
            dimension="other",
            ucum_code=None,
            is_canonical=False,
            display_order=0,
            is_active=True,
            is_deleted=False,
        )
        session.add(row)
        ids.append(row.id)
    session.flush()
    return ids


def _import(session: Session, tenant: uuid.UUID, platform_ids: list[uuid.UUID]):
    scope = CatalogScope(iq_tenant_id=tenant)
    repo = VisitpadUnitRepository(session, scope)
    return import_visitpad_units_from_platform(
        session, scope=scope, tenant_repo=repo, platform_row_ids=platform_ids
    )


def test_units_import_is_idempotent_via_real_pg_on_conflict(pg_session: Session) -> None:
    # Guarantee we are actually exercising the pg_import_units branch, not a
    # silent SQLite fallback that would make this test meaningless.
    assert session_is_postgresql(pg_session)
    tenant = uuid.uuid4()
    platform_ids = _seed_global_units(pg_session, ["mg", "ml"])

    first = _import(pg_session, tenant, platform_ids)
    assert len(first.created) == 2
    assert len(first.skipped) == 0

    # Re-import the SAME platform rows → real pg_import_units ON CONFLICT DO NOTHING
    # → nothing re-created, both skipped. (SQLite's row-by-row fallback path is bypassed.)
    second = _import(pg_session, tenant, platform_ids)
    assert len(second.created) == 0
    assert len(second.skipped) == 2


def test_import_conflict_target_is_tenant_scoped(pg_session: Session) -> None:
    platform_ids = _seed_global_units(pg_session, ["mg", "ml"])
    tenant_a, tenant_b = uuid.uuid4(), uuid.uuid4()

    a = _import(pg_session, tenant_a, platform_ids)
    assert len(a.created) == 2

    # Tenant B importing the SAME codes is NOT blocked by tenant A's rows: the
    # partial-unique conflict target is (iq_tenant_id, code), so B gets its own rows.
    # This is exactly what SQLite's global-code fallback could misrepresent.
    b = _import(pg_session, tenant_b, platform_ids)
    assert len(b.created) == 2
    assert len(b.skipped) == 0
