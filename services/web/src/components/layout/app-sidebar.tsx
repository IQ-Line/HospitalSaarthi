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
<<<<<<< HEAD
  const navNodes = useFilteredNavigation();
=======
  const accessToken = useAuthStore((s) => s.accessToken);
  const isSuperAdmin = useMemo(
    () => isSuperAdminRole(getRolesFromAccessToken(accessToken)),
    [accessToken],
  );

  const { pathname } = useLocation();
  const isInMasterData = pathname.startsWith('/master-data');
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);
  const isInVisitpad = pathname.startsWith('/visitpad');
  const [isVisitpadOpen, setIsVisitpadOpen] = useState(true);
  const isInBilling =
    pathname.startsWith('/billing') || pathname.startsWith('/billing-and-finance');
  const [isBillingOpen, setIsBillingOpen] = useState(true);
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

  const { data: modulesResponse, isLoading: modulesLoading } = useNavModules({
    enabled: isSuperAdmin,
  });

  const dynamicNavTree = useMemo(() => {
    if (!isSuperAdmin || !modulesResponse?.data) {
      return [];
    }
    return buildNavModuleTree(modulesResponse.data);
  }, [isSuperAdmin, modulesResponse?.data]);

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
    if (isInBilling) {
      setIsBillingOpen(true);
    }
  }, [isInBilling]);

  useEffect(() => {
    if (isInFrontdesk) {
      setIsFrontdeskOpen(true);
    }
  }, [isInFrontdesk]);
>>>>>>> cd2a605515ccd3d8bf769a14d4401c72b9752543

  return (
    <aside
      className={`border-r bg-sidebar flex flex-col transition-all duration-200 ${
        sidebarCollapsed ? 'w-16 p-2' : 'w-64 p-3'
      }`}
    >
      <SidebarBrandHeader collapsed={sidebarCollapsed} tenantName={tenantName} />

<<<<<<< HEAD
      <nav className="space-y-1 flex-1 overflow-y-auto">
        <GenericSidebarRenderer nodes={navNodes} collapsed={sidebarCollapsed} />
      </nav>
=======
        <nav className="space-y-1 flex-1 overflow-y-auto">
          <SidebarNavLink
            to="/dashboard"
            label="Dashboard"
            icon={LayoutGrid}
            collapsed={sidebarCollapsed}
          />

          {isSuperAdmin ? (
            modulesLoading ? (
              !sidebarCollapsed && (
                <p className="px-2 py-1 text-xs text-muted-foreground">Loading modules…</p>
              )
            ) : dynamicNavTree.length > 0 ? (
              <DynamicModuleNav
                nodes={dynamicNavTree}
                collapsed={sidebarCollapsed}
                pathname={pathname}
              />
            ) : null
          ) : (
            <>
              {hasMasterDataAccess && (
                <MasterDataNavSection
                  collapsed={sidebarCollapsed}
                  isOpen={isMasterDataOpen}
                  onToggleSection={() => setIsMasterDataOpen((prev) => !prev)}
                />
              )}
              {hasConfiguratorAccess && (
                <ConfiguratorNavSection collapsed={sidebarCollapsed} />
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
              {hasBillingAccess && (
                <BillingNavSection
                  collapsed={sidebarCollapsed}
                  isOpen={isBillingOpen}
                  onToggleSection={() => setIsBillingOpen((prev) => !prev)}
                />
              )}
            </>
          )}
        </nav>
>>>>>>> cd2a605515ccd3d8bf769a14d4401c72b9752543

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
