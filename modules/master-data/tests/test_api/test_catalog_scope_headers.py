"""Catalog scope from ``iq_tenant_id`` header (single positive integer)."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.api.deps import get_catalog_scope


def test_no_header_returns_global_scope() -> None:
    scope = get_catalog_scope(None)
    assert scope.iq_tenant_id is None
    assert not scope.is_tenant


def test_iq_tenant_id_integer() -> None:
    scope = get_catalog_scope("98")
    assert scope.iq_tenant_id == 98
    assert scope.is_tenant


def test_leading_zeros_normalize_to_int() -> None:
    scope = get_catalog_scope("01")
    assert scope.iq_tenant_id == 1


def test_whitespace_stripped() -> None:
    scope = get_catalog_scope("  7  ")
    assert scope.iq_tenant_id == 7


def test_uuid_string_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("550e8400-e29b-41d4-a716-446655440000")
    assert exc_info.value.status_code == 400
    assert "uuid" in exc_info.value.detail.lower()


def test_non_numeric_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("abc")
    assert exc_info.value.status_code == 400
    assert "digits" in exc_info.value.detail.lower()


def test_slug_like_tenant_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("tenant-001")
    assert exc_info.value.status_code == 400
    assert "tenant-001" in exc_info.value.detail or "slug" in exc_info.value.detail.lower()


def test_zero_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("0")
    assert exc_info.value.status_code == 400
