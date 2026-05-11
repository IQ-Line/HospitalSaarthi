import { type ReactElement, type ReactNode, useMemo } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { CerbosProvider } from '@cerbos/react';
import type { Principal } from '@cerbos/core';
import { queryClient } from '@/lib/query-client';
import { cerbosClient } from '@/lib/cerbos-client';
import {
  authPrincipalToCerbosPrincipal,
  fetchAuthPrincipal,
} from '@/lib/auth-principal';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

/**
 * Application provider hierarchy (see `docs/architecture/lld/frontend/01-frontend-structure.md` §6.2
 * and ADR-0018):
 *
 * 1. **QueryClientProvider** — TanStack Query cache for server state (API + enriched principal fetch).
 * 2. **CerbosPrincipalBridge → CerbosProvider** — supplies `@cerbos/http` client + Cerbos `Principal`
 *    aligned with User Management (`GET /auth/principal` → `id` / `roles` / `attr`). Optional
 *    `auxData.jwt` when the bearer token looks like a JWT (PDP auxData JWT decode).
 * 3. **Children** — `RouterProvider` and route tree.
 *
 * **Auth session, tenant/branch, and shell permission map** stay in Zustand (`useAuthStore`,
 * `useTenantStore`, `usePermissionsStore`) — no React Context for that state per ADR-0018.
 * Cerbos hooks (`useIsAllowed`, `useCheckResource`, …) are UX-only; APIs and PDP remain authoritative.
 */

const ANONYMOUS_PRINCIPAL: Principal = {
  id: '###ANONYMOUS_USER###',
  roles: ['anonymous'],
};

function isLikelyJwt(token: string): boolean {
  return token.split('.').length === 3;
}

function CerbosPrincipalBridge({ children }: { children: ReactNode }): ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.userId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const tenantId = useTenantStore((s) => s.tenantId);
  const activeBranch = useTenantStore((s) => s.activeBranch);

  const principalQuery = useQuery({
    queryKey: ['auth', 'cerbos-principal', userId, tenantId, activeBranch],
    queryFn: fetchAuthPrincipal,
    enabled: Boolean(isAuthenticated && userId && tenantId),
    select: authPrincipalToCerbosPrincipal,
    staleTime: 30_000,
  });

  const principal = useMemo((): Principal => {
    if (!isAuthenticated || !userId) {
      return ANONYMOUS_PRINCIPAL;
    }
    if (principalQuery.data) {
      return principalQuery.data;
    }
    // Authenticated but principal not yet loaded (or tenant missing): stable id for the client;
    // PDP checks may deny until enrichment succeeds.
    return { id: userId, roles: [], attr: {} };
  }, [isAuthenticated, userId, principalQuery.data]);

  const auxData = useMemo(() => {
    if (!accessToken || !isLikelyJwt(accessToken)) {
      return undefined;
    }
    return { jwt: { token: accessToken } };
  }, [accessToken]);

  return (
    <CerbosProvider client={cerbosClient} principal={principal} auxData={auxData}>
      {children}
    </CerbosProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <CerbosPrincipalBridge>{children}</CerbosPrincipalBridge>
    </QueryClientProvider>
  );
}
