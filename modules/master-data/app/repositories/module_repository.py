"""Database access for `master_data.modules` — reads and writes."""

from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.module import ModuleModel
from app.schemas.module import ModuleCategory


class DuplicateModuleKeyError(Exception):
    """Violates partial unique index on name or slug among active (non-deleted) rows."""


class ModuleRepository:
    """Catalog rows. List/detail omit soft-deleted rows unless explicitly loaded for mutation."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_modules(self, *, category: ModuleCategory | None = None) -> list[ModuleModel]:
        statement: Select[tuple[ModuleModel]] = (
            select(ModuleModel).where(ModuleModel.is_deleted.is_(False)).order_by(ModuleModel.name)
        )

        if category is not None:
            statement = statement.where(ModuleModel.category == category.value)

        return list(self._session.scalars(statement).all())

    def get_module_by_id(
        self,
        module_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> ModuleModel | None:
        module = self._session.get(ModuleModel, module_id)
        if module is None:
            return None
        if not include_deleted and module.is_deleted:
            return None
        return module

    def get_module_by_slug(self, slug: str) -> ModuleModel | None:
        statement = (
            select(ModuleModel)
            .where(ModuleModel.slug == slug, ModuleModel.is_deleted.is_(False))
            .limit(1)
        )
        return self._session.scalars(statement).first()

    def create_module(self, module: ModuleModel) -> ModuleModel:
        self._session.add(module)
        try:
            self._session.flush()
            self._session.commit()
        except IntegrityError as exc:
            self._session.rollback()
            raise DuplicateModuleKeyError from exc
        self._session.refresh(module)
        return module

    def update_module(self, module: ModuleModel) -> ModuleModel:
        try:
            self._session.flush()
            self._session.commit()
        except IntegrityError as exc:
            self._session.rollback()
            raise DuplicateModuleKeyError from exc
        self._session.refresh(module)
        return module
