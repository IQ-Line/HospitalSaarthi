"""Shared-secret gate for internal (service-to-service) routes.

Master Data's identity gate verifies a user JWT on every non-public route. Internal routes are
called by other services with NO end-user token, so they are added to the gate's public prefixes
(see ``app.main``) and self-gate HERE instead: a shared secret in the ``x-master-data-internal-key``
header, compared constant-time to ``MASTER_DATA_INTERNAL_API_KEY``. An unset key disables the route
(503) — it is never open, mirroring the fail-closed posture of the identity gate.
"""

from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.core.config import get_settings

INTERNAL_API_KEY_HEADER = "x-master-data-internal-key"


def require_internal_api_key(
    x_master_data_internal_key: Annotated[str | None, Header()] = None,
) -> None:
    """Reject unless the request carries the correct S2S shared secret.

    503 when no key is configured (route disabled / fail-closed); 401 when the header is
    missing or does not match.
    """
    expected = get_settings().internal_api_key.strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal API key not configured; internal routes are disabled.",
        )
    provided = (x_master_data_internal_key or "").strip()
    # Compare bytes: hmac.compare_digest raises TypeError on non-ASCII str args, which would surface
    # as a 500 instead of a clean 401 for a garbage (non-ASCII) header.
    if not provided or not hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Missing or invalid {INTERNAL_API_KEY_HEADER}.",
        )
