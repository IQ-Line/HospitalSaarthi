"""HIMS Python authorization PEP.

In-process RS256/JWKS JWT verification + HTTP-first principal enrichment from User
Management + per-resource Cerbos checks, for FastAPI services (opd, master-data). Mirrors
``@hims/ts-sdk-identity`` and ``@hims/ts-sdk-authz`` so one Cerbos policy set governs both
the TS and Python services.
"""

from hims_authz.client import AuthzClient
from hims_authz.dependency import Authz
from hims_authz.enrichment import PrincipalEnricher
from hims_authz.middleware import IdentityGateMiddleware
from hims_authz.types import (
    AuthorizationError,
    AuthzError,
    AuthzSettings,
    CerbosPrincipal,
    IdentityVerificationError,
    PrincipalEnrichmentError,
    VerifiedIdentity,
)
from hims_authz.verify import TokenVerifier

__all__ = [
    "Authz",
    "AuthzClient",
    "AuthzError",
    "AuthzSettings",
    "AuthorizationError",
    "CerbosPrincipal",
    "IdentityGateMiddleware",
    "IdentityVerificationError",
    "PrincipalEnricher",
    "PrincipalEnrichmentError",
    "TokenVerifier",
    "VerifiedIdentity",
]
