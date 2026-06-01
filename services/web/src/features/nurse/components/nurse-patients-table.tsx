import { Fragment, useState, type MouseEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, FileText, HeartPulse, Printer } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { Skeleton } from '@pulse/ui/skeleton';
import {
  formatGenderAge,
  formatOpdVisitCreated,
  opdStatusBadgeClass,
  opdStatusLabel,
} from '@/features/opd-patients/lib/opd-patient-display';
import type { NursePatientVisitRow } from '../types';
import { NurseVitalsInlineForm } from './nurse-vitals-inline-form';

interface NursePatientsTableProps {
  rows: NursePatientVisitRow[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function stopRowClick(e: MouseEvent) {
  e.stopPropagation();
}

export function NursePatientsTable({
  rows,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: NursePatientsTableProps) {
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const toggleVitals = (visitId: string) => {
    setExpandedVisitId((prev) => (prev === visitId ? null : visitId));
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
        <p className="font-medium text-foreground">No data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No registered patients match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead className="bg-[#F8FAFC]">
          <tr>
            {[
              'VISIT ID',
              'UHID',
              'PATIENT NAME',
              'GENDER/AGE',
              'ACTIONS',
              'CONSULTATION TYPE',
              'DOCTOR',
              'VISIT CREATED',
              'STATUS',
              'REPORT',
            ].map((label) => (
              <th
                key={label}
                className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = expandedVisitId === row.id;
            const vitalsIconClass = row.vitalsRecorded
              ? 'text-[#0d9488]'
              : 'text-red-500';

            return (
              <Fragment key={row.id}>
                <tr className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className="px-3 py-3 font-medium tabular-nums">{row.visitNumber}</td>
                  <td className="px-3 py-3 tabular-nums">{row.uhid}</td>
                  <td className="px-3 py-3">
                    <Link
                      to="/nurse/patients/$visitId"
                      params={{ visitId: row.id }}
                      className="font-semibold text-[#2563EB] hover:underline"
                      onClick={stopRowClick}
                    >
                      {row.patientName}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{formatGenderAge(row.gender, row.age)}</td>
                  <td className="px-3 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={(e) => {
                        stopRowClick(e);
                        toggleVitals(row.id);
                      }}
                    >
                      <HeartPulse className={`size-3.5 ${vitalsIconClass}`} />
                      {row.vitalsActionLabel}
                    </Button>
                  </td>
                  <td className="px-3 py-3">{row.consultationType}</td>
                  <td className="px-3 py-3">{row.doctorName}</td>
                  <td className="px-3 py-3">{formatOpdVisitCreated(row.visitCreatedAt)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${opdStatusBadgeClass(row.status)}`}
                    >
                      {opdStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {row.status === 'completed' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={stopRowClick}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                          >
                            <Printer className="size-3.5" />
                            Print
                            <ChevronDown className="size-3.5 opacity-60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <FileText className="size-4" />
                            OPD slip
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="size-4" />
                            Prescription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
                {expanded ? (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <NurseVitalsInlineForm
                        visitId={row.id}
                        patientId={row.patientId}
                        readOnly={row.status === 'completed'}
                        onCancel={() => setExpandedVisitId(null)}
                        onSaved={() => setExpandedVisitId(null)}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
        <span>
          Showing {rangeStart}-{rangeEnd} of {total}
        </span>
      </div>
    </div>
  );
}
