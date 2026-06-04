import { queryOptions } from '@tanstack/react-query';
import { fetchAuthPrincipal } from '@/lib/auth-principal';

export type AuthPrincipalQueryScope = {
  userId: string | null;
  tenantId: string | null;
  activeBranch: string | null;
};

/**
 * Shell authorization freshness is **event-driven** (login, logout, tenant switch,
 * self UM mutations, hard refresh when permissions are not loaded, auth scope change).
 * Do not rely on `staleTime` for capability correctness.
 */
export const AUTH_PRINCIPAL_STALE_TIME_MS = Number.POSITIVE_INFINITY;

export const authPrincipalQueryKeys = {
  all: ['auth', 'cerbos-principal'] as const,
  detail: ({ userId, tenantId, activeBranch }: AuthPrincipalQueryScope) =>
    [...authPrincipalQueryKeys.all, userId ?? '', tenantId ?? '', activeBranch ?? ''] as const,
};

export function isSameAuthPrincipalScope(
  a: AuthPrincipalQueryScope,
  b: AuthPrincipalQueryScope,
): boolean {
  return (
    (a.userId ?? '') === (b.userId ?? '') &&
    (a.tenantId ?? '') === (b.tenantId ?? '') &&
    (a.activeBranch ?? '') === (b.activeBranch ?? '')
  );
}

/** Single source of truth for `GET /auth/principal` in React Query (Cerbos bridge reads the same cache). */
export function authPrincipalQueryOptions(scope: AuthPrincipalQueryScope) {
  return queryOptions({
    queryKey: authPrincipalQueryKeys.detail(scope),
    queryFn: fetchAuthPrincipal,
    staleTime: AUTH_PRINCIPAL_STALE_TIME_MS,
  });
}
