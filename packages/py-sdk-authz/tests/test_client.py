"""Async Cerbos wrapper tests — allow/deny + fail-closed on PDP failure."""

from __future__ import annotations

import pytest

from hims_authz.client import AuthzClient
from hims_authz.types import AuthorizationError, CerbosPrincipal


class _FakeCerbos:
    def __init__(self, result: object) -> None:
        self.result = result
        self.calls: list[tuple] = []
        self.closed = False

    async def is_allowed(self, action, principal, resource) -> bool:
        self.calls.append((action, principal, resource))
        if isinstance(self.result, Exception):
            raise self.result
        return self.result  # type: ignore[return-value]

    async def close(self) -> None:
        self.closed = True


def _principal() -> CerbosPrincipal:
    return CerbosPrincipal(
        id="u1",
        roles=("doctor",),
        attr={
            "iq_tenant_id": "tenant-a",
            "capabilities": ["opd:prescription:read"],
            "role_codes": ["doctor"],
        },
    )


def _client(result: object) -> tuple[AuthzClient, _FakeCerbos]:
    client = AuthzClient(cerbos_http_url="http://cerbos:3592")
    fake = _FakeCerbos(result)
    client._client = fake  # inject; bypasses lazy construction
    return client, fake


async def test_allow_returns_true_with_correct_wire_shape() -> None:
    client, fake = _client(True)
    ok = await client.is_allowed(
        _principal(), "opd:prescription", "read", "rx-1", {"iq_tenant_id": "tenant-a"}
    )
    assert ok is True
    action, principal, resource = fake.calls[0]
    assert action == "read"
    assert principal.id == "u1"
    assert list(principal.roles) == ["doctor"]
    assert principal.attr["capabilities"] == ["opd:prescription:read"]
    assert resource.id == "rx-1"
    assert resource.kind == "opd:prescription"
    assert resource.attr == {"iq_tenant_id": "tenant-a"}


async def test_deny_returns_false() -> None:
    client, _ = _client(False)
    ok = await client.is_allowed(
        _principal(), "opd:prescription", "delete", "rx-1", {"iq_tenant_id": "tenant-a"}
    )
    assert ok is False


async def test_pdp_transport_failure_fails_closed() -> None:
    client, _ = _client(RuntimeError("connection refused"))
    with pytest.raises(AuthorizationError):
        await client.is_allowed(
            _principal(), "opd:prescription", "read", "rx-1", {"iq_tenant_id": "tenant-a"}
        )


async def test_assert_reachable_ok_when_pdp_answers() -> None:
    # A DENY decision still means the PDP is reachable and healthy.
    client, _ = _client(False)
    await client.assert_reachable()


async def test_assert_reachable_raises_on_transport_failure() -> None:
    client, _ = _client(ConnectionError("pdp down"))
    with pytest.raises(AuthorizationError):
        await client.assert_reachable()


async def test_aclose_closes_and_clears_client() -> None:
    client, fake = _client(True)
    await client.aclose()
    assert fake.closed is True
    assert client._client is None
