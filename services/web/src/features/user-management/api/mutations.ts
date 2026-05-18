import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  AssignRoleBody,
  Capability,
  CreateRoleBody,
  CreateUserBody,
  ReplaceRoleCapabilitiesBody,
  RoleAssignment,
  UmRole,
  UmUser,
  UpdateRoleBody,
  UpdateUserBody,
} from '../types';
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
      qc.invalidateQueries({ queryKey: userManagementKeys.roleAssignments() }).catch(() => {
        /* best-effort */
      });
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
      qc.invalidateQueries({ queryKey: userManagementKeys.roleAssignments() }).catch(() => {
        /* best-effort */
      });
      qc.invalidateQueries({ queryKey: userManagementKeys.authPrincipal() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleBody) =>
      apiClient<UmRole>(`${BASE}/roles`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userManagementKeys.roleList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useUpdateRole(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRoleBody) =>
      apiClient<UmRole>(`${BASE}/roles/${encodeURIComponent(roleId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (role) => {
      qc.setQueryData(userManagementKeys.roleDetail(roleId), role);
      qc.invalidateQueries({ queryKey: userManagementKeys.roleList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) =>
      apiClient<UmRole>(`${BASE}/roles/${encodeURIComponent(roleId)}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, roleId) => {
      qc.removeQueries({ queryKey: userManagementKeys.roleDetail(roleId) });
      qc.invalidateQueries({ queryKey: userManagementKeys.roleList() }).catch(() => {
        /* best-effort */
      });
      qc.invalidateQueries({ queryKey: userManagementKeys.roleCapabilities(roleId) }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useReplaceRoleCapabilities(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceRoleCapabilitiesBody) =>
      apiClient<Capability[]>(`${BASE}/roles/${encodeURIComponent(roleId)}/capabilities`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (capabilities) => {
      qc.setQueryData(userManagementKeys.roleCapabilities(roleId), capabilities);
    },
  });
}
