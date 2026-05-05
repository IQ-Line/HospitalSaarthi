from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ModuleCategory(StrEnum):
    core = "core"
    clinical = "clinical"
    administrative = "administrative"
    support = "support"


class ModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    category: ModuleCategory
    version: str
    created_at: datetime
    updated_at: datetime


class ModuleListResponse(BaseModel):
    data: list[ModuleResponse]
    total: int
