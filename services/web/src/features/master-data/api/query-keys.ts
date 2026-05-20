import type { ModuleCategory, PermissionAction } from '../types';

export const masterDataKeys = {
  all: ['master-data'] as const,

  modulesRoot: () => [...masterDataKeys.all, 'modules'] as const,
  /** Platform registry in `global_master` — omit `iq_tenant_id` when fetching. */
  globalModules: () => [...masterDataKeys.modulesRoot(), 'global-platform'] as const,
  navModules: () => [...masterDataKeys.modulesRoot(), 'nav'] as const,
  modules: (category?: ModuleCategory) =>
    [...masterDataKeys.modulesRoot(), category ?? 'all'] as const,
  moduleDetail: (id: string) => [...masterDataKeys.modules(), id] as const,
  moduleBySlug: (slug: string) => [...masterDataKeys.modules(), 'slug', slug] as const,
  submodules: (parentId: string) => [...masterDataKeys.modules(), parentId, 'submodules'] as const,

  permissionsRoot: () => [...masterDataKeys.all, 'permissions'] as const,
  permissions: (action?: PermissionAction, globalCatalog?: boolean) =>
    [
      ...masterDataKeys.permissionsRoot(),
      action ?? 'all',
      globalCatalog ? 'global' : 'tenant',
    ] as const,
  permissionDetail: (id: string) => [...masterDataKeys.permissions(), id] as const,

  systemRolesRoot: () => [...masterDataKeys.all, 'system-roles'] as const,
  systemRoles: (isTemplate?: boolean, iqTenantId?: string) =>
    [
      ...masterDataKeys.systemRolesRoot(),
      isTemplate === undefined ? 'all' : isTemplate ? 'template' : 'non-template',
      iqTenantId ?? 'global',
    ] as const,
  systemRoleDetail: (id: string) => [...masterDataKeys.systemRoles(), id] as const,

  modulePermissionsRoot: () => [...masterDataKeys.all, 'module-permissions'] as const,
  modulePermissions: (
    moduleId?: string,
    permissionId?: string,
    limit?: number,
    offset?: number,
  ) =>
    [
      ...masterDataKeys.modulePermissionsRoot(),
      moduleId ?? 'all-modules',
      permissionId ?? 'all-permissions',
      limit ?? 50,
      offset ?? 0,
    ] as const,
  modulePermissionDetail: (id: string) =>
    [...masterDataKeys.modulePermissionsRoot(), id] as const,

  departmentsRoot: () => [...masterDataKeys.all, 'departments'] as const,
  departments: (type?: string, iqTenantId?: string) =>
    [...masterDataKeys.departmentsRoot(), type ?? 'all', iqTenantId ?? 'global'] as const,
} as const;
