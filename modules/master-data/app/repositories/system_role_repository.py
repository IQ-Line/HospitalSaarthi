"""Database access for system role templates (`master_data.system_roles`)."""

from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.system_role import SystemRoleModel


class DuplicateSystemRoleKeyError(Exception):
    """Violates active unique slug index for system_roles."""


def _is_unique_violation(exc: IntegrityError) -> bool:
    orig = getattr(exc, "orig", None)
    if orig is None:
        return False
    if getattr(orig, "pgcode", None) == "23505":
        return True
    if getattr(orig, "sqlite_errorcode", None) in (1555, 2067):
        return True
    text = str(orig).lower()
    return (
        "unique constraint failed" in text
        or "duplicate key value violates unique constraint" in text
    )


class SystemRoleRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_system_roles(
        self,
        *,
        is_template: bool | None = None,
    ) -> list[SystemRoleModel]:
        statement: Select[tuple[SystemRoleModel]] = (
            select(SystemRoleModel)
            .where(SystemRoleModel.is_deleted.is_(False))
            .order_by(SystemRoleModel.name)
        )
        if is_template is not None:
            statement = statement.where(SystemRoleModel.is_template.is_(is_template))
        return list(self._session.scalars(statement).all())

    def get_system_role_by_id(
        self,
        role_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> SystemRoleModel | None:
        row = self._session.get(SystemRoleModel, role_id)
        if row is None:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_system_role_by_slug(self, slug: str) -> SystemRoleModel | None:
        statement = (
            select(SystemRoleModel)
            .where(SystemRoleModel.slug == slug, SystemRoleModel.is_deleted.is_(False))
            .limit(1)
        )
        return self._session.scalars(statement).first()

    def create_system_role(self, row: SystemRoleModel) -> SystemRoleModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateSystemRoleKeyError from exc
            raise
        self._session.refresh(row)
        return row

    def update_system_role(self, row: SystemRoleModel) -> SystemRoleModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateSystemRoleKeyError from exc
            raise
        self._session.refresh(row)
        return row
