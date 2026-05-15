import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  authPrincipalQueryOptions,
  type AuthPrincipalQueryScope,
} from '@/lib/auth-principal-query';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import type {
  AppliedRoleTemplate,
  Capability,
  UmRole,
  UmUser,
  UserCapabilitiesSnapshot,
  UserEffectiveCapabilities,
} from '../types';
import { userManagementKeys } from './keys';

const BASE = '/api/user-management';

export function userListOptions() {
  return queryOptions({
    queryKey: userManagementKeys.userList(),
    queryFn: () => apiClient<UmUser[]>(`${BASE}/users`, { method: 'GET' }),
  });
}

export function userDetailOptions(userId: string) {
  return queryOptions({
    queryKey: userManagementKeys.userDetail(userId),
    queryFn: () => apiClient<UmUser>(`${BASE}/users/${encodeURIComponent(userId)}`, { method: 'GET' }),
  });
}

export function authPrincipalSnapshotOptions(scope: AuthPrincipalQueryScope) {
  return authPrincipalQueryOptions(scope);
}

export function capabilityListOptions() {
  return queryOptions({
    queryKey: userManagementKeys.capabilities(),
    queryFn: () => apiClient<Capability[]>(`${BASE}/capabilities`, { method: 'GET' }),
  });
}

export function roleListOptions() {
  return queryOptions({
    queryKey: userManagementKeys.roleList(),
    queryFn: () => apiClient<UmRole[]>(`${BASE}/roles`, { method: 'GET' }),
  });
}

export function roleCapabilitiesOptions(roleId: string) {
  return queryOptions({
    queryKey: userManagementKeys.roleCapabilities(roleId),
    queryFn: () =>
      apiClient<Capability[]>(`${BASE}/roles/${encodeURIComponent(roleId)}/capabilities`, {
        method: 'GET',
      }),
  });
}

export function userCapabilitiesOptions(userId: string) {
  return queryOptions({
    queryKey: userManagementKeys.userCapabilities(userId),
    queryFn: () =>
      apiClient<UserCapabilitiesSnapshot>(`${BASE}/users/${encodeURIComponent(userId)}/capabilities`, {
        method: 'GET',
      }),
  });
}

export function userEffectiveCapabilitiesOptions(userId: string) {
  return queryOptions({
    queryKey: userManagementKeys.userEffectiveCapabilities(userId),
    queryFn: () =>
      apiClient<UserEffectiveCapabilities>(
        `${BASE}/users/${encodeURIComponent(userId)}/effective-capabilities`,
        {
          method: 'GET',
        },
      ),
  });
}

export function userRoleTemplatesOptions(userId: string) {
  return queryOptions({
    queryKey: userManagementKeys.userRoleTemplates(userId),
    queryFn: () =>
      apiClient<AppliedRoleTemplate[]>(`${BASE}/users/${encodeURIComponent(userId)}/roles`, {
        method: 'GET',
      }),
  });
}

export function useUserListSuspense() {
  return useSuspenseQuery(userListOptions());
}

export function useUserDetailSuspense(userId: string) {
  return useSuspenseQuery(userDetailOptions(userId));
}

export function useCapabilitiesSuspense() {
  return useSuspenseQuery(capabilityListOptions());
}

export function useRolesSuspense() {
  return useSuspenseQuery(roleListOptions());
}

export function useRoleCapabilities(roleId: string, enabled: boolean) {
  return useQuery({
    ...roleCapabilitiesOptions(roleId),
    enabled: enabled && roleId.length > 0,
  });
}

export function useUserCapabilities(userId: string, enabled: boolean) {
  return useQuery({
    ...userCapabilitiesOptions(userId),
    enabled: enabled && userId.length > 0,
  });
}

export function useUserEffectiveCapabilities(userId: string, enabled: boolean) {
  return useQuery({
    ...userEffectiveCapabilitiesOptions(userId),
    enabled: enabled && userId.length > 0,
  });
}

export function useUserRoleTemplates(userId: string, enabled: boolean) {
  return useQuery({
    ...userRoleTemplatesOptions(userId),
    enabled: enabled && userId.length > 0,
  });
}

/** Cerbos principal snapshot for the active session (used to show role codes on your own profile). */
export function useAuthPrincipalSnapshot(enabled: boolean) {
  const userId = useAuthStore((s) => s.userId);
  const tenantId = useTenantStore((s) => s.tenantId);
  const activeBranch = useTenantStore((s) => s.activeBranch);

  return useQuery({
    ...authPrincipalSnapshotOptions({ userId, tenantId, activeBranch }),
    enabled: enabled && Boolean(userId && tenantId),
  });
}
