import {
  ChevronDown,
  ChevronRight,
  Database,
  Link2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface MasterDataNavSectionProps {
  collapsed: boolean;
  isOpen: boolean;
  onToggleSection: () => void;
}

export function MasterDataNavSection({
  collapsed,
  isOpen,
  onToggleSection,
}: MasterDataNavSectionProps) {
  const expandSidebar = () => useUIPrefsStore.setState({ sidebarCollapsed: false });

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          if (collapsed) {
            expandSidebar();
            return;
          }
          onToggleSection();
        }}
        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? 'Master Data' : undefined}
      >
        <Database className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">Master Data</span>
            {isOpen ? (
              <ChevronDown className="size-4 ml-auto" />
            ) : (
              <ChevronRight className="size-4 ml-auto" />
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className="space-y-1">
          <SidebarNavLink
            to="/master-data/modules"
            label="Modules"
            icon={Database}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/master-data/permissions"
            label="Permissions"
            icon={ShieldCheck}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/master-data/system-roles"
            label="System Roles"
            icon={Users}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/master-data/module-permissions"
            label="Module Permissions"
            icon={Link2}
            collapsed={collapsed}
            nested
          />
        </div>
      )}
    </div>
  );
}
