"""HTTP routes for Inventory master catalogs."""

from fastapi import APIRouter

from app.api.v1.inventory.categories import router as categories_router
from app.api.v1.inventory.hsn_gst import router as hsn_gst_router
from app.api.v1.inventory.item_types import router as item_types_router
from app.api.v1.inventory.storage_conditions import router as storage_conditions_router
from app.api.v1.inventory.store_types import router as store_types_router
from app.api.v1.inventory.uoms import router as uoms_router

inventory_router = APIRouter()
inventory_router.include_router(item_types_router)
inventory_router.include_router(categories_router)
inventory_router.include_router(uoms_router)
inventory_router.include_router(hsn_gst_router)
inventory_router.include_router(storage_conditions_router)
inventory_router.include_router(store_types_router)
