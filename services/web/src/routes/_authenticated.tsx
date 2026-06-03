import { useEffect } from 'react';
import {
  createFileRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { refreshAuthorizationContext } from '@/lib/authorization-context';
import { queryClient } from '@/lib/query-client';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const displayName = useAuthStore((s) => s.displayName);
  const userId = useAuthStore((s) => s.userId);
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantName = useTenantStore((s) => s.tenantName);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const hasEmptyFallback = isLoaded && capabilityKeys.size === 0;

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setInterval> | undefined;

    const hydrate = async () => {
      try {
        await refreshAuthorizationContext(queryClient);
      } catch {
        if (!cancelled) {
          usePermissionsStore.getState().clearPermissions();
        }
      }
    };

    void hydrate();

    if (hasEmptyFallback) {
      retryTimer = setInterval(() => {
        void hydrate();
      }, 3000);
    }

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) {
        clearInterval(retryTimer);
      }
    };
  }, [userId, tenantId, activeBranch, hasEmptyFallback]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading capabilities...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar tenantName={tenantName} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader displayName={displayName} tenantName={tenantName} />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
