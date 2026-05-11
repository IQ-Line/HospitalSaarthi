"""Visitpad — allergens and allergy reactions use-cases."""

from __future__ import annotations

import uuid
from uuid import UUID

from app.models.visitpad_allergen import VisitpadAllergenModel
from app.models.visitpad_allergy_reaction import VisitpadAllergyReactionModel
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
    tenant_id: UUID,
    search: str | None,
    allergen_type: str | None,
    limit: int,
    offset: int,
) -> tuple[list[VisitpadAllergenModel], int]:
    return repository.list_allergens(
        tenant_id=tenant_id,
        search=search,
        allergen_type=allergen_type,
        limit=limit,
        offset=offset,
    )


def create_visitpad_allergen(
    repository: VisitpadAllergenRepository,
    *,
    tenant_id: UUID,
    payload: VisitpadAllergenCreate,
) -> VisitpadAllergenModel:
    row = VisitpadAllergenModel(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
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
    return repository.create(row)


def get_visitpad_allergen_by_id(
    repository: VisitpadAllergenRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadAllergenModel | None:
    return repository.get_by_id(row_id, tenant_id=tenant_id)


def update_visitpad_allergen(
    repository: VisitpadAllergenRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
    payload: VisitpadAllergenUpdate,
) -> VisitpadAllergenModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id, include_deleted=True)
    if row is None or row.tenant_id != tenant_id:
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
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadAllergenModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)


def list_visitpad_allergy_reactions(
    repository: VisitpadAllergyReactionRepository,
    *,
    tenant_id: UUID,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[VisitpadAllergyReactionModel], int]:
    return repository.list_reactions(
        tenant_id=tenant_id,
        search=search,
        limit=limit,
        offset=offset,
    )


def create_visitpad_allergy_reaction(
    repository: VisitpadAllergyReactionRepository,
    *,
    tenant_id: UUID,
    payload: VisitpadAllergyReactionCreate,
) -> VisitpadAllergyReactionModel:
    row = VisitpadAllergyReactionModel(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        display_name=payload.display_name.strip(),
        code=payload.code.strip(),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    return repository.create(row)


def get_visitpad_allergy_reaction_by_id(
    repository: VisitpadAllergyReactionRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadAllergyReactionModel | None:
    return repository.get_by_id(row_id, tenant_id=tenant_id)


def update_visitpad_allergy_reaction(
    repository: VisitpadAllergyReactionRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
    payload: VisitpadAllergyReactionUpdate,
) -> VisitpadAllergyReactionModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id, include_deleted=True)
    if row is None or row.tenant_id != tenant_id:
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
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadAllergyReactionModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)
