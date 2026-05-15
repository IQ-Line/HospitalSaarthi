import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { LayoutGrid, LogOut, Users } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { BrandMark } from '@/components/layout/brand-mark';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { ConfiguratorNavSection } from '@/features/configurator/components/configurator-nav-section';
import { MasterDataNavSection } from '@/features/master-data/components/master-data-nav-section';
import { FrontdeskNavSection } from '@/features/frontdesk/components/frontdesk-nav-section';
import { VisitpadNavSection } from '@/features/visitpad/components/visitpad-nav-section';
import { authClient } from '@/lib/auth-client';
import {
  canReadRoles,
  canReadUsers,
  canWriteUsers,
} from '@/features/user-management/lib/um-permissions';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface AppSidebarProps {
  displayName: string | null;
  tenantName: string | null;
  hasMasterDataAccess: boolean;
  hasConfiguratorAccess: boolean;
  hasUserManagementAccess: boolean;
  /** Catalog admins: same gate as Master Data until a dedicated Cerbos module exists. */
  hasVisitpadAccess: boolean;
  hasFrontdeskAccess: boolean;
}

export function AppSidebar({
  displayName,
  tenantName,
  hasMasterDataAccess,
  hasConfiguratorAccess,
  hasUserManagementAccess,
  hasVisitpadAccess,
  hasFrontdeskAccess,
}: AppSidebarProps) {
  const sidebarCollapsed = useUIPrefsStore((s) => s.sidebarCollapsed);

  const { pathname } = useLocation();
  const isInMasterData = pathname.startsWith('/master-data');
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);
  const isInVisitpad = pathname.startsWith('/visitpad');
  const [isVisitpadOpen, setIsVisitpadOpen] = useState(true);
  const isInFrontdesk = pathname.startsWith('/frontdesk');
  const [isFrontdeskOpen, setIsFrontdeskOpen] = useState(true);
  const canReadUmUsers = usePermissionsStore(canReadUsers);
  const canWriteUmUsers = usePermissionsStore(canWriteUsers);
  const canReadUmRoles = usePermissionsStore(canReadRoles);
  const userManagementNavTo =
    canReadUmUsers || canWriteUmUsers
      ? '/user-management'
      : canReadUmRoles
        ? '/user-management/roles'
        : '/user-management';
  const userManagementNavSearch =
    canReadUmUsers || canWriteUmUsers ? { q: '' as const } : undefined;
  const userManagementNavLabel = canReadUmUsers
    ? 'Users'
    : canWriteUmUsers
      ? 'Create user'
      : 'User management';

  useEffect(() => {
    if (isInMasterData) {
      setIsMasterDataOpen(true);
    }
  }, [isInMasterData]);

  useEffect(() => {
    if (isInVisitpad) {
      setIsVisitpadOpen(true);
    }
  }, [isInVisitpad]);

  useEffect(() => {
    if (isInFrontdesk) {
      setIsFrontdeskOpen(true);
    }
  }, [isInFrontdesk]);

  return (
    <aside
      className={`border-r bg-sidebar flex flex-col transition-all duration-200 ${
        sidebarCollapsed ? 'w-16 p-2' : 'w-64 p-3'
      }`}
    >
      <div
        className={`mb-4 flex items-center ${
          sidebarCollapsed ? 'justify-center' : 'gap-2'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BrandMark />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">HIMS</h1>
              {tenantName && (
                <p className="text-xs text-muted-foreground truncate">{tenantName}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        <SidebarNavLink
          to="/dashboard"
          label="Dashboard"
          icon={LayoutGrid}
          collapsed={sidebarCollapsed}
        />
        {hasMasterDataAccess && (
          <MasterDataNavSection
            collapsed={sidebarCollapsed}
            isOpen={isMasterDataOpen}
            onToggleSection={() => setIsMasterDataOpen((prev) => !prev)}
          />
        )}
        {hasUserManagementAccess && (
          <SidebarNavLink
            to={userManagementNavTo}
            label={userManagementNavLabel}
            icon={Users}
            collapsed={sidebarCollapsed}
            search={userManagementNavSearch}
          />
        )}
        {hasFrontdeskAccess && (
          <FrontdeskNavSection
            collapsed={sidebarCollapsed}
            isOpen={isFrontdeskOpen}
            onToggleSection={() => setIsFrontdeskOpen((prev) => !prev)}
          />
        )}
        {hasVisitpadAccess && (
          <VisitpadNavSection
            collapsed={sidebarCollapsed}
            isOpen={isVisitpadOpen}
            onToggleSection={() => setIsVisitpadOpen((prev) => !prev)}
          />
        )}
      </nav>

      <SidebarFooter
        displayName={displayName}
        collapsed={sidebarCollapsed}
      />
    </aside>
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
