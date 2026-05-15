import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardSignature,
  ConciergeBell,
  Users,
} from 'lucide-react';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface FrontdeskNavSectionProps {
  collapsed: boolean;
  isOpen: boolean;
  onToggleSection: () => void;
}

export function FrontdeskNavSection({
  collapsed,
  isOpen,
  onToggleSection,
}: FrontdeskNavSectionProps) {
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
        title={collapsed ? 'Frontdesk' : undefined}
      >
        <ConciergeBell className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">Frontdesk</span>
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
            to="/frontdesk/visit-registration"
            label="Visit Registration"
            icon={ClipboardSignature}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/frontdesk/opd-patients"
            label="OPD Patients"
            icon={Users}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/frontdesk/past-visits"
            label="Past Visits"
            icon={CalendarDays}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/frontdesk/appointments"
            label="Appointments"
            icon={CalendarDays}
            collapsed={collapsed}
            nested
          />
        </div>
      )}
    </div>
  );
}
