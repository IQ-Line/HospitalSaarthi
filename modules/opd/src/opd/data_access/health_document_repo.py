"""Persistence for patient health document metadata."""

from __future__ import annotations

import math
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from opd.models.health_document import HealthDocument


class HealthDocumentRepository:
    def __init__(self, session: Session, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    def create(
        self,
        *,
        patient_id: UUID,
        visit_id: UUID | None,
        hi_type: str,
        document_title: str,
        original_file_name: str,
        storage_key: str,
        blob_url: str,
        mime_type: str,
        file_size_bytes: int,
        uploaded_by: UUID | None,
    ) -> HealthDocument:
        now = datetime.now(UTC)
        row = HealthDocument(
            tenant_id=self._tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
            hi_type=hi_type,
            document_title=document_title,
            original_file_name=original_file_name,
            storage_key=storage_key,
            blob_url=blob_url,
            mime_type=mime_type,
            file_size_bytes=file_size_bytes,
            uploaded_at=now,
            created_by=uploaded_by,
            updated_by=uploaded_by,
            created_at=now,
            updated_at=now,
        )
        self._session.add(row)
        self._session.flush()
        return row

    def get(self, document_id: UUID) -> HealthDocument | None:
        # Mapper PK order is (id, tenant_id) — use explicit filter, not session.get(tenant, id).
        stmt = select(HealthDocument).where(
            HealthDocument.tenant_id == self._tenant_id,
            HealthDocument.id == document_id,
        )
        return self._session.scalar(stmt)

    def list_for_patient(
        self,
        *,
        patient_id: UUID,
        visit_id: UUID | None,
        page: int,
        limit: int,
    ) -> tuple[list[HealthDocument], int]:
        base = select(HealthDocument).where(
            HealthDocument.tenant_id == self._tenant_id,
            HealthDocument.patient_id == patient_id,
            HealthDocument.status == "active",
        )
        if visit_id is not None:
            base = base.where(HealthDocument.visit_id == visit_id)

        count_stmt = select(func.count()).select_from(HealthDocument).where(
            HealthDocument.tenant_id == self._tenant_id,
            HealthDocument.patient_id == patient_id,
            HealthDocument.status == "active",
        )
        if visit_id is not None:
            count_stmt = count_stmt.where(HealthDocument.visit_id == visit_id)
        total = self._session.scalar(count_stmt) or 0
        offset = (page - 1) * limit
        rows = self._session.scalars(
            base.order_by(HealthDocument.uploaded_at.desc()).offset(offset).limit(limit)
        ).all()
        return list(rows), total

    def list_active_for_visit(self, visit_id: UUID) -> list[HealthDocument]:
        stmt = (
            select(HealthDocument)
            .where(
                HealthDocument.tenant_id == self._tenant_id,
                HealthDocument.visit_id == visit_id,
                HealthDocument.status == "active",
            )
            .order_by(HealthDocument.uploaded_at.desc())
        )
        return list(self._session.scalars(stmt).all())
