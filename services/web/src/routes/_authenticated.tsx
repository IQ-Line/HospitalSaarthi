import { useEffect } from 'react';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { hydratePermissionsFromBackend } from '@/lib/permissions';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { AppSidebar } from '@/components/layout/app-sidebar';
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
    const permissionsState = usePermissionsStore.getState();
    const needsHydration =
      !permissionsState.isLoaded || Object.keys(permissionsState.map).length === 0;
    if (needsHydration) {
      try {
        await hydratePermissionsFromBackend();
      } catch {
        // UX-only: allow shell when PDP/API is down in dev; all APIs still enforce Cerbos.
        usePermissionsStore.getState().setPermissions({});
      }
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const displayName = useAuthStore((s) => s.displayName);
  const tenantName = useTenantStore((s) => s.tenantName);
  const tenantId = useTenantStore((s) => s.tenantId);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const permissionMap = usePermissionsStore((s) => s.map);
  const hasModuleAccess = usePermissionsStore((s) => s.hasModuleAccess);
  const hasEmptyFallback = isLoaded && Object.keys(permissionMap).length === 0;

  useEffect(() => {
    if (isLoaded && !hasEmptyFallback) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setInterval> | undefined;

    const hydrate = async () => {
      try {
        await hydratePermissionsFromBackend();
      } catch {
        if (!cancelled) {
          usePermissionsStore.getState().setPermissions({});
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
  }, [isLoaded, hasEmptyFallback, tenantId, activeBranch]);
  const sidebarCollapsed = useUIPrefsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIPrefsStore((s) => s.toggleSidebar);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar
        displayName={displayName}
        tenantName={tenantName}
        hasMasterDataAccess={hasModuleAccess('master-data')}
        hasUserManagementAccess={hasModuleAccess('user-management')}
        hasVisitpadAccess={
          hasModuleAccess('master-data') || hasModuleAccess('visitpad-templates')
        }
      />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="h-10 border-b bg-background px-3 flex items-center">
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
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
