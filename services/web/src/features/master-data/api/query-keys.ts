export const masterDataKeys = {
  all: ['master-data'] as const,

  modules: () => [...masterDataKeys.all, 'modules'] as const,
  moduleDetail: (id: string) => [...masterDataKeys.modules(), id] as const,
  moduleBySlug: (slug: string) => [...masterDataKeys.modules(), 'slug', slug] as const,
  submodules: (parentId: string) => [...masterDataKeys.modules(), parentId, 'submodules'] as const,

  permissions: () => [...masterDataKeys.all, 'permissions'] as const,
  permissionDetail: (id: string) => [...masterDataKeys.permissions(), id] as const,

  systemRoles: () => [...masterDataKeys.all, 'system-roles'] as const,
  systemRoleDetail: (id: string) => [...masterDataKeys.systemRoles(), id] as const,
} as const;
