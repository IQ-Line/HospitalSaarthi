import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { fetchAuthPrincipal } from '@/lib/auth-principal';
import type { Capability, RoleAssignment, UmRole, UmUser } from '../types';
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

export function authPrincipalSnapshotOptions() {
  return queryOptions({
    queryKey: userManagementKeys.authPrincipal(),
    queryFn: () => fetchAuthPrincipal(),
    staleTime: 30_000,
  });
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
    enabled: roleId.length > 0,
  });
}

export function roleAssignmentsOptions(filter?: { userId?: string; roleId?: string }) {
  const q = new URLSearchParams();
  if (filter?.userId) q.set('user_id', filter.userId);
  if (filter?.roleId) q.set('role_id', filter.roleId);
  const suffix = q.size > 0 ? `?${q.toString()}` : '';
  return queryOptions({
    queryKey: userManagementKeys.roleAssignments(filter),
    queryFn: () => apiClient<RoleAssignment[]>(`${BASE}/role-assignments${suffix}`, { method: 'GET' }),
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

export function useRoleAssignments(filter?: { userId?: string; roleId?: string }) {
  return useQuery(roleAssignmentsOptions(filter));
}

/** Cerbos principal snapshot for the active session (used to show role codes on your own profile). */
export function useAuthPrincipalSnapshot(enabled: boolean) {
  return useQuery({
    ...authPrincipalSnapshotOptions(),
    enabled,
  });
}
