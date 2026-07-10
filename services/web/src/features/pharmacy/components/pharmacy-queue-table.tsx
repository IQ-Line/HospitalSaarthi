import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@pulse/ui/button';
import { DataTable } from '@/components/data-table';
import {
  formatDoctorDisplay,
  formatPatientDisplay,
  formatPharmacyQueuedAt,
  formatQueuePatientSecondaryId,
  formatQueueVisitDisplay,
  formatRxNumber,
  pharmacyQueuePriorityBadgeClass,
  pharmacyQueuePriorityLabel,
  pharmacyQueueStatusBadgeClass,
  pharmacyQueueStatusLabel,
} from '../lib/pharmacy-queue-display';
import type { PharmacyQueueItem } from '../types';

interface PharmacyQueueTableProps {
  rows: PharmacyQueueItem[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

function colMeta(width: string, extra = '') {
  const classes = `${width} max-w-full px-3 py-2 overflow-hidden ${extra}`.trim();
  return { headerClassName: classes, cellClassName: classes };
}

function truncateCell(content: string, className = 'text-sm') {
  return (
    <span className={`block truncate ${className}`} title={content}>
      {content}
    </span>
  );
}

function canIssueMedicines(row: PharmacyQueueItem): boolean {
  return row.dispense_status !== 'issued';
}

export function PharmacyQueueTable({
  rows,
  isLoading,
  total,
  page,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  emptyTitle = 'No prescriptions in queue',
  emptyDescription = 'Completed OPD visits with prescriptions appear here.',
}: PharmacyQueueTableProps) {
  const columns = useMemo<ColumnDef<PharmacyQueueItem, unknown>[]>(
    () => [
      {
        id: 'rxNumber',
        meta: colMeta('w-[10.5rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Rx #</span>
        ),
        cell: ({ row }) =>
          truncateCell(
            row.original.walk_in_order ? 'Walk-in' : formatRxNumber(row.original.prescription_id),
            'text-sm font-medium tabular-nums',
          ),
      },
      {
        id: 'visitId',
        meta: colMeta('w-[11rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Visit ID</span>
        ),
        cell: ({ row }) => {
          const label = formatQueueVisitDisplay(row.original);
          return truncateCell(label, 'text-sm tabular-nums');
        },
      },
      {
        id: 'patient',
        meta: {
          headerClassName: 'min-w-[12rem] px-3 py-2',
          cellClassName: 'min-w-[12rem] max-w-[16rem] px-3 py-2 overflow-hidden',
        },
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Patient Details
          </span>
        ),
        cell: ({ row }) => {
          const secondaryId = formatQueuePatientSecondaryId(row.original);
          const patientLabel = formatPatientDisplay(row.original);
          return (
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-semibold text-[#2563EB]" title={patientLabel}>
                {patientLabel}
              </p>
              <p className="truncate text-xs text-muted-foreground tabular-nums" title={secondaryId}>
                {secondaryId}
              </p>
            </div>
          );
        },
      },
      {
        id: 'queued',
        meta: colMeta('w-[10rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Queued Date & Time
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatPharmacyQueuedAt(row.original.queued_at ?? row.original.updated_at)}
          </span>
        ),
      },
      {
        id: 'doctor',
        meta: colMeta('w-[9rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Doctor</span>
        ),
        cell: ({ row }) => truncateCell(formatDoctorDisplay(row.original)),
      },
      {
        id: 'status',
        meta: colMeta('w-[6.5rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Status</span>
        ),
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${pharmacyQueueStatusBadgeClass(row.original.dispense_status)}`}
          >
            {pharmacyQueueStatusLabel(row.original.dispense_status)}
          </span>
        ),
      },
      {
        id: 'priority',
        meta: colMeta('w-[7rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Priority</span>
        ),
        cell: ({ row }) => {
          const priority = row.original.priority ?? 'routine';
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${pharmacyQueuePriorityBadgeClass(priority)}`}
            >
              {pharmacyQueuePriorityLabel(priority)}
            </span>
          );
        },
      },
      {
        id: 'actions',
        meta: colMeta('w-[9.5rem]', 'text-right'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Actions</span>
        ),
        cell: ({ row }) => {
          if (row.original.walk_in_order && row.original.record_id) {
            return (
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs" asChild>
                <Link
                  to="/pharmacy/walk-in-orders/$recordId"
                  params={{ recordId: row.original.record_id }}
                >
                  {row.original.has_dispense ? 'View dispense' : 'Issue Medicines'}
                </Link>
              </Button>
            );
          }
          if (!row.original.visit_id) return null;
          const label = canIssueMedicines(row.original) ? 'Issue Medicines' : 'View dispense';
          return (
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs" asChild>
              <Link to="/pharmacy/visits/$visitId" params={{ visitId: row.original.visit_id }}>
                {label}
              </Link>
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <DataTable
      tableClassName="w-full table-fixed"
      className="overflow-x-auto rounded-lg bg-white shadow-md [&_thead]:bg-[#F8FAFC]"
      columns={columns}
      data={rows}
      isLoading={isLoading}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      manualPagination={{
        pageIndex: page - 1,
        pageSize,
        total,
        pageSizeOptions,
        onPageChange: (pageIndex) => onPageChange(pageIndex + 1),
        onPageSizeChange: onPageSizeChange ?? (() => {}),
      }}
    />
  );
}
