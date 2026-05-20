"""Standard error payload + FastAPI exception handlers for Master Data APIs."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.repositories.department_repository import DuplicateDepartmentKeyError
from app.repositories.module_permission_repository import DuplicateModulePermissionKeyError
from app.repositories.module_repository import DuplicateModuleKeyError
from app.repositories.permission_repository import DuplicatePermissionKeyError
from app.repositories.system_role_repository import DuplicateSystemRoleKeyError
from app.repositories.visitpad.integrity import DuplicateVisitpadCatalogKeyError
from app.repositories.visitpad.conversion import (
    DuplicateVisitpadUnitConversionKeyError,
)
from app.repositories.visitpad.unit import DuplicateVisitpadUnitKeyError
from app.services.module_permission_service import (
    InvalidModulePermissionReferenceError,
    ModulePermissionNotFoundError,
)
from app.services.module_service import (
    InvalidParentCycleError,
    MaxTreeDepthError,
    ModuleNotFoundError,
    ParentModuleNotFoundError,
)
from app.services.department_service import DepartmentNotFoundError
from app.services.permission_service import PermissionNotFoundError
from app.services.system_role_service import SystemRoleNotFoundError
from app.services.visitpad.units import (
    InvalidVisitpadUnitConversionError,
    VisitpadUnitBlockedByActiveConversionsError,
)
from app.services.visitpad.vitals import InvalidVitalRangeError


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

    @app.exception_handler(DuplicateDepartmentKeyError)
    async def _duplicate_department_key(
        _request: Request,
        _exc: DuplicateDepartmentKeyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload(
                "CONFLICT",
                "Another active department already uses this code.",
            ),
        )

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

    @app.exception_handler(DuplicateSystemRoleKeyError)
    async def _duplicate_system_role_key(
        _request: Request,
        _exc: DuplicateSystemRoleKeyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload(
                "CONFLICT",
                "Another active system role already uses this slug.",
            ),
        )

    @app.exception_handler(DuplicateModulePermissionKeyError)
    async def _duplicate_module_permission_key(
        _request: Request,
        _exc: DuplicateModulePermissionKeyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload(
                "CONFLICT",
                (
                    "Another active link already uses this slug or the same module "
                    "and permission pair."
                ),
            ),
        )

    @app.exception_handler(InvalidModulePermissionReferenceError)
    async def _invalid_mp_reference(
        _request: Request,
        exc: InvalidModulePermissionReferenceError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=error_payload("BAD_REQUEST", exc.message),
        )

    @app.exception_handler(ModulePermissionNotFoundError)
    async def _module_permission_missing(
        _request: Request,
        _exc: ModulePermissionNotFoundError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload(
                "NOT_FOUND",
                "No module-permission link with this id.",
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

    @app.exception_handler(DepartmentNotFoundError)
    async def _department_missing(
        _request: Request,
        _exc: DepartmentNotFoundError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", "No department with this id."),
        )

    @app.exception_handler(PermissionNotFoundError)
    async def _permission_missing(_request: Request, _exc: PermissionNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", "No permission with this id."),
        )

    @app.exception_handler(SystemRoleNotFoundError)
    async def _system_role_missing(
        _request: Request,
        _exc: SystemRoleNotFoundError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", "No system role with this id."),
        )

    @app.exception_handler(ResourceNotFoundError)
    async def _resource_not_found(_request: Request, exc: ResourceNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", exc.message),
        )

    @app.exception_handler(DuplicateVisitpadUnitKeyError)
    async def _duplicate_visitpad_unit(
        _request: Request,
        _exc: DuplicateVisitpadUnitKeyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload(
                "CONFLICT",
                "Another active unit already uses this code for this tenant.",
            ),
        )

    @app.exception_handler(DuplicateVisitpadUnitConversionKeyError)
    async def _duplicate_visitpad_conversion(
        _request: Request,
        _exc: DuplicateVisitpadUnitConversionKeyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload(
                "CONFLICT",
                "Another active conversion already exists for this from/to pair.",
            ),
        )

    @app.exception_handler(InvalidVisitpadUnitConversionError)
    async def _invalid_visitpad_conversion(
        _request: Request,
        exc: InvalidVisitpadUnitConversionError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=error_payload("BAD_REQUEST", exc.message),
        )

    @app.exception_handler(VisitpadUnitBlockedByActiveConversionsError)
    async def _visitpad_unit_blocked_by_conversions(
        _request: Request,
        exc: VisitpadUnitBlockedByActiveConversionsError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload("CONFLICT", exc.message),
        )

    @app.exception_handler(DuplicateVisitpadCatalogKeyError)
    async def _duplicate_visitpad_catalog(
        _request: Request,
        exc: DuplicateVisitpadCatalogKeyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=error_payload("CONFLICT", exc.message),
        )

    @app.exception_handler(InvalidVitalRangeError)
    async def _invalid_vital_range(_request: Request, exc: InvalidVitalRangeError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=error_payload("BAD_REQUEST", exc.message),
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
