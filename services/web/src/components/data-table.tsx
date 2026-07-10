import { Fragment, useState, type ReactNode } from 'react';
import { Columns3 } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Table as ReactTable,
  type TableOptions,
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

type DataTableColumnMeta = {
  label?: string;
  headerClassName?: string;
  cellClassName?: string;
};

/** Server-driven pagination; when set, table shows pager footer and does not slice rows client-side. */
type ManualPagination = {
  pageIndex: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
  /** Applied to the root `<table>` element (e.g. `table-fixed`). */
  tableClassName?: string;
  /** Wrapper around table + pagination footer. */
  className?: string;
  /** Show TanStack column visibility menu (reference UI “Columns”). */
  showColumnMenu?: boolean;
  manualPagination?: ManualPagination;
  /** When set, renders a full-width row immediately below the matching data row. */
  renderSubRow?: (row: TData) => ReactNode;
  /** Row id used with renderSubRow (e.g. sessionId). */
  expandedRowId?: string | null;
  getRowId?: (row: TData) => string;
  getRowClassName?: (row: TData) => string | undefined;
}

function readColumnMeta(meta: unknown): DataTableColumnMeta {
  return (meta ?? {}) as DataTableColumnMeta;
}

/**
 * Builds the pagination-related slice of TanStack table options. Mirrors the
 * three branches the table needs: manual (server) pagination, column-menu only,
 * or neither. Pure helper so the component render body stays flat.
 */
function buildTableStateOptions<TData>(args: {
  manualPagination: ManualPagination | undefined;
  paginationState: PaginationState | undefined;
  pageCount: number | undefined;
  onPaginationChange: OnChangeFn<PaginationState> | undefined;
  showColumnMenu: boolean;
  columnVisibility: VisibilityState;
  setColumnVisibility: OnChangeFn<VisibilityState>;
}): Partial<TableOptions<TData>> {
  const {
    manualPagination,
    paginationState,
    pageCount,
    onPaginationChange,
    showColumnMenu,
    columnVisibility,
    setColumnVisibility,
  } = args;

  if (manualPagination && paginationState && pageCount != null && onPaginationChange) {
    return {
      manualPagination: true,
      pageCount,
      state: { columnVisibility, pagination: paginationState },
      onColumnVisibilityChange: setColumnVisibility,
      onPaginationChange,
    };
  }
  if (showColumnMenu) {
    return {
      state: { columnVisibility },
      onColumnVisibilityChange: setColumnVisibility,
    };
  }
  return {};
}

function columnVisibilityLabel<TData>(column: Column<TData, unknown>): string {
  const { columnDef } = column;
  if (typeof columnDef.header === 'string') return columnDef.header;
  return readColumnMeta(columnDef.meta).label ?? column.id;
}

function ColumnVisibilityMenu<TData>({ table }: { table: ReactTable<TData> }) {
  return (
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
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(v) => column.toggleVisibility(!!v)}
              >
                {columnVisibilityLabel<TData>(column)}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DataTableHead<TData>({ table }: { table: ReactTable<TData> }) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead
              key={header.id}
              className={readColumnMeta(header.column.columnDef.meta).headerClassName}
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}

function DataTableRow<TData>({
  row,
  onRowClick,
  rowClassName,
  isExpanded,
  renderSubRow,
}: {
  row: ReturnType<ReactTable<TData>['getRowModel']>['rows'][number];
  onRowClick?: (row: TData) => void;
  rowClassName?: string;
  isExpanded?: boolean;
  renderSubRow?: (row: TData) => ReactNode;
}) {
  const className =
    [onRowClick ? 'cursor-pointer' : undefined, rowClassName].filter(Boolean).join(' ') ||
    undefined;
  return (
    <Fragment>
      <TableRow
        className={className}
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
          <TableCell
            key={cell.id}
            className={readColumnMeta(cell.column.columnDef.meta).cellClassName}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
      {isExpanded && renderSubRow ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={row.getVisibleCells().length} className="p-0">
            {renderSubRow(row.original)}
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}

function DataTableBody<TData>({
  table,
  onRowClick,
  renderSubRow,
  expandedRowId,
  getRowId,
  getRowClassName,
}: {
  table: ReactTable<TData>;
  onRowClick?: (row: TData) => void;
  renderSubRow?: (row: TData) => ReactNode;
  expandedRowId?: string | null;
  getRowId?: (row: TData) => string;
  getRowClassName?: (row: TData) => string | undefined;
}) {
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        const rowKey = getRowId?.(row.original) ?? row.id;
        const isExpanded = Boolean(renderSubRow && expandedRowId === rowKey);
        return (
          <DataTableRow<TData>
            key={row.id}
            row={row}
            onRowClick={onRowClick}
            rowClassName={getRowClassName?.(row.original)}
            isExpanded={isExpanded}
            renderSubRow={renderSubRow}
          />
        );
      })}
    </TableBody>
  );
}

function PaginationFooter({ manualPagination }: { manualPagination: ManualPagination }) {
  return (
    <div className="flex flex-col gap-2 border-t px-4 pt-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
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
  );
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
  tableClassName,
  className,
  renderSubRow,
  expandedRowId,
  getRowId,
  getRowClassName,
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
    ...buildTableStateOptions<TData>({
      manualPagination,
      paginationState,
      pageCount,
      onPaginationChange,
      showColumnMenu,
      columnVisibility,
      setColumnVisibility,
    }),
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
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      {showColumnMenu ? <ColumnVisibilityMenu<TData> table={table} /> : null}
      <Table className={tableClassName}>
        <DataTableHead<TData> table={table} />
        <DataTableBody<TData>
          table={table}
          onRowClick={onRowClick}
          renderSubRow={renderSubRow}
          expandedRowId={expandedRowId}
          getRowId={getRowId}
          getRowClassName={getRowClassName}
        />
      </Table>
      {manualPagination ? <PaginationFooter manualPagination={manualPagination} /> : null}
    </div>
  );
}
