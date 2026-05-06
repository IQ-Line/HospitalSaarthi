"""Service metadata (no sensitive configuration)."""

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["Diagnostics"])


@router.get("/meta", summary="Service metadata")
def get_meta() -> dict:
    """Build stamp and API prefix for operators and smoke tests."""
    s = get_settings()
    return {
        "service": "hims-master-data",
        "api_prefix": s.api_prefix,
    }
