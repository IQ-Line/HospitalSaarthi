from unittest.mock import patch, Mock

import pytest

from cerbos.sdk.model import (
    CheckResourcesResponse,
    CheckResourcesResult,
    Effect,
    Resource as CerbosResource,
)

from hims_authz.client import AuthzClient
from hims_authz.types import EnrichedPrincipal


def _make_principal(
    roles: list[str] | None = None,
    capabilities: list[str] | None = None,
    role_codes: list[str] | None = None,
) -> EnrichedPrincipal:
    return EnrichedPrincipal(
        id="test-user",
        roles=roles or ["admin"],
        iq_tenant_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        capabilities=capabilities or [],
        delegated_capabilities=[],
        role_codes=role_codes or [],
    )


class TestAuthzClientCheck:
    """Tests the real AuthzClient.check() logic by mocking the SDK layer.

    These catch regressions like:
      - ``is True`` identity check failing with ``Effect`` enum strings
      - Wrong result indexing (index 0 vs ``get_resource``)
    """

    @pytest.fixture
    def client(self) -> AuthzClient:
        return AuthzClient(host="http://localhost:3592")

    @pytest.fixture
    def mock_sdk(self) -> Mock:
        with patch("hims_authz.client.CerbosClient") as mock_cls:
            yield mock_cls

    def _build_result(self, action: str, effect: Effect) -> CheckResourcesResult:
        return CheckResourcesResult(
            resource=CerbosResource(id="__new__", kind="master_data:platform"),
            actions={action: effect},
        )

    def test_allows_when_cerbos_returns_allow(
        self, client: AuthzClient, mock_sdk: Mock
    ) -> None:
        mock_sdk_instance = mock_sdk.return_value.__enter__.return_value
        mock_sdk_instance.check_resources.return_value = CheckResourcesResponse(
            request_id="test-1",
            results=[self._build_result("catalog.read", Effect.ALLOW)],
        )

        result = client.check(
            principal=_make_principal(
                capabilities=["master-data:platform:read"],
                role_codes=["super-admin"],
            ),
            kind="master_data:platform",
            action="catalog.read",
            resource_id="__new__",
        )

        assert result is True

    def test_denies_when_cerbos_returns_deny(
        self, client: AuthzClient, mock_sdk: Mock
    ) -> None:
        mock_sdk_instance = mock_sdk.return_value.__enter__.return_value
        mock_sdk_instance.check_resources.return_value = CheckResourcesResponse(
            request_id="test-2",
            results=[self._build_result("catalog.read", Effect.DENY)],
        )

        result = client.check(
            principal=_make_principal(role_codes=["reader"]),
            kind="master_data:platform",
            action="catalog.read",
            resource_id="__new__",
        )

        assert result is False

    def test_denies_when_result_missing_for_resource(
        self, client: AuthzClient, mock_sdk: Mock
    ) -> None:
        # Result for a different resource id — get_resource returns None
        different_resource = CheckResourcesResult(
            resource=CerbosResource(id="other-id", kind="master_data:platform"),
            actions={"catalog.read": Effect.ALLOW},
        )
        mock_sdk_instance = mock_sdk.return_value.__enter__.return_value
        mock_sdk_instance.check_resources.return_value = CheckResourcesResponse(
            request_id="test-3",
            results=[different_resource],
        )

        result = client.check(
            principal=_make_principal(
                capabilities=["master-data:platform:read"],
                role_codes=["super-admin"],
            ),
            kind="master_data:platform",
            action="catalog.read",
            resource_id="__new__",
        )

        assert result is False

    def test_denies_when_action_not_in_result(
        self, client: AuthzClient, mock_sdk: Mock
    ) -> None:
        # Result exists but doesn't contain the requested action
        mock_sdk_instance = mock_sdk.return_value.__enter__.return_value
        mock_sdk_instance.check_resources.return_value = CheckResourcesResponse(
            request_id="test-4",
            results=[
                CheckResourcesResult(
                    resource=CerbosResource(id="__new__", kind="master_data:platform"),
                    actions={"visitpad.read": Effect.ALLOW},
                )
            ],
        )

        result = client.check(
            principal=_make_principal(
                capabilities=["master-data:platform:read"],
                role_codes=["super-admin"],
            ),
            kind="master_data:platform",
            action="catalog.read",
            resource_id="__new__",
        )

        assert result is False

    def test_propagates_raise_if_failed(
        self, client: AuthzClient, mock_sdk: Mock
    ) -> None:
        from cerbos.sdk.model import CerbosRequestException

        failed_resp = CheckResourcesResponse(
            request_id="test-5",
            status_code=500,
            results=[],
        )
        mock_sdk_instance = mock_sdk.return_value.__enter__.return_value
        mock_sdk_instance.check_resources.return_value = failed_resp

        with pytest.raises(CerbosRequestException):
            client.check(
                principal=_make_principal(),
                kind="master_data:platform",
                action="catalog.read",
                resource_id="__new__",
            )
