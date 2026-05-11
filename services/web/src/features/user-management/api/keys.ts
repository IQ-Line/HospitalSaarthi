export const userManagementKeys = {
  all: ['user-management'] as const,
  users: () => [...userManagementKeys.all, 'users'] as const,
  userList: () => [...userManagementKeys.users(), 'list'] as const,
  userDetail: (id: string) => [...userManagementKeys.users(), 'detail', id] as const,
  /** Optional SPA snapshot of `GET /auth/principal` (role codes for the signed-in user). */
  authPrincipal: () => [...userManagementKeys.all, 'auth-principal'] as const,
};
