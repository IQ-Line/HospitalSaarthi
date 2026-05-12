import {
  ArrowRightLeft,
  BookOpen,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Columns2,
  HeartPulse,
  Layers,
  PillBottle,
  Ruler,
  Scissors,
  ShieldAlert,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface VisitpadNavSectionProps {
  collapsed: boolean;
  isOpen: boolean;
  onToggleSection: () => void;
}

export function VisitpadNavSection({
  collapsed,
  isOpen,
  onToggleSection,
}: VisitpadNavSectionProps) {
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
        title={collapsed ? 'Visitpad templates' : undefined}
      >
        <Layers className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">Visitpad</span>
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
            to="/visitpad/units"
            label="Units"
            icon={Ruler}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/conversions"
            label="Conversions"
            icon={ArrowRightLeft}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/vitals"
            label="Vitals"
            icon={HeartPulse}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/chief-complaints"
            label="Chief complaints"
            icon={BookOpen}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/diagnoses"
            label="Diagnosis"
            icon={Stethoscope}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/allergens"
            label="Allergens"
            icon={Syringe}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/reactions"
            label="Reactions"
            icon={ShieldAlert}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/rx-columns"
            label="Rx columns"
            icon={Columns2}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/medicines"
            label="Medicines"
            icon={PillBottle}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/chronic-illness"
            label="Chronic illness"
            icon={CalendarClock}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/procedures"
            label="Procedures"
            icon={Scissors}
            collapsed={collapsed}
            nested
          />
        </div>
      )}
    </div>
  );
}
