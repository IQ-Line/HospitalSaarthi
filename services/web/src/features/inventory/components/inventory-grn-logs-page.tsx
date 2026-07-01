import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Clock, FileText, ShoppingCart } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { cn } from '@pulse/utils';
import { DataTable } from '@/components/data-table';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { useInventoryGrnLogs } from '../api/queries';
import type { InventoryGrnLogRow, InventoryGrnStatus, InventoryGrnType } from '../types';
import { InventoryPageShell } from './inventory-page-shell';

type SummaryFilter = 'all' | 'draft' | 'submitted' | 'purchase';

const TYPE_OPTIONS: Array<{ value: 'all' | InventoryGrnType; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Transfer', label: 'Transfer' },
];

function formatGrnDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSubmittedAt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryCard({
  title,
  count,
  hint,
  icon: Icon,
  active,
  onClick,
}: {
  title: string;
  count: number;
  hint: string;
  icon: typeof FileText;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40',
        active && 'border-primary ring-1 ring-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tabular-nums">{count}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </button>
  );
}

export function InventoryGrnLogsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | InventoryGrnType>('all');
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');

  const { data, isLoading } = useInventoryGrnLogs({
    search: search || undefined,
    type,
    summary_filter: summaryFilter === 'all' ? undefined : summaryFilter,
  });

  const rows = data?.data ?? [];
  const summary = data?.summary;

  const columns = useMemo<ColumnDef<InventoryGrnLogRow, unknown>[]>(
    () => [
      {
        accessorKey: 'grn_number',
        header: 'GRN #',
        meta: { label: 'GRN #' },
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => {
          const status = getValue<InventoryGrnStatus>();
          if (status === 'Submitted') {
            return <Badge>{status}</Badge>;
          }
          return <span className="text-muted-foreground">{status}</span>;
        },
      },
      { accessorKey: 'type', header: 'Type', meta: { label: 'Type' } },
      {
        accessorKey: 'grn_date',
        header: 'GRN date',
        meta: { label: 'GRN date' },
        cell: ({ getValue }) => formatGrnDate(getValue<string>()),
      },
      {
        accessorKey: 'invoice_number',
        header: 'Invoice / voucher',
        meta: { label: 'Invoice / voucher' },
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'submitted_at',
        header: 'Submitted',
        meta: { label: 'Submitted' },
        cell: ({ getValue }) => {
          const value = getValue<string | null>();
          return value ? formatSubmittedAt(value) : '—';
        },
      },
      {
        id: 'actions',
        header: '',
        meta: { headerClassName: 'w-20' },
        cell: ({ row }) =>
          row.original.status === 'Draft' ? (
            <Button type="button" variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/inventory/grn-logs/new">Edit</Link>
            </Button>
          ) : (
            <Button type="button" variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/inventory/grn-logs/new">View</Link>
            </Button>
          ),
      },
    ],
    [],
  );

  return (
    <InventoryPageShell
      title="GRN Logs"
      breadcrumbLabel="GRN logs"
      actions={
        <Button type="button" size="sm" asChild>
          <Link to="/inventory/grn-logs/new">+ New GRN</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="All GRNs"
          count={summary?.all ?? 0}
          hint="Draft and submitted receipts"
          icon={FileText}
          active={summaryFilter === 'all'}
          onClick={() => setSummaryFilter('all')}
        />
        <SummaryCard
          title="Draft"
          count={summary?.draft ?? 0}
          hint="Not yet submitted to stock"
          icon={Clock}
          active={summaryFilter === 'draft'}
          onClick={() => setSummaryFilter('draft')}
        />
        <SummaryCard
          title="Submitted"
          count={summary?.submitted ?? 0}
          hint="Posted to inventory ledger"
          icon={CheckCircle2}
          active={summaryFilter === 'submitted'}
          onClick={() => setSummaryFilter('submitted')}
        />
        <SummaryCard
          title="Purchase"
          count={summary?.purchase ?? 0}
          hint="Vendor purchase receipts"
          icon={ShoppingCart}
          active={summaryFilter === 'purchase'}
          onClick={() => setSummaryFilter('purchase')}
        />
      </div>

      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <EntityTableToolbar
            value={search}
            onChange={setSearch}
            placeholder="GRN #, status, type, invoice…"
            debounceMs={0}
          />
          <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="p-3 pt-0">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyTitle="No GRN logs"
            emptyDescription="Create a new GRN to record goods received."
          />
        </div>
      </div>
    </InventoryPageShell>
  );
}
