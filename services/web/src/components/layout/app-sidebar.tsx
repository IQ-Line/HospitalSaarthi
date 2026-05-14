import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { LayoutGrid } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { MasterDataNavSection } from '@/features/master-data/components/master-data-nav-section';
import { FrontdeskNavSection } from '@/features/frontdesk/components/frontdesk-nav-section';
import { VisitpadNavSection } from '@/features/visitpad/components/visitpad-nav-section';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface AppSidebarProps {
  displayName: string;
  tenantName: string | null;
  hasMasterDataAccess: boolean;
  /** Catalog admins: same gate as Master Data until a dedicated Cerbos module exists. */
  hasVisitpadAccess: boolean;
  hasFrontdeskAccess: boolean;
}

export function AppSidebar({
  displayName,
  tenantName,
  hasMasterDataAccess,
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

      <div className="pt-3 mt-3 border-t">
        <p className="text-xs truncate text-muted-foreground">
          {sidebarCollapsed ? 'User' : displayName}
        </p>
      </div>
    </aside>
  );
}
