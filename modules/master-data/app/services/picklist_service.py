"""Use-cases for platform picklist catalog (read-only)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.repositories.picklist_repository import PicklistRepository


def list_picklists(repository: PicklistRepository) -> list[Any]:
    return repository.list_picklists()


def get_picklist_by_id(repository: PicklistRepository, picklist_id: UUID) -> Any | None:
    return repository.get_picklist_by_id(picklist_id)


def get_picklist_by_slug(repository: PicklistRepository, slug: str) -> Any | None:
    return repository.get_picklist_by_slug(slug)


def resolve_picklist(
    repository: PicklistRepository,
    picklist_key: str,
) -> Any | None:
    """Resolve a picklist by UUID id or by slug (e.g. ``role-types``)."""
    try:
        picklist_id = UUID(picklist_key)
    except ValueError:
        return repository.get_picklist_by_slug(picklist_key)
    return repository.get_picklist_by_id(picklist_id)


def list_picklist_values(
    repository: PicklistRepository,
    picklist_id: UUID,
    *,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_values_for_picklist(picklist_id, limit=limit, offset=offset)
