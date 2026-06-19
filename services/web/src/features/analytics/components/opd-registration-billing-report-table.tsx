import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table';
import type { OpdRegistrationBillingReportRow } from '../types';

interface OpdRegistrationBillingReportTableProps {
  rows: OpdRegistrationBillingReportRow[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (pageIndex: number) => void;
}

export function OpdRegistrationBillingReportTable({
  rows,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: OpdRegistrationBillingReportTableProps) {
  const columns = useMemo<ColumnDef<OpdRegistrationBillingReportRow, unknown>[]>(
    () => [
      {
        accessorKey: 'patient_full_name',
        header: () => headerCell('PATIENT FULL NAME'),
        meta: { headerClassName: 'min-w-[180px]' },
      },
      {
        accessorKey: 'uhid',
        header: () => headerCell('UHID'),
        meta: { headerClassName: 'min-w-[140px]' },
      },
      {
        accessorKey: 'visit_id',
        header: () => headerCell('VISIT ID'),
        meta: { headerClassName: 'min-w-[160px]' },
      },
      {
        accessorKey: 'abha_number',
        header: () => headerCell('ABHA NUMBER'),
        meta: { headerClassName: 'min-w-[140px]' },
      },
      {
        accessorKey: 'abha_address',
        header: () => headerCell('ABHA ADDRESS'),
        meta: { headerClassName: 'min-w-[140px]' },
      },
      {
        accessorKey: 'bill_number',
        header: () => headerCell('BILL NUMBER'),
        meta: { headerClassName: 'min-w-[160px]' },
      },
      {
        accessorKey: 'mobile_number',
        header: () => headerCell('MOBILE NUMBER'),
        meta: { headerClassName: 'min-w-[130px]' },
      },
      {
        accessorKey: 'visit_date_time',
        header: () => headerCell('VISIT DATE / TIME'),
        meta: { headerClassName: 'min-w-[170px]' },
      },
      {
        accessorKey: 'gender',
        header: () => headerCell('GENDER'),
      },
      {
        accessorKey: 'dob_age',
        header: () => headerCell('DOB, AGE'),
        meta: { headerClassName: 'min-w-[180px]' },
      },
      {
        accessorKey: 'registered_doctor',
        header: () => headerCell('REGISTERED DOCTOR'),
        meta: { headerClassName: 'min-w-[150px]' },
      },
      {
        accessorKey: 'consulted_doctor',
        header: () => headerCell('CONSULTED DOCTOR'),
        meta: { headerClassName: 'min-w-[150px]' },
      },
      {
        accessorKey: 'department',
        header: () => headerCell('DEPARTMENT'),
        meta: { headerClassName: 'min-w-[140px]' },
      },
      {
        accessorKey: 'registration_fee',
        header: () => headerCell('REGISTRATION FEE'),
        meta: { headerClassName: 'min-w-[130px]' },
      },
      {
        accessorKey: 'op_consultation_fee',
        header: () => headerCell('OP CONSULTATION FEE'),
        meta: { headerClassName: 'min-w-[150px]' },
      },
      {
        accessorKey: 'total_fees_collected',
        header: () => headerCell('TOTAL FEES COLLECTED'),
        meta: { headerClassName: 'min-w-[160px]' },
      },
      {
        accessorKey: 'visit_type',
        header: () => headerCell('VISIT TYPE'),
        meta: { headerClassName: 'min-w-[150px]' },
      },
    ],
    [],
  );

  return (
    <div className="overflow-x-auto">
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyTitle="No visits in this range"
        emptyDescription="Adjust the date range or registration source, then click Load report."
        tableClassName="min-w-[2200px]"
        manualPagination={{
          pageIndex: page - 1,
          pageSize,
          total,
          onPageChange,
          onPageSizeChange: () => undefined,
        }}
      />
    </div>
  );
}

function headerCell(label: string) {
  return (
    <span className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</span>
  );
}
