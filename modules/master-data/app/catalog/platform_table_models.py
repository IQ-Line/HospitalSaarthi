"""Resolve platform catalog ORM classes for :class:`~app.core.catalog_scope.CatalogScope`."""

from __future__ import annotations

from app.core.catalog_scope import CatalogScope
from app.models.module import ModulePublicModel, ModuleTenantModel
from app.models.module_permission import ModulePermissionPublicModel, ModulePermissionTenantModel
from app.models.permission import PermissionPublicModel, PermissionTenantModel
from app.models.picklist import PicklistPublicModel
from app.models.picklist_value import PicklistValuePublicModel
from app.models.system_role import SystemRolePublicModel, SystemRoleTenantModel


def module_model(scope: CatalogScope):
    return ModuleTenantModel if scope.is_tenant else ModulePublicModel


def permission_model(scope: CatalogScope):
    return PermissionTenantModel if scope.is_tenant else PermissionPublicModel


def system_role_model(scope: CatalogScope):
    return SystemRoleTenantModel if scope.is_tenant else SystemRolePublicModel


def module_permission_model(scope: CatalogScope):
    return ModulePermissionTenantModel if scope.is_tenant else ModulePermissionPublicModel


def picklist_model(_scope: CatalogScope):
    """Picklist domains are platform-global only (``global_master``)."""
    return PicklistPublicModel


def picklist_value_model(_scope: CatalogScope):
    """Picklist values are platform-global only (``global_master``)."""
    return PicklistValuePublicModel
