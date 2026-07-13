import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { DataTable } from '@/components/data-table';
import { useDispenseReturnsList } from '../../api/dispense-returns';
import {
  formatDispenseDate,
  formatMoney,
  formatReturnReason,
} from '../../lib/return-display';
import type { DispenseReturnSummary } from '../../types/returns-ui.types';
import { PharmacyPageShell } from '../pharmacy-page-shell';

const PAGE_SIZE = 20;

export function PharmacyReturnsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      q: search.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [search, page],
  );

  const { data, isLoading, isError } = useDispenseReturnsList(params);

  const columns = useMemo<ColumnDef<DispenseReturnSummary>[]>(
    () => [
      {
        accessorKey: 'return_number',
        header: 'Return #',
        cell: ({ row }) => (
          <Link
            to="/pharmacy/returns/$returnId"
            params={{ returnId: row.original.id }}
            className="font-medium text-primary hover:underline"
          >
            {row.original.return_number}
          </Link>
        ),
      },
      {
        id: 'patient',
        header: 'Patient',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.patient_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{row.original.uhid ?? '—'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'formatted_visit_id',
        header: 'Visit',
        cell: ({ row }) => row.original.formatted_visit_id ?? '—',
      },
      {
        accessorKey: 'dispense_number',
        header: 'Dispense',
      },
      {
        accessorKey: 'return_reason',
        header: 'Reason',
        cell: ({ row }) => formatReturnReason(row.original.return_reason),
      },
      {
        accessorKey: 'total_return_amount',
        header: 'Return amount',
        cell: ({ row }) => formatMoney(row.original.total_return_amount),
      },
      {
        accessorKey: 'processed_at',
        header: 'Processed',
        cell: ({ row }) => formatDispenseDate(row.original.processed_at),
      },
    ],
    [],
  );

  return (
    <PharmacyPageShell
      title="Returns"
      description="Process medicine returns against completed dispense transactions."
      breadcrumbLabel="Returns"
      actions={
        <Button asChild>
          <Link to="/pharmacy/returns/new">
            <Plus className="mr-2 size-4" />
            New Return
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search return #, patient, UHID, dispense…"
            className="pl-9"
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          emptyTitle="No returns processed yet."
          emptyDescription={isError ? 'Unable to load returns.' : 'Process a return to see it here.'}
          manualPagination={{
            pageIndex: page - 1,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onPageChange: (pageIndex) => setPage(pageIndex + 1),
            onPageSizeChange: () => {
              /* fixed page size */
            },
          }}
        />
      </div>
    </PharmacyPageShell>
  );
}
