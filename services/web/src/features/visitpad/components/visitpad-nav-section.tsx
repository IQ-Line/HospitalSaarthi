import {
  Activity,
  BookOpen,
  ClipboardList,
  Layers,
  Link2,
  Pill,
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
              <span className="ml-auto text-muted-foreground">▾</span>
            ) : (
              <span className="ml-auto text-muted-foreground">▸</span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className="space-y-1">
          <SidebarNavLink
            to="/visitpad/units"
            label="Units"
            icon={ClipboardList}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/conversions"
            label="Conversions"
            icon={Link2}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/vitals"
            label="Vitals"
            icon={Activity}
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
            icon={Activity}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/rx-columns"
            label="Rx columns"
            icon={Pill}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/medicines"
            label="Medicines"
            icon={Pill}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/chronic-illness"
            label="Chronic illness"
            icon={Stethoscope}
            collapsed={collapsed}
            nested
          />
          <SidebarNavLink
            to="/visitpad/procedures"
            label="Procedures"
            icon={ClipboardList}
            collapsed={collapsed}
            nested
          />
        </div>
      )}
    </div>
  );
}
