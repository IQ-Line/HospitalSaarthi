"""Standard error payload + FastAPI exception handlers for Master Data APIs."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.repositories.module_repository import DuplicateModuleKeyError
from app.repositories.permission_repository import DuplicatePermissionKeyError
from app.services.module_service import (
    InvalidParentCycleError,
    MaxTreeDepthError,
    ModuleNotFoundError,
    ParentModuleNotFoundError,
)
from app.services.permission_service import PermissionNotFoundError


class ResourceNotFoundError(Exception):
    """Domain-level 404 with an explicit user message."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def error_payload(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build the envelope ``{"error": {"code", "message", "details"}}``."""
    return {"error": {"code": code, "message": message, "details": details or {}}}


def register_exception_handlers(app: FastAPI) -> None:
    """Register API exception handlers once at app startup."""

    @app.exception_handler(DuplicateModuleKeyError)
    async def _duplicate_key(_request: Request, _exc: DuplicateModuleKeyError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload(
                "CONFLICT",
                "Another active module already uses this name or slug.",
            ),
        )

    @app.exception_handler(DuplicatePermissionKeyError)
    async def _duplicate_permission_key(
        _request: Request,
        _exc: DuplicatePermissionKeyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload(
                "CONFLICT",
                "Another active permission already uses this slug.",
            ),
        )

    @app.exception_handler(ParentModuleNotFoundError)
    async def _missing_parent(_request: Request, _exc: ParentModuleNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=error_payload(
                "BAD_REQUEST",
                "parent_id must reference an existing non-deleted module.",
            ),
        )

    @app.exception_handler(MaxTreeDepthError)
    async def _max_depth(_request: Request, _exc: MaxTreeDepthError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=error_payload(
                "BAD_REQUEST",
                "That parent is already at the deepest allowed nesting level.",
            ),
        )

    @app.exception_handler(InvalidParentCycleError)
    async def _cycle(_request: Request, _exc: InvalidParentCycleError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=error_payload(
                "BAD_REQUEST",
                "That parent_id would create a cycle in the module tree.",
            ),
        )

    @app.exception_handler(ModuleNotFoundError)
    async def _module_missing(_request: Request, _exc: ModuleNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", "No module with this id."),
        )

    @app.exception_handler(PermissionNotFoundError)
    async def _permission_missing(_request: Request, _exc: PermissionNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", "No permission with this id."),
        )

    @app.exception_handler(ResourceNotFoundError)
    async def _resource_not_found(_request: Request, exc: ResourceNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", exc.message),
        )

    @app.exception_handler(IntegrityError)
    async def _integrity_error(_request: Request, exc: IntegrityError) -> JSONResponse:
        text = str(getattr(exc, "orig", exc)).lower()
        if "modules_level_check" in text:
            return JSONResponse(
                status_code=400,
                content=error_payload(
                    "BAD_REQUEST",
                    (
                        "Module depth exceeds database constraint. "
                        "If max depth was changed recently, run `uv run alembic upgrade head`."
                    ),
                ),
            )
        return JSONResponse(
            status_code=400,
            content=error_payload("BAD_REQUEST", "Request violates database constraints."),
        )
