import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table';
import { formatAbhaNumber, formatHistoricalDateTime, formatPatientNameLink } from '../lib/formatters';
import type { HistoricalRecordRow } from '../types';

interface HistoricalRecordsTableProps {
  rows: HistoricalRecordRow[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function HistoricalRecordsTable({
  rows,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: HistoricalRecordsTableProps) {
  const columns = useMemo<ColumnDef<HistoricalRecordRow, unknown>[]>(
    () => [
      {
        id: 'serial',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">SI.NO</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{(page - 1) * pageSize + row.index + 1}</span>
        ),
      },
      {
        id: 'patientName',
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">PATIENT NAME</span>
        ),
        cell: ({ row }) => (
          <Link
            to="/historical-records/$patientId"
            params={{ patientId: row.original.patientId }}
            className="text-sm font-semibold text-[#2563EB] hover:underline"
          >
            {formatPatientNameLink(
              row.original.patientName,
              row.original.age,
              row.original.gender,
            )}
          </Link>
        ),
      },
      {
        id: 'abhaNumber',
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">ABHA NUMBER</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatAbhaNumber(row.original.abhaNumber)}</span>
        ),
      },
      {
        accessorKey: 'uhid',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">UHID</span>,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.uhid}</span>,
      },
      {
        accessorKey: 'mobileNumber',
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">MOBILE NUMBER</span>
        ),
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.mobileNumber}</span>,
      },
      {
        accessorKey: 'doctorName',
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">DOCTOR NAME</span>
        ),
        cell: ({ row }) => <span className="text-sm">{row.original.doctorName}</span>,
      },
      {
        id: 'lastVisit',
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">LAST VISIT</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatHistoricalDateTime(row.original.lastVisitAt)}</span>
        ),
      },
      {
        accessorKey: 'visitNumber',
        header: () => <span className="text-xs font-semibold tracking-wide text-muted-foreground">VISIT ID</span>,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">{row.original.visitNumber}</span>
        ),
      },
      {
        id: 'lastUpdated',
        header: () => (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">LAST UPDATED</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatHistoricalDateTime(row.original.lastUpdatedAt)}</span>
        ),
      },
    ],
    [page, pageSize],
  );

  return (
    <div className="overflow-hidden [&_thead]:bg-[#F8FAFC]">
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyTitle="No records found"
        emptyDescription="No historical records match the current filters."
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
