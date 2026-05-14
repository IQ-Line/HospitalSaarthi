import {
  createFileRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

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
  const tenantName = useTenantStore((s) => s.tenantName);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const hasModuleAccess = usePermissionsStore((s) => s.hasModuleAccess);

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
        hasFrontdeskAccess={
          hasModuleAccess('frontdesk') || hasModuleAccess('master-data')
        }
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
