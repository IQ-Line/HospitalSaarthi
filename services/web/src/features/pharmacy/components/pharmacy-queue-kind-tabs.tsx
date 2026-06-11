import { cn } from '@pulse/utils';

export type PharmacyQueueKindTab = 'opd' | 'walk_in';

const TABS: { key: PharmacyQueueKindTab; label: string }[] = [
  { key: 'opd', label: 'Prescriptions' },
  { key: 'walk_in', label: 'Walk-in' },
];

interface PharmacyQueueKindTabsProps {
  activeTab: PharmacyQueueKindTab;
  onChange: (tab: PharmacyQueueKindTab) => void;
}

export function PharmacyQueueKindTabs({ activeTab, onChange }: PharmacyQueueKindTabsProps) {
  return (
    <div
      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#F5F5F5] p-1"
      role="tablist"
      aria-label="Pharmacy queue source"
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
