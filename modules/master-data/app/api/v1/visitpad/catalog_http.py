"""Shared HTTP helpers for Visitpad catalog routes."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.core.catalog_scope import CatalogScope


def require_visitpad_tenant_catalog_scope(scope: CatalogScope) -> None:
    if not scope.is_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant catalog scope required (iq_tenant_id header).",
        )
