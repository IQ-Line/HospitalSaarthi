import { Button } from '@pulse/ui/button';
import { cn } from '@pulse/utils';
import { useCreateRxStore } from '../create-rx.store';
import type { CreateRxSectionTab } from '../types';
import { VISITPAD_SECTION_TAB, type VisitpadTableSection } from '../lib/visitpad-validation';
import { CarePlan } from './visitpad/care-plan';
import { CurrentMedication } from './visitpad/current-medication';
import { MedicalHistory } from './visitpad/medical-history';
import { PhysicalActivity } from './visitpad/physical-activity';
import { PreConsult } from './pre-consult';

const SECTION_TABS: { key: CreateRxSectionTab; label: string }[] = [
  { key: 'pre-consult', label: 'Pre Consult' },
  { key: 'medical-history', label: 'Medical History' },
  { key: 'current-medication', label: 'Current Medication' },
  { key: 'physical-activity', label: 'Physical Activity' },
  { key: 'care-plan', label: 'Care Plan' },
];

function sectionTabHasErrors(
  tab: CreateRxSectionTab,
  invalidSections: VisitpadTableSection[],
): boolean {
  return invalidSections.some((section) => VISITPAD_SECTION_TAB[section] === tab);
}

interface VisitPadProps {
  onSaveClick: () => void;
}

export function VisitPad({ onSaveClick }: VisitPadProps) {
  const activeSectionTab = useCreateRxStore((s) => s.activeSectionTab);
  const setActiveSectionTab = useCreateRxStore((s) => s.setActiveSectionTab);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const visitpadFieldErrors = useCreateRxStore((s) => s.visitpadFieldErrors);
  const invalidSections = [
    ...new Set(visitpadFieldErrors.map((error) => error.section)),
  ] as VisitpadTableSection[];

  const renderSection = () => {
    switch (activeSectionTab) {
      case 'pre-consult':
        return <PreConsult />;
      case 'medical-history':
        return <MedicalHistory />;
      case 'current-medication':
        return <CurrentMedication />;
      case 'physical-activity':
        return <PhysicalActivity />;
      case 'care-plan':
        return <CarePlan />;
      default:
        return <PreConsult />;
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
            const hasErrors = sectionTabHasErrors(tab.key, invalidSections);
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
                  hasErrors && !selected && 'border-l-red-500 bg-red-50 text-red-700',
                  hasErrors && selected && 'border-l-red-600 bg-red-50 text-red-700',
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
        <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-3">
          <Button
            type="button"
            size="sm"
            className="bg-[#0d9488] text-white hover:bg-[#0f766e]"
            onClick={onSaveClick}
          >
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}
