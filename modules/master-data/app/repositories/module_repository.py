from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.module import ModuleModel
from app.schemas.module import ModuleCategory


class ModuleRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_modules(self, *, category: ModuleCategory | None = None) -> list[ModuleModel]:
        statement: Select[tuple[ModuleModel]] = select(ModuleModel).order_by(ModuleModel.name)

        if category is not None:
            statement = statement.where(ModuleModel.category == category.value)

        return list(self._session.scalars(statement).all())
