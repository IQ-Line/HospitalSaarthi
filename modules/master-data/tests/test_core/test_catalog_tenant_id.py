"""Unit tests for ``catalog_tenant_id`` parsing."""

from __future__ import annotations

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
    assert parse_iq_tenant_id("42") == 42


def test_parse_errors() -> None:
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("")
    assert exc_info.value.code == "empty"
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("x")
    assert exc_info.value.code == "not_integer_string"
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("550e8400-e29b-41d4-a716-446655440000")
    assert exc_info.value.code == "uuid_shape"
    with pytest.raises(CatalogTenantIdError) as exc_info:
        parse_iq_tenant_id("tenant-001")
    assert exc_info.value.code == "not_integer_string"
