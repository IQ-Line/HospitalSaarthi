import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { BrandMark } from '@/components/layout/brand-mark';
import { GenericSidebarRenderer } from '@/components/navigation/generic-sidebar-renderer';
import { useFilteredNavigation } from '@/navigation/use-filtered-navigation';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface AppSidebarProps {
  tenantName: string | null;
}

export function AppSidebar({ tenantName }: AppSidebarProps) {
  const sidebarCollapsed = useUIPrefsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIPrefsStore((s) => s.toggleSidebar);
  const navNodes = useFilteredNavigation();

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
        <BrandMark />
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">HIMS</h2>
            {tenantName ? (
              <p className="text-xs text-muted-foreground truncate">{tenantName}</p>
            ) : null}
          </div>
        )}
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        <GenericSidebarRenderer nodes={navNodes} collapsed={sidebarCollapsed} />
      </nav>

      <div className={`pt-3 mt-3 border-t flex ${sidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleSidebar()}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
