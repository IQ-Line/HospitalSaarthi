import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AssignRoleBody, CreateUserBody, RoleAssignment, UmUser, UpdateUserBody } from '../types';
import { userManagementKeys } from './keys';

const BASE = '/api/user-management';

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserBody) =>
      apiClient<UmUser>(`${BASE}/users`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userManagementKeys.userList() }).catch(() => {
        /* cache invalidation is best-effort */
      });
    },
  });
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserBody) =>
      apiClient<UmUser>(`${BASE}/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (user) => {
      qc.setQueryData(userManagementKeys.userDetail(userId), user);
      qc.invalidateQueries({ queryKey: userManagementKeys.userList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useDeactivateUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<UmUser>(`${BASE}/users/${encodeURIComponent(userId)}/deactivate`, {
        method: 'POST',
      }),
    onSuccess: (user) => {
      qc.setQueryData(userManagementKeys.userDetail(userId), user);
      qc.invalidateQueries({ queryKey: userManagementKeys.userList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignRoleBody) =>
      apiClient<RoleAssignment>(`${BASE}/role-assignments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userManagementKeys.authPrincipal() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useRevokeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user_id, role_id }: AssignRoleBody) => {
      const q = new URLSearchParams({ user_id, role_id });
      return apiClient<RoleAssignment>(`${BASE}/role-assignments?${q.toString()}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userManagementKeys.authPrincipal() }).catch(() => {
        /* best-effort */
      });
    },
  });
}
