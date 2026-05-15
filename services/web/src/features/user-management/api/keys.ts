export const userManagementKeys = {
  all: ['user-management'] as const,
  capabilities: () => [...userManagementKeys.all, 'capabilities'] as const,
  roles: () => [...userManagementKeys.all, 'roles'] as const,
  roleList: () => [...userManagementKeys.roles(), 'list'] as const,
  roleDetail: (id: string) => [...userManagementKeys.roles(), 'detail', id] as const,
  roleCapabilities: (id: string) => [...userManagementKeys.roles(), 'capabilities', id] as const,
  roleAssignments: (filter?: { userId?: string; roleId?: string }) =>
    [...userManagementKeys.all, 'role-assignments', filter?.userId ?? '', filter?.roleId ?? ''] as const,
  users: () => [...userManagementKeys.all, 'users'] as const,
  userList: () => [...userManagementKeys.users(), 'list'] as const,
  userDetail: (id: string) => [...userManagementKeys.users(), 'detail', id] as const,
  /** Optional SPA snapshot of `GET /auth/principal` (role codes for the signed-in user). */
  authPrincipal: () => [...userManagementKeys.all, 'auth-principal'] as const,
};
