import { Tabs, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { useCreateRxStore } from '../create-rx.store';
import type { CreateRxMainTab } from '../types';

const MAIN_TABS: { key: CreateRxMainTab; label: string }[] = [
  { key: 'visitpad', label: 'Visitpad' },
  { key: 'documents', label: 'Documents' },
  { key: 'patient-profile', label: 'Patient Profile' },
];

export function MainTabs() {
  const activeMainTab = useCreateRxStore((s) => s.activeMainTab);
  const setActiveMainTab = useCreateRxStore((s) => s.setActiveMainTab);

  return (
    <Tabs
      value={activeMainTab}
      onValueChange={(v) => setActiveMainTab(v as CreateRxMainTab)}
      className="w-full"
    >
      <TabsList
        aria-label="Create RX main tabs"
        className="h-auto w-full justify-start rounded-none border-b border-gray-200 bg-transparent p-0 px-2 md:px-3"
      >
        {MAIN_TABS.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="rounded-md px-2 py-2 text-[15px] font-medium text-gray-700 shadow-none data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
