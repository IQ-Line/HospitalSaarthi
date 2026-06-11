import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { useMemo, type MouseEvent } from 'react';
import { Button } from '@pulse/ui/button';
import { DataTable } from '@/components/data-table';
import type { ClinicalReportType } from '../api/clinical-documents';
import { PatientReportsDropdown } from './patient-reports-dropdown';
import {
  formatOpdVisitCreated,
  formatPatientNameWithDemographics,
  opdStatusBadgeClass,
  opdStatusLabel,
} from '../lib/opd-patient-display';
import type { OpdPatientVisitRow } from '../types';

interface OpdPatientsTableProps {
  rows: OpdPatientVisitRow[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPatientRowClick: (row: OpdPatientVisitRow) => void;
  onOpenReport?: (row: OpdPatientVisitRow, reportType: ClinicalReportType) => void;
}

function stopRowClick(e: MouseEvent) {
  e.stopPropagation();
}

export function OpdPatientsTable({
  rows,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
  onPatientRowClick,
  onOpenReport,
}: OpdPatientsTableProps) {
  const columns = useMemo<ColumnDef<OpdPatientVisitRow, unknown>[]>(
    () => [
      {
        accessorKey: 'visitNumber',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">VISIT ID</span>,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{row.original.visitNumber}</span>
        ),
      },
      {
        id: 'patientName',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">PATIENT NAME</span>,
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left text-sm font-semibold text-[#2563EB] hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onPatientRowClick(row.original);
            }}
          >
            {formatPatientNameWithDemographics(
              row.original.patientName,
              row.original.age,
              row.original.gender,
            )}
          </button>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">ACTIONS</span>,
        cell: ({ row }) => {
          const isView = row.original.actionLabel === 'View RX';
          const isCreate = row.original.actionLabel === 'Create Rx';
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              asChild
              onClick={stopRowClick}
            >
              <Link
                to="/create-rx/$visitId"
                params={{ visitId: row.original.id }}
                search={{
                  mode: isView ? 'view' : 'edit',
                  loadPrescription: !isCreate,
                  patientId: row.original.patientId,
                }}
                onClick={stopRowClick}
              >
                {row.original.actionLabel}
              </Link>
            </Button>
          );
        },
      },
      {
        accessorKey: 'doctorName',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">DOCTOR</span>,
        cell: ({ row }) => <span className="text-sm">{row.original.doctorName}</span>,
      },
      {
        id: 'visitCreated',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">VISIT CREATED</span>,
        cell: ({ row }) => (
          <span className="text-sm">{formatOpdVisitCreated(row.original.visitCreatedAt)}</span>
        ),
      },
      {
        id: 'status',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">STATUS</span>,
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${opdStatusBadgeClass(row.original.status)}`}
          >
            {opdStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: 'report',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">REPORT</span>,
        cell: ({ row }) =>
          row.original.status === 'completed' && onOpenReport ? (
            <PatientReportsDropdown
              onClick={stopRowClick}
              onSelectReport={(reportType) => onOpenReport(row.original, reportType)}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [onPatientRowClick, onOpenReport],
  );

  return (
    <div className="overflow-hidden [&_thead]:bg-[#F8FAFC]">
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        onRowClick={onPatientRowClick}
        emptyTitle="No data available"
        emptyDescription="No front-desk registrations match the current filters."
        manualPagination={{
          pageIndex: page - 1,
          pageSize,
          total,
          onPageChange: (pageIndex) => onPageChange(pageIndex + 1),
          onPageSizeChange: () => {},
        }}
      />
    </div>
  );
}
