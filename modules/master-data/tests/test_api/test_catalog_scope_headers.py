"""Catalog scope from ``iq_tenant_id`` header (UUID tenant key)."""

from __future__ import annotations

from uuid import UUID

import pytest
from fastapi import HTTPException

from app.api.deps import get_catalog_scope

T7 = UUID("00000000-0000-0000-0000-000000000007")


def test_no_header_returns_global_scope() -> None:
    scope = get_catalog_scope(None)
    assert scope.iq_tenant_id is None
    assert not scope.is_tenant


def test_iq_tenant_id_uuid() -> None:
    scope = get_catalog_scope("00000000-0000-0000-0000-000000000098")
    assert scope.iq_tenant_id == UUID("00000000-0000-0000-0000-000000000098")
    assert scope.is_tenant


def test_uppercase_uuid_accepted() -> None:
    scope = get_catalog_scope("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")
    assert scope.iq_tenant_id == UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")


def test_whitespace_stripped() -> None:
    scope = get_catalog_scope("  00000000-0000-0000-0000-000000000007  ")
    assert scope.iq_tenant_id == T7


def test_legacy_integer_string_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("98")
    assert exc_info.value.status_code == 400
    assert "uuid" in exc_info.value.detail.lower()


def test_non_uuid_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("abc")
    assert exc_info.value.status_code == 400


def test_slug_like_tenant_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("tenant-001")
    assert exc_info.value.status_code == 400


def test_empty_after_strip_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_catalog_scope("   x")
    assert exc_info.value.status_code == 400
