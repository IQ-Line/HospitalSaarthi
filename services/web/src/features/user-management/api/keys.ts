export const userManagementKeys = {
  all: ['user-management'] as const,
  capabilities: () => [...userManagementKeys.all, 'capabilities'] as const,
  /** Tenant-filtered runtime capabilities for role composition (`GET /capabilities/assignable`). */
  assignableCapabilities: () => [...userManagementKeys.capabilities(), 'assignable'] as const,
  roles: () => [...userManagementKeys.all, 'roles'] as const,
  roleList: () => [...userManagementKeys.roles(), 'list'] as const,
  roleDetail: (id: string) => [...userManagementKeys.roles(), 'detail', id] as const,
  roleCapabilities: (id: string) => [...userManagementKeys.roles(), 'capabilities', id] as const,
  userAccessRoot: () => [...userManagementKeys.all, 'user-access'] as const,
  users: () => [...userManagementKeys.all, 'users'] as const,
  userList: () => [...userManagementKeys.users(), 'list'] as const,
  userDetail: (id: string) => [...userManagementKeys.users(), 'detail', id] as const,
  userCapabilities: (id: string) => [...userManagementKeys.userAccessRoot(), 'capabilities', id] as const,
  userEffectiveCapabilities: (id: string) =>
    [...userManagementKeys.userAccessRoot(), 'effective-capabilities', id] as const,
  userRoleTemplates: (id: string) => [...userManagementKeys.userAccessRoot(), 'role-templates', id] as const,
  platformDirectory: () => [...userManagementKeys.all, 'platform-directory'] as const,
};
