"""Resolve inventory master ORM classes for the current :class:`~app.core.catalog_scope.CatalogScope`."""

from __future__ import annotations

from app.core.catalog_scope import CatalogScope
from app.models.inventory.category import (
    InventoryCategoryPublicModel,
    InventoryCategoryTenantModel,
)
from app.models.inventory.hsn_gst import InventoryHsnGstPublicModel, InventoryHsnGstTenantModel
from app.models.inventory.item_type import (
    InventoryItemTypePublicModel,
    InventoryItemTypeTenantModel,
)
from app.models.inventory.storage_condition import (
    InventoryStorageConditionPublicModel,
    InventoryStorageConditionTenantModel,
)
from app.models.inventory.store_type import (
    InventoryStoreTypePublicModel,
    InventoryStoreTypeTenantModel,
)
from app.models.inventory.uom import InventoryUomPublicModel, InventoryUomTenantModel


def inventory_item_type_model(scope: CatalogScope):
    return InventoryItemTypeTenantModel if scope.is_tenant else InventoryItemTypePublicModel


def inventory_category_model(scope: CatalogScope):
    return InventoryCategoryTenantModel if scope.is_tenant else InventoryCategoryPublicModel


def inventory_uom_model(scope: CatalogScope):
    return InventoryUomTenantModel if scope.is_tenant else InventoryUomPublicModel


def inventory_hsn_gst_model(scope: CatalogScope):
    return InventoryHsnGstTenantModel if scope.is_tenant else InventoryHsnGstPublicModel


def inventory_storage_condition_model(scope: CatalogScope):
    return (
        InventoryStorageConditionTenantModel
        if scope.is_tenant
        else InventoryStorageConditionPublicModel
    )


def inventory_store_type_model(scope: CatalogScope):
    return InventoryStoreTypeTenantModel if scope.is_tenant else InventoryStoreTypePublicModel
