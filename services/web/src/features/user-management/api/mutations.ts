import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { refreshAuthorizationContext } from '@/lib/authorization-context';
import { useAuthStore } from '@/stores/auth.store';
import type {
  AppliedRoleTemplate,
  ApplyRoleTemplateBody,
  Capability,
  CreateRoleBody,
  CreateUserBody,
  ReplaceRoleCapabilitiesBody,
  ReplaceUserCapabilitiesBody,
  UmRole,
  UmUser,
  UpdateRoleBody,
  UpdateUserBody,
} from '../types';
import { userManagementKeys } from './keys';

const BASE = '/api/user-management';

function invalidateUserAccessQueries(qc: ReturnType<typeof useQueryClient>, userId: string) {
  qc.invalidateQueries({ queryKey: userManagementKeys.userCapabilities(userId) }).catch(() => {
    /* best-effort */
  });
  qc.invalidateQueries({ queryKey: userManagementKeys.userEffectiveCapabilities(userId) }).catch(() => {
    /* best-effort */
  });
  qc.invalidateQueries({ queryKey: userManagementKeys.userRoleTemplates(userId) }).catch(() => {
    /* best-effort */
  });
}

async function refreshSelfAuthorizationContextIfNeeded(
  qc: ReturnType<typeof useQueryClient>,
  targetUserId: string,
) {
  if (useAuthStore.getState().userId !== targetUserId) {
    return;
  }
  await refreshAuthorizationContext(qc);
}

export type CreateUserMutationInput = {
  body: CreateUserBody;
  /** When set (platform super-admin), creates the user in this tenant via `iq_tenant_id` header. */
  targetTenantId?: string;
};

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, targetTenantId }: CreateUserMutationInput) =>
      apiClient<UmUser>(
        `${BASE}/users`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        targetTenantId ? { tenantIdOverride: targetTenantId } : undefined,
      ),
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

export function useReplaceUserCapabilities(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceUserCapabilitiesBody) =>
      apiClient(`${BASE}/users/${encodeURIComponent(userId)}/capabilities`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      invalidateUserAccessQueries(qc, userId);
      await refreshSelfAuthorizationContextIfNeeded(qc, userId);
    },
  });
}

export function useApplyRoleTemplate(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyRoleTemplateBody) =>
      apiClient<AppliedRoleTemplate>(`${BASE}/users/${encodeURIComponent(userId)}/roles`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      invalidateUserAccessQueries(qc, userId);
      await refreshSelfAuthorizationContextIfNeeded(qc, userId);
    },
  });
}

export function useDetachRoleTemplate(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) =>
      apiClient<AppliedRoleTemplate>(
        `${BASE}/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: async () => {
      invalidateUserAccessQueries(qc, userId);
      await refreshSelfAuthorizationContextIfNeeded(qc, userId);
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
