"""Database access for platform picklist catalog in ``master_global``."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.picklist import PicklistModel, PicklistValueModel
from app.repositories.paged_window import fetch_page_with_window_total


class PicklistRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_picklists(self) -> list[Any]:
        statement: Select[tuple[Any]] = (
            select(PicklistModel)
            .where(
                PicklistModel.is_deleted.is_(False),
                PicklistModel.is_active.is_(True),
            )
            .order_by(PicklistModel.name)
        )
        return list(self._session.scalars(statement).all())

    def get_picklist_by_id(
        self,
        picklist_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        row = self._session.get(PicklistModel, picklist_id)
        if row is None:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_picklist_by_slug(
        self,
        slug: str,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        statement: Select[tuple[Any]] = select(PicklistModel).where(
            PicklistModel.slug == slug,
        )
        if not include_deleted:
            statement = statement.where(
                PicklistModel.is_deleted.is_(False),
                PicklistModel.is_active.is_(True),
            )
        return self._session.scalar(statement)

    def list_values_for_picklist(
        self,
        picklist_id: UUID,
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        filters = [
            PicklistValueModel.category_id == picklist_id,
            PicklistValueModel.is_active.is_(True),
        ]
        cnt = func.count().over().label("_page_total")
        page_stmt = (
            select(PicklistValueModel, cnt)
            .where(*filters)
            .order_by(PicklistValueModel.display_order, PicklistValueModel.label)
            .offset(offset)
            .limit(limit)
        )
        empty_total_stmt: Select[tuple[int]] = select(func.count()).select_from(PicklistValueModel)
        for clause in filters:
            empty_total_stmt = empty_total_stmt.where(clause)
        return fetch_page_with_window_total(
            self._session,
            page_stmt=page_stmt,
            empty_total_stmt=empty_total_stmt,
        )
