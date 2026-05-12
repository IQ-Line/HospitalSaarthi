"""Visitpad — allergens and allergy reactions use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad_table_models import visitpad_allergen_model, visitpad_allergy_reaction_model
from app.repositories.visitpad_allergen_repository import VisitpadAllergenRepository
from app.repositories.visitpad_allergy_reaction_repository import VisitpadAllergyReactionRepository
from app.schemas.visitpad_allergen import (
    VisitpadAllergenCreate,
    VisitpadAllergenUpdate,
    VisitpadAllergyReactionCreate,
    VisitpadAllergyReactionUpdate,
)


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_allergens(
    repository: VisitpadAllergenRepository,
    *,
    search: str | None,
    allergen_type: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_allergens(
        search=search,
        allergen_type=allergen_type,
        limit=limit,
        offset=offset,
    )


def create_visitpad_allergen(
    repository: VisitpadAllergenRepository,
    *,
    payload: VisitpadAllergenCreate,
) -> Any:
    M = visitpad_allergen_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        code=payload.code.strip(),
        display_name=payload.display_name.strip(),
        allergen_type=payload.allergen_type.value,
        drug_class=_norm_opt_str(payload.drug_class),
        reaction_severity_default=payload.reaction_severity_default.value,
        snomed_code=_norm_opt_str(payload.snomed_code),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(tenant_id=repository.scope.tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_allergen_by_id(
    repository: VisitpadAllergenRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_allergen(
    repository: VisitpadAllergenRepository,
    *,
    row_id: UUID,
    payload: VisitpadAllergenUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.tenant_id != repository.scope.tenant_id:
        return None
    if payload.code is not None:
        row.code = payload.code.strip()
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if payload.allergen_type is not None:
        row.allergen_type = payload.allergen_type.value
    if payload.drug_class is not None:
        row.drug_class = _norm_opt_str(payload.drug_class)
    if payload.reaction_severity_default is not None:
        row.reaction_severity_default = payload.reaction_severity_default.value
    if payload.snomed_code is not None:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_allergen(
    repository: VisitpadAllergenRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)


def list_visitpad_allergy_reactions(
    repository: VisitpadAllergyReactionRepository,
    *,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_reactions(
        search=search,
        limit=limit,
        offset=offset,
    )


def create_visitpad_allergy_reaction(
    repository: VisitpadAllergyReactionRepository,
    *,
    payload: VisitpadAllergyReactionCreate,
) -> Any:
    M = visitpad_allergy_reaction_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        display_name=payload.display_name.strip(),
        code=payload.code.strip(),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(tenant_id=repository.scope.tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_allergy_reaction_by_id(
    repository: VisitpadAllergyReactionRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_allergy_reaction(
    repository: VisitpadAllergyReactionRepository,
    *,
    row_id: UUID,
    payload: VisitpadAllergyReactionUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.tenant_id != repository.scope.tenant_id:
        return None
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if payload.code is not None:
        row.code = payload.code.strip()
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_allergy_reaction(
    repository: VisitpadAllergyReactionRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)
