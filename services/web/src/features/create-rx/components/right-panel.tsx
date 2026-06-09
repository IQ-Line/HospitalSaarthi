import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { useSearch } from '@tanstack/react-router';
import { M3ConsentPanel } from '@/features/abha/components/m3-consent-panel';
import { useCreateRxStore } from '../create-rx.store';
import type { CreateRxRightTab } from '../types';

const RIGHT_TABS: { key: CreateRxRightTab; label: string }[] = [
  { key: 'medical-history', label: 'Medical History' },
  { key: 'ai-prescription', label: 'AI Prescription' },
  { key: 'abha-consent', label: 'ABHA Consent' },
  { key: 'lab-reports', label: 'Lab Reports' },
];

function EmptyPreview({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] flex-1 items-center justify-center bg-gray-100 p-6">
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function RightPanel() {
  const { mode } = useSearch({ from: '/_authenticated/create-rx/$visitId' });
  const context = useCreateRxStore((s) => s.context);
  const activeRightTab = useCreateRxStore((s) => s.activeRightTab);
  const setActiveRightTab = useCreateRxStore((s) => s.setActiveRightTab);
  const readOnly = mode === 'view';

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-gray-200 bg-gray-100">
      <h2 className="shrink-0 bg-white px-3 pt-3 pb-2 text-base font-semibold text-gray-800">
        Patient Prescription Preview
      </h2>
      <Tabs
        value={activeRightTab}
        onValueChange={(v) => setActiveRightTab(v as CreateRxRightTab)}
        className="flex min-h-0 flex-1 flex-col bg-white"
      >
        <TabsList className="h-auto w-full shrink-0 justify-start rounded-none border-b border-gray-200 bg-white p-0">
          {RIGHT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="relative flex-1 rounded-none border-0 px-1 py-2 text-xs font-medium text-gray-700 shadow-none data-[state=active]:text-teal-600 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:h-0.5 data-[state=active]:after:w-4/5 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:rounded-t data-[state=active]:after:bg-teal-400"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="ai-prescription" className="mt-0 min-h-0 flex-1 overflow-y-auto bg-gray-50 p-3">
          <div>
            <p className="mb-1 text-sm font-semibold text-gray-700">Prescription preview</p>
            <div className="min-h-[120px] rounded-sm bg-gray-100 px-3 py-2 text-sm text-gray-400">
              Preview will populate from visit data when the prescription API is wired.
            </div>
          </div>
        </TabsContent>
        <TabsContent value="medical-history" className="mt-0 min-h-0 flex-1">
          <EmptyPreview message="Medical history preview will load from the patient record." />
        </TabsContent>
        <TabsContent value="abha-consent" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <M3ConsentPanel
            abhaAddress={context?.patient.abhaAddress}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent value="lab-reports" className="mt-0 min-h-0 flex-1">
          <EmptyPreview message="No lab reports found" />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
