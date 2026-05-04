from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
