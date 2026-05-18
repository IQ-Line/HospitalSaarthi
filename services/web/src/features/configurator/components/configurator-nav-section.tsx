import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Building2, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface ConfiguratorNavSectionProps {
  collapsed: boolean;
}

export function ConfiguratorNavSection({ collapsed }: ConfiguratorNavSectionProps) {
  const expandSidebar = () => useUIPrefsStore.setState({ sidebarCollapsed: false });
  const { pathname } = useLocation();
  const isInConfigurator = pathname.startsWith('/configurator');
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isInConfigurator) {
      setIsOpen(true);
    }
  }, [isInConfigurator]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          if (collapsed) {
            expandSidebar();
            return;
          }
          setIsOpen((prev) => !prev);
        }}
        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? 'Configurator' : undefined}
      >
        <SlidersHorizontal className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">Configurator</span>
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
            to="/configurator/tenant"
            label="Tenant"
            icon={Building2}
            collapsed={collapsed}
            nested
          />
        </div>
      )}
    </div>
  );
}
