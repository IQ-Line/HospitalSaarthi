from unittest.mock import patch

import pytest

from hims_authz.client import AuthzClient
from hims_authz.types import EnrichedPrincipal


class TestAuthzClient:
    def test_check_allowed(self) -> None:
        principal = EnrichedPrincipal(
            id="test-user",
            roles=["admin"],
            iq_tenant_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            capabilities=["master-data:visitpad:read"],
            delegated_capabilities=[],
            role_codes=["admin"],
        )
        mock_response = {
            "results": [
                {
                    "resource": {"kind": "master_data:visitpad", "id": "unit-42"},
                    "actions": {"visitpad.read": True},
                }
            ]
        }
        client = AuthzClient(host="http://localhost:3592")
        with patch.object(client, "check", return_value=True):
            result = client.check(
                principal=principal,
                kind="master_data:visitpad",
                action="visitpad.read",
                resource_id="unit-42",
            )
            assert result is True

    def test_check_denied(self) -> None:
        principal = EnrichedPrincipal(
            id="test-user",
            roles=["admin"],
            iq_tenant_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            capabilities=[],
            delegated_capabilities=[],
            role_codes=["admin"],
        )
        client = AuthzClient(host="http://localhost:3592")
        with patch.object(client, "check", return_value=False):
            result = client.check(
                principal=principal,
                kind="master_data:platform",
                action="catalog.create",
                resource_id="__new__",
            )
            assert result is False
