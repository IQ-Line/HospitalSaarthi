import { useEffect, useRef } from 'react';
import {
  createFileRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import {
  isAuthorizationHydratedForScope,
  refreshAuthorizationContext,
} from '@/lib/authorization-context';
import type { RouterContext } from '@/routes/__root';
import {
  isSameAuthPrincipalScope,
  resolveAuthPrincipalQueryScope,
} from '@/lib/auth-principal-query';
import { queryClient } from '@/lib/query-client';
import { fetchAuthMe } from '@/lib/auth-me';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

const EMPTY_CAPABILITY_RETRY_MAX = 3;
const EMPTY_CAPABILITY_RETRY_INTERVAL_MS = 3000;

type LayoutWorkScope = {
  userId: string | null;
  tenantId: string | null;
  activeBranch: string | null;
};

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }: { context: RouterContext; location: { pathname: string } }) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
    await refreshAuthorizationContext(context.queryClient);

    const onChangePassword = location.pathname === '/change-password';
    if (!onChangePassword) {
      const { mustChangePassword } = useAuthStore.getState();
      if (mustChangePassword === true) {
        throw redirect({ to: '/change-password' });
      }
      if (mustChangePassword === null) {
        try {
          const profile = await fetchAuthMe();
          if (profile.must_change_password === true) {
            throw redirect({ to: '/change-password' });
          }
        } catch (err) {
          if (err && typeof err === 'object' && 'to' in err) {
            throw err;
          }
          /* auth/me may fail transiently; allow shell to load */
        }
      }
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const displayName = useAuthStore((s) => s.displayName);
  const userId = useAuthStore((s) => s.userId);
  const homeTenantId = useTenantStore((s) => s.homeTenantId);
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantName = useTenantStore((s) => s.tenantName);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const hasEmptyFallback = isLoaded && capabilityKeys.size === 0;

  /** Tracks active working tenant (facility) + branch — not principal home scope. */
  const lastLayoutWorkScopeRef = useRef<LayoutWorkScope | null>(null);

  useEffect(() => {
    const principalScope = resolveAuthPrincipalQueryScope({
      userId,
      homeTenantId,
      activeTenantId: tenantId,
      activeBranch,
    });
    const workScope: LayoutWorkScope = { userId, tenantId, activeBranch };
    const workChanged =
      lastLayoutWorkScopeRef.current === null ||
      !isSameAuthPrincipalScope(lastLayoutWorkScopeRef.current, workScope);

    const principalReady = isAuthorizationHydratedForScope(principalScope);
    // Principal ready + same facility/branch → nothing to do. Facility change still
    // runs refresh so active-tenant module registration can bootstrap.
    if (principalReady && !workChanged) {
      return;
    }

    if (isLoaded && !workChanged) {
      return;
    }

    let cancelled = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setInterval> | undefined;

    const hydrate = async () => {
      const hadLoaded = usePermissionsStore.getState().isLoaded;
      try {
        await refreshAuthorizationContext(queryClient);
      } catch {
        // Never blank an already-hydrated shell on a facility switch race / abort.
        if (!cancelled && !hadLoaded) {
          usePermissionsStore.getState().clearPermissions();
        }
      }
    };

    void hydrate();
    lastLayoutWorkScopeRef.current = workScope;

    if (hasEmptyFallback) {
      retryTimer = setInterval(() => {
        if (cancelled || retryCount >= EMPTY_CAPABILITY_RETRY_MAX) {
          if (retryTimer !== undefined) {
            clearInterval(retryTimer);
          }
          return;
        }
        retryCount += 1;
        void hydrate();
      }, EMPTY_CAPABILITY_RETRY_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) {
        clearInterval(retryTimer);
      }
    };
  }, [userId, homeTenantId, tenantId, activeBranch, isLoaded, hasEmptyFallback]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading capabilities...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      <AppSidebar tenantName={tenantName} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader displayName={displayName} tenantName={tenantName} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
