"""Use-cases for picklist domain catalog (read-only)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.repositories.picklist_repository import PicklistRepository


class PicklistNotFoundError(Exception):
    """No picklist found for id/reader scope."""


def list_picklists(repository: PicklistRepository) -> list[Any]:
    return repository.list_picklists()


def get_picklist_by_id(repository: PicklistRepository, picklist_id: UUID) -> Any | None:
    return repository.get_picklist_by_id(picklist_id)


def get_picklist_by_slug(repository: PicklistRepository, slug: str) -> Any | None:
    return repository.get_picklist_by_slug(slug)


def require_picklist(repository: PicklistRepository, picklist_id: UUID) -> Any:
    row = repository.get_picklist_by_id(picklist_id)
    if row is None:
        raise PicklistNotFoundError
    return row
