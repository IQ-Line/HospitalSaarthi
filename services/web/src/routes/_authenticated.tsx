import { useEffect } from 'react';
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { refreshAuthorizationContext } from '@/lib/authorization-context';
import { queryClient } from '@/lib/query-client';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TenantSwitcher } from '@/features/auth/components/tenant-switcher';
import { catalogIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
    await refreshAuthorizationContext(queryClient).catch(() => {
      usePermissionsStore.getState().clearPermissions();
    });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const displayName = useAuthStore((s) => s.displayName);
  const userId = useAuthStore((s) => s.userId);
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantName = useTenantStore((s) => s.tenantName);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const capabilityCount = usePermissionsStore((s) => s.capabilityKeys.size);
  const hasEmptyFallback = isLoaded && capabilityCount === 0;

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

  const sidebarCollapsed = useUIPrefsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIPrefsStore((s) => s.toggleSidebar);

  const catalogTenant = catalogIqTenantHeaderValue(tenantId);
  const catalogScopeLabel =
    catalogTenant != null
      ? `Tenant catalog · ${catalogTenant.slice(0, 8)}…`
      : 'Platform catalog';
  const loginVariantLabel = userId ? `User ${userId.slice(0, 8)}…` : '—';

  const handleLogout = () => {
    useAuthStore.getState().clearSession();
    useTenantStore.getState().clearTenant();
    usePermissionsStore.getState().clearPermissions();
    void refreshAuthorizationContext(queryClient).finally(() => {
      void navigate({ to: '/login' });
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading capabilities...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar displayName={displayName} tenantName={tenantName} />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="h-10 border-b bg-background px-3 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => toggleSidebar()}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate font-medium text-foreground">{displayName}</span>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {loginVariantLabel}
              </Badge>
              <Badge variant="outline" className="shrink-0 max-w-[220px] truncate font-normal" title={tenantName ?? ''}>
                {catalogScopeLabel}
              </Badge>
              {tenantName ? (
                <span className="hidden sm:inline truncate" title={tenantName}>
                  {tenantName}
                </span>
              ) : null}
            </div>
          </div>
          <TenantSwitcher />
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleLogout}>
            <LogOut className="size-3.5" aria-hidden />
            Log out
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
