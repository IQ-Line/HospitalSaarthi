import { Link } from '@tanstack/react-router';
import { Bell, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { BrandMark } from '@/components/layout/brand-mark';
import {
  APP_HEADER_HEIGHT_PX,
  SIDEBAR_WIDTH_COLLAPSED_PX,
} from '@/components/layout/layout-constants';
import { AppUserMenu } from '@/components/layout/app-user-menu';
import { TenantSwitcher } from '@/features/auth/components/tenant-switcher';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface AppHeaderProps {
  displayName: string | null;
  tenantName: string | null;
}

export function AppHeader({ displayName, tenantName }: AppHeaderProps) {
  const sidebarCollapsed = useUIPrefsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIPrefsStore((s) => s.toggleSidebar);

  const title = tenantName?.trim() || 'HIMS';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[1000] border-b border-border bg-app-header"
      style={{ height: APP_HEADER_HEIGHT_PX }}
    >
      <div className="flex h-full items-center justify-between gap-3 pr-6 pl-0">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className="flex shrink-0 items-center justify-center bg-app-header"
            style={{ width: SIDEBAR_WIDTH_COLLAPSED_PX, height: APP_HEADER_HEIGHT_PX }}
          >
            <Link
              to="/dashboard"
              className="flex size-10 items-center justify-center rounded-md hover:bg-black/5"
              aria-label="Go to dashboard"
            >
              <BrandMark />
            </Link>
          </div>
          <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-1 shrink-0 hover:bg-black/5"
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <TenantSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="size-10 hover:bg-black/5"
            aria-label="Settings"
            disabled
          >
            <Settings className="size-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 hover:bg-black/5"
            aria-label="Notifications"
            disabled
          >
            <Bell className="size-6" />
          </Button>
          <AppUserMenu displayName={displayName} />
        </div>
      </div>
    </header>
  );
}
