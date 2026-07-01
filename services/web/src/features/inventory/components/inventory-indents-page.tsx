import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Minus, Plus } from 'lucide-react';
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
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { useInventoryIndents } from '../api/queries';
import type { InventoryIndentRow, InventoryIndentStatus } from '../types';
import { InventoryPageShell } from './inventory-page-shell';

const STATUS_OPTIONS: Array<{ value: 'all' | InventoryIndentStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Approved', label: 'Approved' },
  { value: 'In Fulfillment', label: 'In Fulfillment' },
  { value: 'Fulfilled', label: 'Fulfilled' },
];

function formatIndentDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadgeVariant(status: InventoryIndentStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'Approved') return 'default';
  if (status === 'Draft') return 'secondary';
  return 'outline';
}

function IndentLinesSubRow({ lines }: { lines: InventoryIndentRow['lines'] }) {
  if (lines.length === 0) {
    return (
      <div className="bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No items on this indent.
      </div>
    );
  }
  return (
    <div className="bg-muted/30 px-4 py-3">
      <ul className="space-y-2 text-sm">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium">{line.item_name}</span>
              <span className="text-muted-foreground"> · {line.item_code}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {line.requested_qty} {line.uom}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InventoryIndentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | InventoryIndentStatus>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useInventoryIndents({
    search: search || undefined,
    status,
    page,
    limit: pageSize,
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<ColumnDef<InventoryIndentRow, unknown>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        meta: { label: '#', headerClassName: 'w-12' },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {(page - 1) * pageSize + row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'indent_number',
        header: 'Indent #',
        meta: { label: 'Indent #' },
        cell: ({ getValue }) => (
          <span className="font-medium text-primary">{getValue<string>()}</span>
        ),
      },
      { accessorKey: 'request_date', header: 'Request date', meta: { label: 'Request date' },
        cell: ({ getValue }) => formatIndentDate(getValue<string>()),
      },
      { accessorKey: 'from_store', header: 'From store', meta: { label: 'From store' } },
      { accessorKey: 'to_store', header: 'To store', meta: { label: 'To store' } },
      { accessorKey: 'route', header: 'Route', meta: { label: 'Route' } },
      { accessorKey: 'priority', header: 'Priority', meta: { label: 'Priority' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => (
          <Badge variant={statusBadgeVariant(getValue<InventoryIndentStatus>())}>
            {getValue<string>()}
          </Badge>
        ),
      },
      {
        id: 'expand',
        header: '',
        meta: { headerClassName: 'w-12' },
        cell: ({ row }) => {
          const isOpen = expandedId === row.original.id;
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={isOpen ? 'Collapse indent lines' : 'Expand indent lines'}
              onClick={(event) => {
                event.stopPropagation();
                setExpandedId(isOpen ? null : row.original.id);
              }}
            >
              {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
            </Button>
          );
        },
      },
    ],
    [expandedId, page, pageSize],
  );

  return (
    <InventoryPageShell
      title="Indents"
      breadcrumbLabel="Indents"
      actions={
        <Button type="button" size="sm" asChild>
          <Link to="/inventory/indents/new">+ New Indent</Link>
        </Button>
      }
    >
      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <EntityTableToolbar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search Indent #"
            debounceMs={0}
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as typeof status);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
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
            getRowId={(row) => row.id}
            expandedRowId={expandedId}
            renderSubRow={(row) => <IndentLinesSubRow lines={row.lines} />}
            emptyTitle="No indents"
            emptyDescription="Create a new indent to request stock transfer or procurement."
            manualPagination={{
              pageIndex: page - 1,
              pageSize,
              total,
              pageSizeOptions: [10, 20, 50],
              onPageChange: (pageIndex) => setPage(pageIndex + 1),
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
            }}
          />
        </div>
      </div>
    </InventoryPageShell>
  );
}
