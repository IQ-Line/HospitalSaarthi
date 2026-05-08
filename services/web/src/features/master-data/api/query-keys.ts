import type { ModuleCategory } from '../types';

export const masterDataKeys = {
  all: ['master-data'] as const,

  modulesRoot: () => [...masterDataKeys.all, 'modules'] as const,
  modules: (category?: ModuleCategory) =>
    [...masterDataKeys.modulesRoot(), category ?? 'all'] as const,
  moduleDetail: (id: string) => [...masterDataKeys.modules(), id] as const,
  moduleBySlug: (slug: string) => [...masterDataKeys.modules(), 'slug', slug] as const,
  submodules: (parentId: string) => [...masterDataKeys.modules(), parentId, 'submodules'] as const,

  permissions: () => [...masterDataKeys.all, 'permissions'] as const,
  permissionDetail: (id: string) => [...masterDataKeys.permissions(), id] as const,

  systemRoles: () => [...masterDataKeys.all, 'system-roles'] as const,
  systemRoleDetail: (id: string) => [...masterDataKeys.systemRoles(), id] as const,

  modulePermissionsRoot: () => [...masterDataKeys.all, 'module-permissions'] as const,
  modulePermissions: (
    moduleId?: string,
    permissionId?: string,
    limit?: number,
    offset?: number,
  ) =>
    [
      ...masterDataKeys.all,
      'module-permissions',
      moduleId ?? 'all-modules',
      permissionId ?? 'all-permissions',
      limit ?? 50,
      offset ?? 0,
    ] as const,
  modulePermissionDetail: (id: string) =>
    [...masterDataKeys.all, 'module-permissions', id] as const,
} as const;
