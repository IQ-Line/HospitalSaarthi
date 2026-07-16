import { Bell, Settings } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { TenantSwitcher } from '@/features/auth/components/tenant-switcher';
import { AppUserMenu } from '@/components/layout/app-user-menu';
import { BrandMark } from '@/components/layout/brand-mark';
import {
  APP_HEADER_BG_CLASS,
  APP_HEADER_HEIGHT_CLASS,
} from '@/components/layout/layout-constants';

interface AppHeaderProps {
  displayName: string | null;
  tenantName: string | null;
}

export function AppHeader({ displayName, tenantName }: AppHeaderProps) {
  const title = tenantName?.trim() || 'HIMS';

  return (
    <header className="shrink-0 border-b border-sky-200/80">
      <div
        className={`flex items-center gap-4 px-4 ${APP_HEADER_HEIGHT_CLASS} ${APP_HEADER_BG_CLASS}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <BrandMark />
          <h1 className="truncate text-base font-semibold text-[#1e3a5f]">{title}</h1>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <TenantSwitcher />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-[#1e3a5f] hover:bg-white/60"
            aria-label="Settings"
            disabled
            title="Settings (coming soon)"
          >
            <Settings className="size-5" strokeWidth={1.5} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-[#1e3a5f] hover:bg-white/60"
            aria-label="Notifications"
            disabled
            title="Notifications (coming soon)"
          >
            <Bell className="size-5" strokeWidth={1.5} />
          </Button>
          <AppUserMenu displayName={displayName} />
        </div>
      </div>
    </header>
  );
}
