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
import { userTenantApiContext, userTenantScopeKey } from '../lib/user-tenant-scope';
import { userManagementKeys } from './keys';

const BASE = '/api/user-management';

function invalidateUserAccessQueries(
  qc: ReturnType<typeof useQueryClient>,
  userId: string,
  tenantScope?: string | null,
) {
  const scopeKey = userTenantScopeKey(tenantScope);
  qc.invalidateQueries({ queryKey: userManagementKeys.userCapabilities(userId, scopeKey) }).catch(() => {
    /* best-effort */
  });
  qc.invalidateQueries({
    queryKey: userManagementKeys.userEffectiveCapabilities(userId, scopeKey),
  }).catch(() => {
    /* best-effort */
  });
  qc.invalidateQueries({ queryKey: userManagementKeys.userRoleTemplates(userId, scopeKey) }).catch(() => {
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

export function useUpdateUser(userId: string, tenantScope?: string | null) {
  const qc = useQueryClient();
  const scopeKey = userTenantScopeKey(tenantScope);
  return useMutation({
    mutationFn: (body: UpdateUserBody) =>
      apiClient<UmUser>(
        `${BASE}/users/${encodeURIComponent(userId)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: (user) => {
      qc.setQueryData(userManagementKeys.userDetail(userId, scopeKey), user);
      qc.invalidateQueries({ queryKey: userManagementKeys.userList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useDeactivateUser(userId: string, tenantScope?: string | null) {
  const qc = useQueryClient();
  const scopeKey = userTenantScopeKey(tenantScope);
  return useMutation({
    mutationFn: () =>
      apiClient<UmUser>(
        `${BASE}/users/${encodeURIComponent(userId)}/deactivate`,
        { method: 'POST' },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: (user) => {
      qc.setQueryData(userManagementKeys.userDetail(userId, scopeKey), user);
      qc.invalidateQueries({ queryKey: userManagementKeys.userList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useActivateUser(userId: string, tenantScope?: string | null) {
  const qc = useQueryClient();
  const scopeKey = userTenantScopeKey(tenantScope);
  return useMutation({
    mutationFn: () =>
      apiClient<UmUser>(
        `${BASE}/users/${encodeURIComponent(userId)}/activate`,
        { method: 'POST' },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: (user) => {
      qc.setQueryData(userManagementKeys.userDetail(userId, scopeKey), user);
      qc.invalidateQueries({ queryKey: userManagementKeys.userList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useReplaceUserCapabilities(userId: string, tenantScope?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceUserCapabilitiesBody) =>
      apiClient(
        `${BASE}/users/${encodeURIComponent(userId)}/capabilities`,
        { method: 'PUT', body: JSON.stringify(body) },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: async () => {
      invalidateUserAccessQueries(qc, userId, tenantScope);
      await refreshSelfAuthorizationContextIfNeeded(qc, userId);
    },
  });
}

export function useApplyRoleTemplate(userId: string, tenantScope?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyRoleTemplateBody) =>
      apiClient<AppliedRoleTemplate>(
        `${BASE}/users/${encodeURIComponent(userId)}/roles`,
        { method: 'POST', body: JSON.stringify(body) },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: async () => {
      invalidateUserAccessQueries(qc, userId, tenantScope);
      await refreshSelfAuthorizationContextIfNeeded(qc, userId);
    },
  });
}

export function useDetachRoleTemplate(userId: string, tenantScope?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) =>
      apiClient<AppliedRoleTemplate>(
        `${BASE}/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
        { method: 'DELETE' },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: async () => {
      invalidateUserAccessQueries(qc, userId, tenantScope);
      await refreshSelfAuthorizationContextIfNeeded(qc, userId);
    },
  });
}

export function useCreateRole(tenantScope?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleBody) =>
      apiClient<UmRole>(
        `${BASE}/roles`,
        { method: 'POST', body: JSON.stringify(body) },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userManagementKeys.roleList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useUpdateRole(roleId: string, tenantScope?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRoleBody) =>
      apiClient<UmRole>(
        `${BASE}/roles/${encodeURIComponent(roleId)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        userTenantApiContext(tenantScope),
      ),
    onSuccess: (role) => {
      qc.setQueryData(userManagementKeys.roleDetail(roleId), role);
      qc.invalidateQueries({ queryKey: userManagementKeys.roleList() }).catch(() => {
        /* best-effort */
      });
    },
  });
}

export function useDeleteRole(tenantScope?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) =>
      apiClient<UmRole>(
        `${BASE}/roles/${encodeURIComponent(roleId)}`,
        { method: 'DELETE' },
        userTenantApiContext(tenantScope),
      ),
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
