import type { ModuleCategory, PermissionAction } from '../types';

export const masterDataKeys = {
  all: ['master-data'] as const,

  modulesRoot: () => [...masterDataKeys.all, 'modules'] as const,
  navModules: (withPermissions?: boolean, iqTenantId?: string) =>
    [
      ...masterDataKeys.modulesRoot(),
      'nav',
      withPermissions ? 'tree' : 'flat',
      iqTenantId ?? 'global',
    ] as const,
  moduleNavPermissions: (moduleId: string) =>
    [...masterDataKeys.modulesRoot(), 'nav-permissions', moduleId] as const,
  moduleNavPermissionsBatch: (moduleIds: string[]) =>
    [
      ...masterDataKeys.modulesRoot(),
      'nav-permissions-batch',
      [...moduleIds].sort().join(','),
    ] as const,
  modules: (category?: ModuleCategory) =>
    [...masterDataKeys.modulesRoot(), category ?? 'all'] as const,
  moduleDetail: (id: string) => [...masterDataKeys.modules(), id] as const,
  moduleBySlug: (slug: string) => [...masterDataKeys.modules(), 'slug', slug] as const,
  submodules: (parentId: string) => [...masterDataKeys.modules(), parentId, 'submodules'] as const,

  permissionsRoot: () => [...masterDataKeys.all, 'permissions'] as const,
  permissions: (action?: PermissionAction) =>
    [...masterDataKeys.permissionsRoot(), action ?? 'all'] as const,
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

  picklistsRoot: () => [...masterDataKeys.all, 'picklists'] as const,
  picklists: () => [...masterDataKeys.picklistsRoot()] as const,
  picklistValues: (picklistId: string | undefined, limit: number) =>
    [...masterDataKeys.picklistsRoot(), picklistId ?? 'none', limit] as const,
} as const;
