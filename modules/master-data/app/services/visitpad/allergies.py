"""Visitpad — allergens and allergy reactions use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad.table_models import visitpad_allergen_model, visitpad_allergy_reaction_model
from app.repositories.visitpad.allergen import VisitpadAllergenRepository
from app.repositories.visitpad.allergy_reaction import VisitpadAllergyReactionRepository
from app.schemas.visitpad.allergen import (
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
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
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
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "allergen_type" in dump and payload.allergen_type is not None:
        row.allergen_type = payload.allergen_type.value
    if "drug_class" in dump:
        row.drug_class = _norm_opt_str(payload.drug_class)
    if "reaction_severity_default" in dump and payload.reaction_severity_default is not None:
        row.reaction_severity_default = payload.reaction_severity_default.value
    if "snomed_code" in dump:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
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
        short_name=_norm_opt_str(payload.short_name),
        snomed_code=_norm_opt_str(payload.snomed_code),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
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
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "short_name" in dump:
        row.short_name = _norm_opt_str(payload.short_name)
    if "snomed_code" in dump:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
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
