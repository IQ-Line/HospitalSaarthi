"""Use-cases for platform picklist catalog (read-only)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.repositories.picklist_repository import PicklistRepository


def list_picklists(repository: PicklistRepository) -> list[Any]:
    return repository.list_picklists()


def get_picklist_by_id(repository: PicklistRepository, picklist_id: UUID) -> Any | None:
    return repository.get_picklist_by_id(picklist_id)


def list_picklist_values(
    repository: PicklistRepository,
    picklist_id: UUID,
    *,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_values_for_picklist(picklist_id, limit=limit, offset=offset)
