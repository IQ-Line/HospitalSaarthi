"""HTTP routes for Visitpad — units and unit conversions."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_session,
    get_visitpad_unit_conversion_repository,
    get_visitpad_unit_repository,
)
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad.conversion import VisitpadUnitConversionRepository
from app.repositories.visitpad.unit import VisitpadUnitRepository
from app.schemas.visitpad.platform_import import (
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.schemas.visitpad.unit import (
    VisitpadUnitConversionCreate,
    VisitpadUnitConversionListResponse,
    VisitpadUnitConversionResponse,
    VisitpadUnitConversionSingleResponse,
    VisitpadUnitConversionUpdate,
    VisitpadUnitCreate,
    VisitpadUnitDimension,
    VisitpadUnitListResponse,
    VisitpadUnitResponse,
    VisitpadUnitSingleResponse,
    VisitpadUnitUpdate,
)
from app.services.visitpad.platform_bulk_import import (
    import_visitpad_unit_conversions_from_platform,
    import_visitpad_units_from_platform,
)
from app.services.visitpad.units import (
    create_visitpad_unit,
    create_visitpad_unit_conversion,
    get_visitpad_unit_by_id,
    get_visitpad_unit_conversion_by_id,
    list_visitpad_unit_conversions,
    list_visitpad_units,
    soft_delete_visitpad_unit,
    soft_delete_visitpad_unit_conversion,
    update_visitpad_unit,
    update_visitpad_unit_conversion,
)

units_router = APIRouter(prefix="/visitpad/units", tags=["Visitpad — Units"])
conversions_router = APIRouter(
    prefix="/visitpad/unit-conversions",
    tags=["Visitpad — Unit conversions"],
)


@units_router.get("", response_model=VisitpadUnitListResponse, summary="List units")
def get_visitpad_units(
    repository: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    dimension: Annotated[VisitpadUnitDimension | None, Query()] = None,
) -> VisitpadUnitListResponse:
    rows, total = list_visitpad_units(
        repository,
        search=search,
        dimension=dimension.value if dimension is not None else None,
        limit=limit,
        offset=offset,
    )
    data = [VisitpadUnitResponse.model_validate(r) for r in rows]
    return VisitpadUnitListResponse(data=data, total=total)


@units_router.post(
    "",
    response_model=VisitpadUnitSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create unit",
)
def post_visitpad_unit(
    payload: VisitpadUnitCreate,
    repository: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitSingleResponse:
    row = create_visitpad_unit(repository, payload=payload)
    session.commit()
    return VisitpadUnitSingleResponse(data=VisitpadUnitResponse.model_validate(row))


@units_router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import units from the platform catalog",
)
def post_visitpad_units_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_units_from_platform(
            session,
            scope=repository.scope,
            tenant_repo=repository,
            platform_row_ids=payload.platform_row_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@units_router.get(
    "/{unit_id}",
    response_model=VisitpadUnitSingleResponse,
    summary="Get unit by id",
)
def get_visitpad_unit(
    unit_id: UUID,
    repository: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
) -> VisitpadUnitSingleResponse:
    row = get_visitpad_unit_by_id(repository, unit_id=unit_id)
    if row is None:
        raise ResourceNotFoundError("No unit with this id.")
    return VisitpadUnitSingleResponse(data=VisitpadUnitResponse.model_validate(row))


@units_router.patch(
    "/{unit_id}",
    response_model=VisitpadUnitSingleResponse,
    summary="Update unit",
)
def patch_visitpad_unit(
    unit_id: UUID,
    payload: VisitpadUnitUpdate,
    repository: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    conv_repo: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitSingleResponse:
    row = update_visitpad_unit(
        repository,
        conv_repo,
        unit_id=unit_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No unit with this id.")
    session.commit()
    return VisitpadUnitSingleResponse(data=VisitpadUnitResponse.model_validate(row))


@units_router.delete(
    "/{unit_id}",
    response_model=VisitpadUnitSingleResponse,
    summary="Soft-delete unit",
)
def delete_visitpad_unit(
    unit_id: UUID,
    repository: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    conv_repo: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitSingleResponse:
    row = soft_delete_visitpad_unit(
        repository,
        conv_repo,
        unit_id=unit_id,
    )
    if row is None:
        raise ResourceNotFoundError("No unit with this id.")
    session.commit()
    return VisitpadUnitSingleResponse(data=VisitpadUnitResponse.model_validate(row))


@conversions_router.get(
    "",
    response_model=VisitpadUnitConversionListResponse,
    summary="List unit conversions",
)
def get_visitpad_unit_conversions(
    repository: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    from_unit_code: Annotated[str | None, Query()] = None,
) -> VisitpadUnitConversionListResponse:
    rows, total = list_visitpad_unit_conversions(
        repository,
        search=search,
        from_unit_code=from_unit_code,
        limit=limit,
        offset=offset,
    )
    data = [VisitpadUnitConversionResponse.model_validate(r) for r in rows]
    return VisitpadUnitConversionListResponse(data=data, total=total)


@conversions_router.post(
    "",
    response_model=VisitpadUnitConversionSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create unit conversion",
)
def post_visitpad_unit_conversion(
    payload: VisitpadUnitConversionCreate,
    unit_repo: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    conv_repo: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitConversionSingleResponse:
    row = create_visitpad_unit_conversion(
        unit_repo,
        conv_repo,
        payload=payload,
    )
    session.commit()
    data = VisitpadUnitConversionResponse.model_validate(row)
    return VisitpadUnitConversionSingleResponse(data=data)


@conversions_router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import unit conversions from the platform catalog",
)
def post_visitpad_unit_conversions_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    unit_repo: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    conv_repo: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_unit_conversions_from_platform(
            session,
            scope=conv_repo.scope,
            unit_repo=unit_repo,
            conv_repo=conv_repo,
            platform_row_ids=payload.platform_row_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@conversions_router.get(
    "/{conversion_id}",
    response_model=VisitpadUnitConversionSingleResponse,
    summary="Get conversion by id",
)
def get_visitpad_unit_conversion(
    conversion_id: UUID,
    repository: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
) -> VisitpadUnitConversionSingleResponse:
    row = get_visitpad_unit_conversion_by_id(
        repository,
        conversion_id=conversion_id,
    )
    if row is None:
        raise ResourceNotFoundError("No unit conversion with this id.")
    data = VisitpadUnitConversionResponse.model_validate(row)
    return VisitpadUnitConversionSingleResponse(data=data)


@conversions_router.patch(
    "/{conversion_id}",
    response_model=VisitpadUnitConversionSingleResponse,
    summary="Update unit conversion",
)
def patch_visitpad_unit_conversion(
    conversion_id: UUID,
    payload: VisitpadUnitConversionUpdate,
    unit_repo: Annotated[VisitpadUnitRepository, Depends(get_visitpad_unit_repository)],
    conv_repo: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitConversionSingleResponse:
    row = update_visitpad_unit_conversion(
        unit_repo,
        conv_repo,
        conversion_id=conversion_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No unit conversion with this id.")
    session.commit()
    data = VisitpadUnitConversionResponse.model_validate(row)
    return VisitpadUnitConversionSingleResponse(data=data)


@conversions_router.delete(
    "/{conversion_id}",
    response_model=VisitpadUnitConversionSingleResponse,
    summary="Soft-delete unit conversion",
)
def delete_visitpad_unit_conversion(
    conversion_id: UUID,
    repository: Annotated[
        VisitpadUnitConversionRepository,
        Depends(get_visitpad_unit_conversion_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitConversionSingleResponse:
    row = soft_delete_visitpad_unit_conversion(
        repository,
        conversion_id=conversion_id,
    )
    if row is None:
        raise ResourceNotFoundError("No unit conversion with this id.")
    session.commit()
    data = VisitpadUnitConversionResponse.model_validate(row)
    return VisitpadUnitConversionSingleResponse(data=data)
