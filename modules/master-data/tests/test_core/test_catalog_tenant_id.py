"""Unit tests for ``catalog_tenant_id`` parsing (UUID)."""

from __future__ import annotations

from uuid import UUID

import pytest

from app.core.catalog_tenant_id import (
    CatalogTenantIdError,
    parse_iq_tenant_id,
    try_parse_iq_tenant_id,
)


def test_try_parse_blank() -> None:
    assert try_parse_iq_tenant_id(None) is None
    assert try_parse_iq_tenant_id("") is None
    assert try_parse_iq_tenant_id("   ") is None


def test_parse_round_trip() -> None:
    u = UUID("550e8400-e29b-41d4-a716-446655440000")
    assert parse_iq_tenant_id("550e8400-e29b-41d4-a716-446655440000") == u


def test_parse_errors() -> None:
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("")
    assert exc_info.value.code == "empty"
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("not-a-uuid")
    assert exc_info.value.code == "invalid_uuid"
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("42")
    assert exc_info.value.code == "invalid_uuid"
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("tenant-001")
    assert exc_info.value.code == "invalid_uuid"
