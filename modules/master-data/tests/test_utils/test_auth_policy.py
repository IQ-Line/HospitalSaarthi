"""Unit tests for ``resolve_superadmin_actor`` (audit actor semantics, no synthetic user ids)."""

from __future__ import annotations

import uuid

import jwt
import pytest

from app.core.config import Settings
from app.utils.auth_policy import AuthResolutionError, resolve_superadmin_actor

_JWT_HS256_TEST_SECRET = "a" * 32  # satisfies PyJWT minimum key length for HS256 tests


def _settings(**kwargs: object) -> Settings:
    """Build ``Settings`` with explicit fields (init values override env for those keys)."""
    return Settings(**kwargs)


def test_auth_disabled_yields_no_actor_uuid() -> None:
    s = _settings(auth_disabled=True)
    assert resolve_superadmin_actor(s, None) is None


def test_auth_bypass_yields_no_actor_uuid() -> None:
    s = _settings(auth_bypass=True)
    assert resolve_superadmin_actor(s, None) is None


def test_dev_bearer_match_yields_no_actor_uuid() -> None:
    s = _settings(dev_bearer_token="local-only-secret")
    assert resolve_superadmin_actor(s, "local-only-secret") is None


def test_missing_bearer_raises_when_strict() -> None:
    s = _settings()
    with pytest.raises(AuthResolutionError) as exc:
        resolve_superadmin_actor(s, None)
    assert exc.value.status_code == 401


def test_jwt_sub_becomes_actor_uuid() -> None:
    sub = uuid.uuid4()
    token = jwt.encode(
        {"role": "superadmin", "sub": str(sub)},
        _JWT_HS256_TEST_SECRET,
        algorithm="HS256",
    )
    s = _settings(jwt_secret=_JWT_HS256_TEST_SECRET)
    assert resolve_superadmin_actor(s, token) == sub


def test_jwt_superadmin_without_sub_yields_none() -> None:
    token = jwt.encode({"role": "superadmin"}, _JWT_HS256_TEST_SECRET, algorithm="HS256")
    s = _settings(jwt_secret=_JWT_HS256_TEST_SECRET)
    assert resolve_superadmin_actor(s, token) is None
