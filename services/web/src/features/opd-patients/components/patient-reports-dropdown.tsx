import { ChevronDown, FileText, Printer } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { CLINICAL_REPORT_LABELS, type ClinicalReportType } from '../api/clinical-documents';
import {
  unavailableClinicalReportAvailability,
  type OpdEncounterOverlay,
} from '../api/opd-encounter-overlay';

const REPORT_OPTIONS: ClinicalReportType[] = [
  'op-consultation',
  'prescription',
  'immunization',
];

interface PatientReportsDropdownProps {
  visitId: string;
  encounterOverlaysByVisitId?: Record<string, OpdEncounterOverlay>;
  onSelectReport: (reportType: ClinicalReportType) => void;
  onClick?: (event: MouseEvent) => void;
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation();
}

export function PatientReportsDropdown({
  visitId,
  encounterOverlaysByVisitId,
  onSelectReport,
  onClick,
}: PatientReportsDropdownProps) {
  const availability =
    encounterOverlaysByVisitId?.[visitId]?.reportAvailability ??
    unavailableClinicalReportAvailability();
  const handleTriggerClick = (event: MouseEvent) => {
    stopRowClick(event);
    onClick?.(event);
  };

  return (
    <div onClick={stopRowClick} onPointerDown={stopRowClick}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={handleTriggerClick}>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
            <Printer className="size-3.5" />
            Print
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {REPORT_OPTIONS.map((reportType) => {
            const item = availability[reportType];
            const disabled = item?.available === false;
            const disabledReason = item?.reason;

            return (
              <DropdownMenuItem
                key={reportType}
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
                onSelect={(event) => {
                  if (disabled) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  onSelectReport(reportType);
                }}
              >
                <FileText className="size-4" />
                {CLINICAL_REPORT_LABELS[reportType]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
