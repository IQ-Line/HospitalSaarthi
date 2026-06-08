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
  formatRxNumber,
  formatShortVisitId,
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
  onPageChange: (page: number) => void;
}

function colMeta(width: string, extra = '') {
  const classes = `${width} whitespace-nowrap px-3 py-2 ${extra}`.trim();
  return { headerClassName: classes, cellClassName: classes };
}

export function PharmacyQueueTable({
  rows,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: PharmacyQueueTableProps) {
  const columns = useMemo<ColumnDef<PharmacyQueueItem, unknown>[]>(
    () => [
      {
        id: 'rxNumber',
        meta: colMeta('w-[10.5rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">RX #</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {row.original.walk_in_order ? 'Walk-in' : formatRxNumber(row.original.prescription_id)}
          </span>
        ),
      },
      {
        id: 'visitId',
        meta: colMeta('w-[6.5rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">VISIT ID</span>
        ),
        cell: ({ row }) => (
          <span
            className="font-mono text-sm tabular-nums"
            title={row.original.visit_id ?? row.original.record_id ?? undefined}
          >
            {formatShortVisitId(row.original.visit_id)}
          </span>
        ),
      },
      {
        id: 'patient',
        meta: {
          headerClassName: 'px-3 py-2',
          cellClassName: 'px-3 py-2 whitespace-normal',
        },
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">PATIENT</span>
        ),
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-[#2563EB]">{formatPatientDisplay(row.original)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatQueuePatientSecondaryId(row.original)}
            </p>
          </div>
        ),
      },
      {
        id: 'doctor',
        meta: colMeta('w-[9rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">DOCTOR</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatDoctorDisplay(row.original)}</span>
        ),
      },
      {
        id: 'status',
        meta: colMeta('w-[6.5rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">STATUS</span>
        ),
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${pharmacyQueueStatusBadgeClass(row.original.has_dispense)}`}
          >
            {pharmacyQueueStatusLabel(row.original.has_dispense)}
          </span>
        ),
      },
      {
        id: 'queued',
        meta: colMeta('w-[10rem]'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">QUEUED</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{formatPharmacyQueuedAt(row.original.updated_at)}</span>
        ),
      },
      {
        id: 'actions',
        meta: colMeta('w-[9.5rem]', 'text-right'),
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">ACTIONS</span>
        ),
        cell: ({ row }) =>
          row.original.walk_in_order && row.original.record_id ? (
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs" asChild>
              <Link
                to="/pharmacy/walk-in-orders/$recordId"
                params={{ recordId: row.original.record_id }}
              >
                {row.original.has_dispense ? 'View dispense' : 'Issue Medicines'}
              </Link>
            </Button>
          ) : row.original.visit_id ? (
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs" asChild>
              <Link
                to="/pharmacy/visits/$visitId"
                params={{ visitId: row.original.visit_id }}
              >
                {row.original.has_dispense ? 'View dispense' : 'Issue Medicines'}
              </Link>
            </Button>
          ) : null,
      },
    ],
    [],
  );

  return (
    <DataTable
      tableClassName="table-fixed"
      className="overflow-hidden [&_thead]:bg-[#F8FAFC]"
      columns={columns}
      data={rows}
      isLoading={isLoading}
      emptyTitle="No prescriptions in queue"
      emptyDescription="OPD visits with prescriptions and walk-in dispense orders appear here."
      manualPagination={{
        pageIndex: page - 1,
        pageSize,
        total,
        onPageChange: (pageIndex) => onPageChange(pageIndex + 1),
        onPageSizeChange: () => {},
      }}
    />
  );
}
