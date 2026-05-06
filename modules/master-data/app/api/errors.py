"""Standard error JSON for HTTP APIs (``02-api-contracts.md``, OpenAPI ``ErrorResponse``)."""

from typing import Any


def error_payload(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build the envelope ``{"error": {"code", "message", "details"}}``."""
    return {"error": {"code": code, "message": message, "details": details or {}}}
