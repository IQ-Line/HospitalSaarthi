import { useMemo, useState } from 'react';
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
import { formatEnumLabel } from '../lib/display';
import type { AdmissionDetail } from '../types';
import { NewOrderPanel } from './new-order-panel';

type OrderView = 'all' | 'pending_ack' | 'overdue' | 'by_department';

type EpisodeOrderRow = {
  id: string;
  orderNumber: string;
  type: string;
  description: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';
  orderedAt: string;
  sla: string;
  ackBy: string;
  department: string;
  isOverdue: boolean;
  pendingAck: boolean;
};

const ORDER_TYPES = [
  'all',
  'lab',
  'radiology',
  'pharmacy',
  'nursing',
  'diet',
  'consult',
  'procedure',
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

const ORDER_COLUMNS: ColumnDef<EpisodeOrderRow, unknown>[] = [
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

type OrderTrackerView = 'list' | 'new_order';

type OrderTrackerPanelProps = {
  admission: AdmissionDetail;
};

export function OrderTrackerPanel({ admission }: OrderTrackerPanelProps) {
  const [view, setView] = useState<OrderTrackerView>('list');
  const [orders] = useState<EpisodeOrderRow[]>([]);
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

  const counts = useMemo(
    () => ({
      all: orders.length,
      pendingAck: orders.filter((o) => o.pendingAck).length,
      overdue: orders.filter((o) => o.isOverdue).length,
    }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (typeFilter !== 'all' && order.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && order.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (viewFilter === 'pending_ack' && !order.pendingAck) return false;
      if (viewFilter === 'overdue' && !order.isOverdue) return false;
      if (
        q &&
        !`${order.orderNumber} ${order.description} ${order.department} ${order.type}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [orders, typeFilter, priorityFilter, statusFilter, viewFilter, debouncedSearch]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  const table = useReactTable({
    data: pagedOrders,
    columns: ORDER_COLUMNS,
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

  if (view === 'new_order') {
    return <NewOrderPanel admission={admission} onBack={() => setView('list')} />;
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Order Tracker</h1>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setView('new_order')}>
          <Plus className="size-4" />
          New Order
        </Button>
      </div>

      <div className="flex-1 space-y-4 bg-muted/30 px-4 py-4 md:px-6">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="space-y-4 border-b p-4">
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
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No orders for this episode
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
            <p className="text-xs text-muted-foreground">0 of {filteredOrders.length} row(s) selected.</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
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
                Page {filteredOrders.length === 0 ? 1 : page} of {filteredOrders.length === 0 ? 0 : pageCount}
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
      </div>
    </div>
  );
}
