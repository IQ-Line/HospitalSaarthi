import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { fetchAuthPrincipal } from '@/lib/auth-principal';
import type { UmUser } from '../types';
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

export function useUserListSuspense() {
  return useSuspenseQuery(userListOptions());
}

export function useUserDetailSuspense(userId: string) {
  return useSuspenseQuery(userDetailOptions(userId));
}

/** Cerbos principal snapshot for the active session (used to show role codes on your own profile). */
export function useAuthPrincipalSnapshot(enabled: boolean) {
  return useQuery({
    ...authPrincipalSnapshotOptions(),
    enabled,
  });
}
