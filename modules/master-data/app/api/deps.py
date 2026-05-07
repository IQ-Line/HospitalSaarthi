from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.repositories.permission_repository import PermissionRepository
from app.repositories.system_role_repository import SystemRoleRepository


def get_session() -> Generator[Session, None, None]:
    yield from get_db_session()


def get_module_repository(session: Annotated[Session, Depends(get_session)]) -> ModuleRepository:
    return ModuleRepository(session)


def get_permission_repository(
    session: Annotated[Session, Depends(get_session)],
) -> PermissionRepository:
    return PermissionRepository(session)


def get_system_role_repository(
    session: Annotated[Session, Depends(get_session)],
) -> SystemRoleRepository:
    return SystemRoleRepository(session)


def get_module_permission_repository(
    session: Annotated[Session, Depends(get_session)],
) -> ModulePermissionRepository:
    return ModulePermissionRepository(session)
