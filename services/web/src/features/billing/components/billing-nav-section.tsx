import { ChevronDown, ChevronRight, IndianRupee, Receipt } from 'lucide-react';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface BillingNavSectionProps {
  collapsed: boolean;
  isOpen: boolean;
  onToggleSection: () => void;
}

export function BillingNavSection({
  collapsed,
  isOpen,
  onToggleSection,
}: BillingNavSectionProps) {
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
        title={collapsed ? 'Billing' : undefined}
      >
        <IndianRupee className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">Billing</span>
            {isOpen ? (
              <ChevronDown className="size-4 ml-auto" />
            ) : (
              <ChevronRight className="size-4 ml-auto" />
            )}
          </>
        )}
      </button>

      {isOpen && (
        <SidebarNavLink
          to="/billing/services"
          label="Tariff catalog"
          icon={Receipt}
          collapsed={collapsed}
          nested
        />
      )}
    </div>
  );
}
