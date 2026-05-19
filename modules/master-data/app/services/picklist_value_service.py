"""Use-cases for picklist value (item) catalog."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.catalog.platform_table_models import picklist_value_model
from app.repositories.picklist_repository import PicklistRepository
from app.repositories.picklist_value_repository import PicklistValueRepository
from app.schemas.picklist_value import PicklistValueCreate, PicklistValueUpdate
from app.services.picklist_service import PicklistNotFoundError, require_picklist


class PicklistValueNotFoundError(Exception):
    """No picklist value found for id/reader scope."""


def list_picklist_values(
    picklist_repository: PicklistRepository,
    value_repository: PicklistValueRepository,
    picklist_id: UUID,
    *,
    is_active: bool | None = None,
) -> list[Any]:
    require_picklist(picklist_repository, picklist_id)
    return value_repository.list_values_for_picklist(picklist_id, is_active=is_active)


def get_picklist_value_by_id(
    picklist_repository: PicklistRepository,
    value_repository: PicklistValueRepository,
    picklist_id: UUID,
    value_id: UUID,
) -> Any | None:
    require_picklist(picklist_repository, picklist_id)
    return value_repository.get_value_by_id(value_id, category_id=picklist_id)


def get_picklist_value_by_slug(
    picklist_repository: PicklistRepository,
    value_repository: PicklistValueRepository,
    picklist_id: UUID,
    slug: str,
) -> Any | None:
    require_picklist(picklist_repository, picklist_id)
    return value_repository.get_value_by_slug(picklist_id, slug)


def create_picklist_value(
    picklist_repository: PicklistRepository,
    value_repository: PicklistValueRepository,
    picklist_id: UUID,
    payload: PicklistValueCreate,
) -> Any:
    require_picklist(picklist_repository, picklist_id)
    M = picklist_value_model(value_repository.scope)
    row = M(
        category_id=picklist_id,
        slug=payload.slug,
        value=payload.value,
        label=payload.label,
        description=payload.description,
        metadata_=payload.metadata,
        is_active=payload.is_active,
        is_default=payload.is_default,
        display_order=payload.display_order,
    )
    if payload.is_default:
        value_repository.clear_default_for_category(picklist_id)
    return value_repository.create_value(row)


def update_picklist_value(
    picklist_repository: PicklistRepository,
    value_repository: PicklistValueRepository,
    picklist_id: UUID,
    value_id: UUID,
    payload: PicklistValueUpdate,
) -> Any:
    require_picklist(picklist_repository, picklist_id)
    row = value_repository.get_value_by_id(value_id, category_id=picklist_id)
    if row is None:
        raise PicklistValueNotFoundError

    data = payload.model_dump(exclude_unset=True)
    if "slug" in data:
        row.slug = data["slug"]
    if "value" in data:
        row.value = data["value"]
    if "label" in data:
        row.label = data["label"]
    if "description" in data:
        row.description = data["description"]
    if "metadata" in data:
        row.metadata_ = data["metadata"]
    if "is_active" in data:
        row.is_active = data["is_active"]
    if "display_order" in data:
        row.display_order = data["display_order"]
    if "is_default" in data:
        row.is_default = data["is_default"]
        if data["is_default"]:
            value_repository.clear_default_for_category(picklist_id, except_id=value_id)

    return value_repository.update_value(row)


def deactivate_picklist_value(
    picklist_repository: PicklistRepository,
    value_repository: PicklistValueRepository,
    picklist_id: UUID,
    value_id: UUID,
) -> Any:
    require_picklist(picklist_repository, picklist_id)
    row = value_repository.get_value_by_id(value_id, category_id=picklist_id)
    if row is None:
        raise PicklistValueNotFoundError
    if not row.is_active:
        return row
    row.is_active = False
    if row.is_default:
        row.is_default = False
    return value_repository.update_value(row)
