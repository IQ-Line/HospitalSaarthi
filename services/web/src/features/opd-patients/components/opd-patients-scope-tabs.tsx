import { cn } from '@pulse/utils';

export type OpdPatientsScopeTab = 'opd' | 'my' | 'other';

const TABS: { key: OpdPatientsScopeTab; label: string }[] = [
  { key: 'opd', label: 'OPD Patients' },
  { key: 'my', label: 'My Patients' },
  { key: 'other', label: 'Other Patients' },
];

interface OpdPatientsScopeTabsProps {
  activeTab: OpdPatientsScopeTab;
  onChange: (tab: OpdPatientsScopeTab) => void;
}

/**
 * Reference: Patients page doctor scope control (hims-frontend-ai-based ButtonGroup in PageHeader).
 * Three pill tabs on #F5F5F5 track — active tab is white with bold text.
 */
export function OpdPatientsScopeTabs({ activeTab, onChange }: OpdPatientsScopeTabsProps) {
  return (
    <div
      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#F5F5F5] p-1"
      role="tablist"
      aria-label="Patient list scope"
    >
      {TABS.map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={cn(
              'rounded-md px-4 py-2 text-sm transition-colors',
              selected
                ? 'bg-white font-semibold text-black shadow-sm'
                : 'bg-transparent font-medium text-gray-600 hover:bg-gray-200/80 hover:text-gray-800',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
