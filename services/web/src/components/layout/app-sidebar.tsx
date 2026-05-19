import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { BrandMark } from '@/components/layout/brand-mark';
import { GenericSidebarRenderer } from '@/components/navigation/generic-sidebar-renderer';
import { useFilteredNavigation } from '@/navigation/use-filtered-navigation';
import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface AppSidebarProps {
  displayName: string | null;
  tenantName: string | null;
}

export function AppSidebar({ displayName, tenantName }: AppSidebarProps) {
  const sidebarCollapsed = useUIPrefsStore((s) => s.sidebarCollapsed);
  const navNodes = useFilteredNavigation();

  return (
    <aside
      className={`border-r bg-sidebar flex flex-col transition-all duration-200 ${
        sidebarCollapsed ? 'w-16 p-2' : 'w-64 p-3'
      }`}
    >
      <SidebarBrandHeader collapsed={sidebarCollapsed} tenantName={tenantName} />

      <nav className="space-y-1 flex-1 overflow-y-auto">
        <GenericSidebarRenderer nodes={navNodes} collapsed={sidebarCollapsed} />
      </nav>

      <SidebarFooter displayName={displayName} collapsed={sidebarCollapsed} />
    </aside>
  );
}

function SidebarBrandHeader({
  collapsed,
  tenantName,
}: {
  collapsed: boolean;
  tenantName: string | null;
}) {
  return (
    <div
      className={`mb-4 flex items-center ${
        collapsed ? 'justify-center' : 'gap-2'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">HIMS</h1>
            {tenantName ? (
              <p className="text-xs text-muted-foreground truncate">{tenantName}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarFooter({
  displayName,
  collapsed,
}: {
  displayName: string | null;
  collapsed: boolean;
}) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch {
      // Best-effort — clear local state even if the API call fails.
    }
    clearSession();
    clearTenant();
    navigate({ to: '/login' });
  }

  return (
    <div className="pt-3 mt-3 border-t flex items-center gap-2">
      <p className="text-xs truncate text-muted-foreground flex-1 min-w-0">
        {collapsed ? 'User' : displayName ?? 'User'}
      </p>
      <Button
        variant="ghost"
        size={collapsed ? 'icon-sm' : 'sm'}
        onClick={handleLogout}
        disabled={loggingOut}
        aria-label="Logout"
        title="Logout"
      >
        <LogOut className="size-3.5" />
        {!collapsed && <span>Logout</span>}
      </Button>
    </div>
  );
}
