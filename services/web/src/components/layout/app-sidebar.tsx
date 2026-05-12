import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { LayoutGrid, Users } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { MasterDataNavSection } from '@/features/master-data/components/master-data-nav-section';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface AppSidebarProps {
  displayName: string | null;
  tenantName: string | null;
  hasMasterDataAccess: boolean;
  hasUserManagementAccess: boolean;
}

export function AppSidebar({
  displayName,
  tenantName,
  hasMasterDataAccess,
  hasUserManagementAccess,
}: AppSidebarProps) {
  const sidebarCollapsed = useUIPrefsStore((s) => s.sidebarCollapsed);

  const { pathname } = useLocation();
  const isInMasterData = pathname.startsWith('/master-data');
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);

  useEffect(() => {
    if (isInMasterData) {
      setIsMasterDataOpen(true);
    }
  }, [isInMasterData]);

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
            to="/user-management"
            label="Users"
            icon={Users}
            collapsed={sidebarCollapsed}
            search={{ q: '' }}
          />
        )}
      </nav>

      <div className="pt-3 mt-3 border-t">
        <p className="text-xs truncate text-muted-foreground">
          {sidebarCollapsed ? 'User' : displayName ?? 'User'}
        </p>
      </div>
    </aside>
  );
}
