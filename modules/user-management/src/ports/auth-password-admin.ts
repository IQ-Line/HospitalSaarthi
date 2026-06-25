/** Admin password operations via better-auth server API (implemented in user-management-svc). */
export interface AuthPasswordAdminPort {
  setUserPassword(authUserId: string, newPassword: string): Promise<void>;
  revokeUserSessions(authUserId: string): Promise<void>;
}
