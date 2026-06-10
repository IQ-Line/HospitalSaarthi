import { useState } from 'react';
import { Columns3 } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { Skeleton } from '@pulse/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@pulse/ui/empty';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';

function isInteractiveTableRowTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="button"], [role="menuitem"], [role="menu"], [role="combobox"], [data-slot="dropdown-menu-trigger"], [data-slot="dropdown-menu-content"]',
    ),
  );
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
  /** Show TanStack column visibility menu (reference UI “Columns”). */
  showColumnMenu?: boolean;
  /** Server-driven pagination; when set, table shows pager footer and does not slice rows client-side. */
  manualPagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: readonly number[];
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyTitle = 'No results',
  emptyDescription = 'No records found.',
  onRowClick,
  showColumnMenu = false,
  manualPagination,
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const paginationState: PaginationState | undefined = manualPagination
    ? { pageIndex: manualPagination.pageIndex, pageSize: manualPagination.pageSize }
    : undefined;
  const pageCount =
    manualPagination && manualPagination.total >= 0
      ? Math.max(1, Math.ceil(manualPagination.total / manualPagination.pageSize))
      : undefined;

  const onPaginationChange: OnChangeFn<PaginationState> | undefined = manualPagination
    ? (updater) => {
        const prev = {
          pageIndex: manualPagination.pageIndex,
          pageSize: manualPagination.pageSize,
        };
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next.pageSize !== prev.pageSize) {
          manualPagination.onPageSizeChange(next.pageSize);
          manualPagination.onPageChange(0);
        } else if (next.pageIndex !== prev.pageIndex) {
          manualPagination.onPageChange(next.pageIndex);
        }
      }
    : undefined;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination && paginationState && pageCount != null && onPaginationChange
      ? {
          manualPagination: true,
          pageCount,
          state: { columnVisibility, pagination: paginationState },
          onColumnVisibilityChange: setColumnVisibility,
          onPaginationChange,
        }
      : showColumnMenu
        ? {
            state: { columnVisibility },
            onColumnVisibilityChange: setColumnVisibility,
          }
        : {}),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {showColumnMenu ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Columns3 className="size-4" aria-hidden />
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
                    className="capitalize"
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
      ) : null}
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
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={onRowClick ? 'cursor-pointer' : undefined}
              onClick={
                onRowClick
                  ? (event) => {
                      if (isInteractiveTableRowTarget(event.target)) return;
                      onRowClick(row.original);
                    }
                  : undefined
              }
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {manualPagination ? (
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            {manualPagination.total === 0
              ? 0
              : manualPagination.pageIndex * manualPagination.pageSize + 1}
            –
            {Math.min(
              manualPagination.total,
              (manualPagination.pageIndex + 1) * manualPagination.pageSize,
            )}{' '}
            of {manualPagination.total}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(manualPagination.pageSize)}
              onValueChange={(v) => manualPagination.onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="w-[110px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(manualPagination.pageSizeOptions ?? [10, 20, 50]).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={manualPagination.pageIndex <= 0}
              onClick={() => manualPagination.onPageChange(manualPagination.pageIndex - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                (manualPagination.pageIndex + 1) * manualPagination.pageSize >= manualPagination.total
              }
              onClick={() => manualPagination.onPageChange(manualPagination.pageIndex + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
