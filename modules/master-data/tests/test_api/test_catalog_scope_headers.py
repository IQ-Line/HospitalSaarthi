"""Catalog scope from tenant headers (``iq_tenant_id`` / ``x-tenant-id``)."""

from __future__ import annotations

from uuid import UUID

import pytest
from fastapi import HTTPException

from app.api.deps import catalog_scope_from_tenant_header_raw
from app.core.catalog_tenant_id import (
    IQ_TENANT_ID_HEADER,
    X_TENANT_ID_HEADER,
    resolve_catalog_tenant_header_raw,
)

T7 = UUID("00000000-0000-0000-0000-000000000007")
T98 = UUID("00000000-0000-0000-0000-000000000098")


def test_no_header_returns_global_scope() -> None:
    scope = catalog_scope_from_tenant_header_raw(None)
    assert scope.iq_tenant_id is None
    assert not scope.is_tenant


def test_iq_tenant_id_uuid() -> None:
    scope = catalog_scope_from_tenant_header_raw("00000000-0000-0000-0000-000000000098")
    assert scope.iq_tenant_id == T98
    assert scope.is_tenant


def test_uppercase_uuid_accepted() -> None:
    scope = catalog_scope_from_tenant_header_raw("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")
    assert scope.iq_tenant_id == UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")


def test_whitespace_stripped() -> None:
    scope = catalog_scope_from_tenant_header_raw("  00000000-0000-0000-0000-000000000007  ")
    assert scope.iq_tenant_id == T7


def test_legacy_integer_string_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        catalog_scope_from_tenant_header_raw("98")
    assert exc_info.value.status_code == 400
    assert "uuid" in exc_info.value.detail.lower()


def test_non_uuid_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        catalog_scope_from_tenant_header_raw("abc")
    assert exc_info.value.status_code == 400


def test_slug_like_tenant_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        catalog_scope_from_tenant_header_raw("tenant-001")
    assert exc_info.value.status_code == 400


def test_empty_after_strip_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        catalog_scope_from_tenant_header_raw("   x")
    assert exc_info.value.status_code == 400


# --- Header resolution (Cases A–E) ---


def test_case_a_iq_tenant_id_header_only() -> None:
    raw = resolve_catalog_tenant_header_raw({IQ_TENANT_ID_HEADER: str(T7)})
    scope = catalog_scope_from_tenant_header_raw(raw)
    assert scope.iq_tenant_id == T7


def test_case_b_x_tenant_id_header_only() -> None:
    raw = resolve_catalog_tenant_header_raw({X_TENANT_ID_HEADER: str(T7)})
    scope = catalog_scope_from_tenant_header_raw(raw)
    assert scope.iq_tenant_id == T7


def test_case_c_both_headers_same_uuid() -> None:
    raw = resolve_catalog_tenant_header_raw(
        {IQ_TENANT_ID_HEADER: str(T7), X_TENANT_ID_HEADER: str(T7)},
    )
    scope = catalog_scope_from_tenant_header_raw(raw)
    assert scope.iq_tenant_id == T7


def test_case_c_prefers_iq_tenant_id_when_both_present() -> None:
    raw = resolve_catalog_tenant_header_raw(
        {
            IQ_TENANT_ID_HEADER: str(T98),
            X_TENANT_ID_HEADER: str(T7),
        },
    )
    scope = catalog_scope_from_tenant_header_raw(raw)
    assert scope.iq_tenant_id == T98


def test_case_d_no_tenant_headers_global_scope() -> None:
    raw = resolve_catalog_tenant_header_raw({})
    assert raw is None
    scope = catalog_scope_from_tenant_header_raw(raw)
    assert scope.iq_tenant_id is None


def test_case_d_blank_iq_falls_back_to_x_tenant_id() -> None:
    """Simulates proxy stripping ``iq_tenant_id`` while ``x-tenant-id`` survives."""
    raw = resolve_catalog_tenant_header_raw(
        {IQ_TENANT_ID_HEADER: "   ", X_TENANT_ID_HEADER: str(T7)},
    )
    scope = catalog_scope_from_tenant_header_raw(raw)
    assert scope.iq_tenant_id == T7


def test_case_e_invalid_tenant_header() -> None:
    with pytest.raises(HTTPException) as exc_info:
        catalog_scope_from_tenant_header_raw("not-a-uuid")
    assert exc_info.value.status_code == 400
