"""Shared scoped-catalog helpers for inventory master repositories."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.catalog_scope import CatalogScope
from app.repositories.inventory.integrity import DuplicateInventoryCatalogKeyError, is_unique_violation


class ScopedInventoryCatalogRepository:
    """Common get/create/update for dual-schema inventory masters."""

    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _model(self) -> Any:
        raise NotImplementedError

    def _duplicate_message(self) -> str:
        return "Another active row already uses this unique key."

    def get_by_id(
        self,
        row_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._model()
        row = self._session.get(M, row_id)
        if row is None:
            return None
        if self._scope.is_tenant and row.iq_tenant_id != self._scope.iq_tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: Any) -> Any:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateInventoryCatalogKeyError(self._duplicate_message()) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateInventoryCatalogKeyError(self._duplicate_message()) from exc
            raise
        self._session.refresh(row)
        return row
