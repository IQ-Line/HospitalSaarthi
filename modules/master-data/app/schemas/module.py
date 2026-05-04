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
    display_name: str
    category: ModuleCategory
    is_core: bool
    version: str
    created_at: datetime
    updated_at: datetime


class ModuleListResponse(BaseModel):
    data: list[ModuleResponse]
    total: int
