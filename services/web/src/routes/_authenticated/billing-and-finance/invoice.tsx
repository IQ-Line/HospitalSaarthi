import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import { useBills } from '@/features/billing/api';
import { BillingPageShell } from '@/features/billing/components/billing-page-shell';
import { formatDateTime, formatMoneyDisplay } from '@/features/billing/lib/format';
import type { Bill, BillStatus } from '@/features/billing/types';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';

const EMPTY_BILLS: Bill[] = [];

const STATUS_OPTIONS: { value: 'all' | BillStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'FINALIZED', label: 'Finalized' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REPLACED', label: 'Replaced' },
];

function statusVariant(status: BillStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'PAID':
    case 'CLOSED':
      return 'default';
    case 'CANCELLED':
    case 'REPLACED':
      return 'destructive';
    case 'DRAFT':
      return 'outline';
    default:
      return 'secondary';
  }
}

function shortPatientId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export const Route = createFileRoute('/_authenticated/billing-and-finance/invoice')({
  component: BillingInvoicePage,
});

function BillingInvoicePage() {
  const { canRead } = useCatalogModuleCrud('invoice', {
    productModuleSlug: 'billing-and-finance',
  });
  const [statusFilter, setStatusFilter] = useState<'all' | BillStatus>('all');

  const listParams = useMemo(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    }),
    [statusFilter],
  );

  const { data, isLoading, isFetching, error, refetch } = useBills(listParams, {
    enabled: canRead,
  });
  const bills = data?.data ?? EMPTY_BILLS;

  const columns = useMemo<ColumnDef<Bill, unknown>[]>(
    () => [
      {
        accessorKey: 'bill_number',
        header: 'Invoice #',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'bill_date',
        header: 'Date',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'patient_id',
        header: 'Patient',
        cell: ({ getValue }) => (
          <code className="text-xs" title={getValue<string>()}>
            {shortPatientId(getValue<string>())}
          </code>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const v = getValue<BillStatus>();
          return <Badge variant={statusVariant(v)}>{v}</Badge>;
        },
      },
      {
        accessorKey: 'net_amount',
        header: 'Net',
        cell: ({ getValue }) => formatMoneyDisplay(getValue<string>()),
      },
      {
        accessorKey: 'paid_amount',
        header: 'Paid',
        cell: ({ getValue }) => formatMoneyDisplay(getValue<string>()),
      },
      {
        accessorKey: 'outstanding_amount',
        header: 'Outstanding',
        cell: ({ getValue }) => formatMoneyDisplay(getValue<string>()),
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
    ],
    [],
  );

  return (
    <BillingPageShell
      title="Invoice"
      breadcrumbLabel="Invoice"
      description="Patient invoices and billing documents for the current tenant."
    >
      {canRead ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Refresh
            </Button>
          </div>

          {error && !(error instanceof ApiError && error.status === 403) ? (
            <p className="text-sm text-destructive">{mutationErrorMessage(error)}</p>
          ) : error ? null : (
            <DataTable
              columns={columns}
              data={bills}
              isLoading={isLoading}
              emptyTitle="No invoices yet"
              emptyDescription="Invoices appear here after visit registration or other billing charges."
            />
          )}
        </>
      ) : null}
    </BillingPageShell>
  );
}
