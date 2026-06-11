import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Columns3, Filter, Plus, Search } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@pulse/ui/toggle-group';
import { cn } from '@pulse/utils';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { fetchInpatientOrders } from '../api/orders';
import { ipdQueryKeys } from '../api/query-keys';
import { formatEnumLabel } from '../lib/display';
import { mapOrderToTableRow, type EpisodeOrderRow } from '../lib/order-types';

type OrderView = 'all' | 'pending_ack' | 'overdue' | 'by_department';

const ORDER_TYPES = [
  'all',
  'medication',
  'procedure',
  'laboratory',
  'radiology',
  'consumable',
] as const;

const ORDER_PRIORITIES = ['all', 'routine', 'urgent', 'stat'] as const;

const ORDER_STATUSES = [
  'all',
  'pending',
  'acknowledged',
  'in_progress',
  'completed',
  'cancelled',
] as const;

const VIEW_FILTERS: { value: OrderView; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending_ack', label: 'Pending Ack' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'by_department', label: 'By Department' },
];

const PRIORITY_STYLES: Record<EpisodeOrderRow['priority'], string> = {
  routine: 'bg-muted text-muted-foreground',
  urgent: 'bg-amber-100 text-amber-800',
  stat: 'bg-red-100 text-red-800',
};

const STATUS_STYLES: Record<EpisodeOrderRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

function buildColumns(variant: 'full' | 'summary'): ColumnDef<EpisodeOrderRow, unknown>[] {
  const base: ColumnDef<EpisodeOrderRow, unknown>[] = [
    {
      accessorKey: 'orderNumber',
      header: 'Order #',
      meta: { label: 'Order #' },
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{row.original.orderNumber}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      meta: { label: 'Type' },
      cell: ({ row }) => formatEnumLabel(row.original.type),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { label: 'Description' },
      cell: ({ row }) => (
        <span className="max-w-[240px] truncate">{row.original.description}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      meta: { label: 'Priority' },
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            PRIORITY_STYLES[row.original.priority],
          )}
        >
          {row.original.priority}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { label: 'Status' },
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            STATUS_STYLES[row.original.status],
          )}
        >
          {formatEnumLabel(row.original.status)}
        </span>
      ),
    },
  ];

  if (variant === 'summary') {
    return [
      ...base,
      {
        id: 'orderedBy',
        header: 'Ordered By',
        meta: { label: 'Ordered By' },
        cell: () => <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'orderedAt',
        header: 'Ordered At',
        meta: { label: 'Ordered At' },
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">{row.original.orderedAt}</span>
        ),
      },
    ];
  }

  return [
    ...base,
    {
      accessorKey: 'orderedAt',
      header: 'Ordered At',
      meta: { label: 'Ordered At' },
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">{row.original.orderedAt}</span>
      ),
    },
    {
      accessorKey: 'sla',
      header: 'SLA',
      meta: { label: 'SLA' },
      cell: ({ row }) => row.original.sla,
    },
    {
      accessorKey: 'ackBy',
      header: 'Ack By',
      meta: { label: 'Ack By' },
      cell: ({ row }) => row.original.ackBy || '—',
    },
    {
      accessorKey: 'department',
      header: 'Department',
      meta: { label: 'Department' },
      cell: ({ row }) => formatEnumLabel(row.original.department),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { label: 'Actions' },
      enableHiding: false,
      cell: () => (
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled>
          View
        </Button>
      ),
    },
  ];
}

type EpisodeOrderListProps = {
  admissionId: string;
  variant?: 'full' | 'summary';
  onNewOrder?: () => void;
  enabled?: boolean;
};

export function EpisodeOrderList({
  admissionId,
  variant = 'full',
  onNewOrder,
  enabled = true,
}: EpisodeOrderListProps) {
  const [typeFilter, setTypeFilter] = useState<(typeof ORDER_TYPES)[number]>('all');
  const [priorityFilter, setPriorityFilter] =
    useState<(typeof ORDER_PRIORITIES)[number]>('all');
  const [statusFilter, setStatusFilter] = useState<(typeof ORDER_STATUSES)[number]>('all');
  const [viewFilter, setViewFilter] = useState<OrderView>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const debouncedSearch = useDebouncedValue(search, 300);
  const isSummary = variant === 'summary';

  const listParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      orderCategory: typeFilter,
      priority: priorityFilter,
      status: statusFilter,
      q: debouncedSearch,
    }),
    [page, pageSize, typeFilter, priorityFilter, statusFilter, debouncedSearch],
  );

  const { data: ordersPage, isLoading } = useQuery({
    queryKey: ipdQueryKeys.orders(admissionId, listParams),
    queryFn: () =>
      fetchInpatientOrders(admissionId, {
        page,
        limit: pageSize,
        orderCategory: typeFilter === 'all' ? 'all' : typeFilter,
        priority: priorityFilter === 'all' ? 'all' : priorityFilter,
        status: statusFilter === 'all' ? 'all' : statusFilter,
        q: debouncedSearch,
      }),
    enabled,
  });

  const orders = useMemo(
    () => (ordersPage?.data ?? []).map(mapOrderToTableRow),
    [ordersPage?.data],
  );

  const counts = useMemo(
    () => ({
      all: ordersPage?.total ?? 0,
      pendingAck: orders.filter((o) => o.pendingAck).length,
      overdue: orders.filter((o) => o.isOverdue).length,
    }),
    [orders, ordersPage?.total],
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (viewFilter === 'pending_ack' && !order.pendingAck) return false;
      if (viewFilter === 'overdue' && !order.isOverdue) return false;
      return true;
    });
  }, [orders, viewFilter]);

  const pageCount = Math.max(1, ordersPage?.total_pages ?? 1);
  const columns = useMemo(() => buildColumns(variant), [variant]);

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const viewCount = (view: OrderView) => {
    if (view === 'all') return counts.all;
    if (view === 'pending_ack') return counts.pendingAck;
    if (view === 'overdue') return counts.overdue;
    return orders.length;
  };

  const emptyMessage = isSummary ? 'No orders placed' : 'No orders for this episode';

  return (
    <div className={cn(!isSummary && 'overflow-hidden rounded-lg border bg-card')}>
      <div className={cn('space-y-4', isSummary ? 'pb-4' : 'border-b p-4')}>
        {!isSummary ? (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v as (typeof ORDER_TYPES)[number]);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {ORDER_TYPES.filter((t) => t !== 'all').map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatEnumLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select
                  value={priorityFilter}
                  onValueChange={(v) => {
                    setPriorityFilter(v as (typeof ORDER_PRIORITIES)[number]);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {ORDER_PRIORITIES.filter((p) => p !== 'all').map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {formatEnumLabel(priority)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ToggleGroup
              type="single"
              value={viewFilter}
              onValueChange={(v) => {
                if (v) {
                  setViewFilter(v as OrderView);
                  setPage(1);
                }
              }}
              className="flex flex-wrap justify-start gap-1"
            >
              {VIEW_FILTERS.map(({ value, label }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="h-8 rounded-md px-3 text-xs data-[state=on]:bg-muted data-[state=on]:text-foreground"
                >
                  {value === 'by_department' ? label : `${label} (${viewCount(value)})`}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          {onNewOrder ? (
            <Button type="button" size="sm" className="gap-1.5" onClick={onNewOrder}>
              <Plus className="size-4" />
              New Order
            </Button>
          ) : null}

          {!isSummary ? (
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as (typeof ORDER_STATUSES)[number]);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 size-4 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ORDER_STATUSES.filter((s) => s !== 'all').map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatEnumLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Columns3 className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((column) => {
                if (!column.getCanHide()) return null;
                const label =
                  typeof column.columnDef.header === 'string'
                    ? column.columnDef.header
                    : (column.columnDef.meta as { label?: string } | undefined)?.label ??
                      column.id;
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-32 text-center text-muted-foreground"
              >
                Loading orders…
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-32 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          0 of {filteredOrders.length} row(s) selected.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs whitespace-nowrap text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[70px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            Page {ordersPage?.total === 0 ? 1 : page} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount || filteredOrders.length === 0}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
