import { cn } from '@pulse/utils';
import { useCreateRxStore } from '../create-rx.store';
import type { CreateRxMainTab } from '../types';

const MAIN_TABS: { key: CreateRxMainTab; label: string }[] = [
  { key: 'visitpad', label: 'Visitpad' },
  { key: 'documents', label: 'Documents' },
  { key: 'patient-profile', label: 'Patient Profile' },
];

/** Reference MainTabBar — grey strip, blue active with underline feel via bg-blue-50. */
export function CreateRxMainTabs() {
  const activeMainTab = useCreateRxStore((s) => s.activeMainTab);
  const setActiveMainTab = useCreateRxStore((s) => s.setActiveMainTab);

  return (
    <nav
      className="flex flex-wrap items-end gap-4 border-b border-gray-200 px-2 md:gap-8 md:px-3"
      aria-label="Create RX main tabs"
    >
      {MAIN_TABS.map((tab) => {
        const isActive = activeMainTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveMainTab(tab.key)}
            className={cn(
              'rounded-md px-2 py-2 text-[15px] font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
