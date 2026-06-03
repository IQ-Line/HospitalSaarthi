from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from opd.core.database import get_db_session
from opd.core.tenant import require_tenant_id

DbSession = Annotated[Session, Depends(get_db_session)]
TenantId = Annotated[UUID, Depends(require_tenant_id)]
