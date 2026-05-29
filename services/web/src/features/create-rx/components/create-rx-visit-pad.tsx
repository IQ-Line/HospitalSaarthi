import { Button } from '@pulse/ui/button';
import { cn } from '@pulse/utils';
import { useCreateRxStore } from '../create-rx.store';
import type { CreateRxSectionTab } from '../types';
import { CreateRxCarePlan } from './visitpad/create-rx-care-plan';
import { CreateRxCurrentMedication } from './visitpad/create-rx-current-medication';
import { CreateRxMedicalHistory } from './visitpad/create-rx-medical-history';
import { CreateRxPhysicalActivity } from './visitpad/create-rx-physical-activity';
import { CreateRxPreConsult } from './create-rx-pre-consult';

const SECTION_TABS: { key: CreateRxSectionTab; label: string }[] = [
  { key: 'pre-consult', label: 'Pre Consult' },
  { key: 'medical-history', label: 'Medical History' },
  { key: 'current-medication', label: 'Current Medication' },
  { key: 'physical-activity', label: 'Physical Activity' },
  { key: 'care-plan', label: 'Care Plan' },
];

interface CreateRxVisitPadProps {
  onSave: () => void;
  onEndConsultation: () => void;
}

export function CreateRxVisitPad({ onSave, onEndConsultation }: CreateRxVisitPadProps) {
  const activeSectionTab = useCreateRxStore((s) => s.activeSectionTab);
  const setActiveSectionTab = useCreateRxStore((s) => s.setActiveSectionTab);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);

  const renderSection = () => {
    switch (activeSectionTab) {
      case 'pre-consult':
        return <CreateRxPreConsult />;
      case 'medical-history':
        return <CreateRxMedicalHistory />;
      case 'current-medication':
        return <CreateRxCurrentMedication />;
      case 'physical-activity':
        return <CreateRxPhysicalActivity />;
      case 'care-plan':
        return <CreateRxCarePlan />;
      default:
        return <CreateRxPreConsult />;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          className="flex w-[200px] shrink-0 flex-col border-r border-gray-200 bg-white py-2"
          aria-label="Visitpad sections"
        >
          {SECTION_TABS.map((tab) => {
            const selected = tab.key === activeSectionTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSectionTab(tab.key)}
                className={cn(
                  'mb-0.5 border-l-4 px-3 py-3 text-left text-sm transition-colors',
                  selected
                    ? 'border-l-blue-600 bg-blue-50 font-semibold text-blue-600'
                    : 'border-l-transparent font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-gray-50">{renderSection()}</div>
      </div>
      {!isReadOnly ? (
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3">
          <Button type="button" variant="outline" size="sm" className="border-blue-600 text-blue-600" onClick={onSave}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
            onClick={onEndConsultation}
          >
            End Consultation
          </Button>
        </div>
      ) : null}
    </div>
  );
}
