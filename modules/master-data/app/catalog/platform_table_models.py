"""Resolve platform catalog ORM classes for :class:`~app.core.catalog_scope.CatalogScope`."""

from __future__ import annotations

from app.core.catalog_scope import CatalogScope
from app.models.department import DepartmentPublicModel, DepartmentTenantModel
from app.models.module import ModulePublicModel, ModuleTenantModel
from app.models.module_permission import ModulePermissionPublicModel, ModulePermissionTenantModel
from app.models.permission import PermissionPublicModel, PermissionTenantModel
from app.models.system_role import SystemRolePublicModel, SystemRoleTenantModel


def department_model(scope: CatalogScope):
    return DepartmentTenantModel if scope.is_tenant else DepartmentPublicModel


def module_model(scope: CatalogScope):
    return ModuleTenantModel if scope.is_tenant else ModulePublicModel


def permission_model(scope: CatalogScope):
    return PermissionTenantModel if scope.is_tenant else PermissionPublicModel


def system_role_model(scope: CatalogScope):
    return SystemRoleTenantModel if scope.is_tenant else SystemRolePublicModel


def module_permission_model(scope: CatalogScope):
    return ModulePermissionTenantModel if scope.is_tenant else ModulePermissionPublicModel
