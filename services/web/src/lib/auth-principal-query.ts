import { queryOptions } from '@tanstack/react-query';
import { fetchAuthPrincipal } from '@/lib/auth-principal';

export type AuthPrincipalQueryScope = {
  userId: string | null;
  tenantId: string | null;
  activeBranch: string | null;
};

export const authPrincipalQueryKeys = {
  all: ['auth', 'cerbos-principal'] as const,
  detail: ({ userId, tenantId, activeBranch }: AuthPrincipalQueryScope) =>
    [...authPrincipalQueryKeys.all, userId ?? '', tenantId ?? '', activeBranch ?? ''] as const,
};

export function authPrincipalQueryOptions(scope: AuthPrincipalQueryScope) {
  return queryOptions({
    queryKey: authPrincipalQueryKeys.detail(scope),
    queryFn: fetchAuthPrincipal,
    staleTime: 30_000,
  });
}
