"""Runs on every HTTP request: ``request.state.request_id`` and ``X-Request-ID`` header.

Extend later for correlation logging or forwarded gateway headers (trace ids, tenant id).
"""

from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.request_id = str(uuid.uuid4())
        response = await call_next(request)
        rid = getattr(request.state, "request_id", None)
        if rid:
            response.headers["X-Request-ID"] = rid
        return response
