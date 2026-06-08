"""Unit tests for tenant header resolution helpers."""

from __future__ import annotations

from uuid import UUID

from app.core.catalog_tenant_id import (
    IQ_TENANT_ID_HEADER,
    X_TENANT_ID_HEADER,
    as_single_header_value,
    resolve_catalog_tenant_header_raw,
)

T7 = "00000000-0000-0000-0000-000000000007"


def test_as_single_header_value() -> None:
    assert as_single_header_value(None) is None
    assert as_single_header_value("") is None
    assert as_single_header_value("   ") is None
    assert as_single_header_value(f"  {T7}  ") == T7


def test_resolve_prefers_iq_tenant_id() -> None:
    assert (
        resolve_catalog_tenant_header_raw(
            {IQ_TENANT_ID_HEADER: T7, X_TENANT_ID_HEADER: "00000000-0000-0000-0000-000000000099"},
        )
        == T7
    )


def test_resolve_x_tenant_id_when_iq_absent() -> None:
    assert resolve_catalog_tenant_header_raw({X_TENANT_ID_HEADER: T7}) == T7


def test_resolve_none_when_both_absent() -> None:
    assert resolve_catalog_tenant_header_raw({}) is None
