import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Button } from "@pulse/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@pulse/ui/dropdown-menu"
import { Input } from "@pulse/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pulse/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pulse/ui/table"
import { Checkbox } from "@pulse/ui/checkbox"
import { ChevronDown, Filter, Search } from "lucide-react"
import { ICON_STROKE_WIDTH } from "@pulse/constants"
import { cn } from "@pulse/utils"

export interface DataTableFilter {
  key: string
  label: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
  /** Overrides the default “All {label}” text for the synthetic “all” option. */
  allOptionLabel?: string
}

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  searchPlaceholder?: string
  searchColumn?: string
  /**
   * When set, the search box uses TanStack global filter with this predicate (order #, patient, tests, etc.).
   * Ignores single-column `searchColumn` filtering for the search input.
   */
  matchesSearch?: (row: TData, query: string) => boolean
  /**
   * Controlled global search string (e.g. Samples page header). When set, filtering follows this value.
   * Use with `matchesSearch` and often `showSearch={false}` when the input lives in the parent.
   */
  searchQuery?: string
  /** Called when the user types in the built-in search box while `searchQuery` is controlled. */
  onSearchQueryChange?: (value: string) => void
  /** When false, the search input is hidden (e.g. when search is in page header). Default true. */
  showSearch?: boolean
  filters?: DataTableFilter[]
  /** When provided with onFiltersChange, filter dropdowns are controlled (for server-side filtering) */
  filterValues?: Record<string, string[]>
  onFiltersChange?: (values: Record<string, string[]>) => void
  /** Renders after filter dropdowns in the toolbar (e.g. “Clear filters”). */
  filterActions?: React.ReactNode
  actions?: React.ReactNode
  enableSelection?: boolean
  enableColumnVisibility?: boolean
  enablePagination?: boolean
  pageSizeOptions?: number[]
  emptyMessage?: string
  isLoading?: boolean
  onRowSelectionChange?: (selectedRows: TData[]) => void
  /** When provided, selection is controlled; pass the record back via onRowSelectionRecordChange */
  rowSelection?: Record<string, boolean>
  onRowSelectionRecordChange?: (record: Record<string, boolean>) => void
  /** When provided, clicking a row (excluding buttons/links/checkboxes) calls this */
  onRowClick?: (row: TData) => void
  /**
   * Like onRowClick but receives the TanStack Table row (e.g. to call row.toggleExpanded()).
   * Fires for the same clicks as onRowClick; both may be set.
   */
  onTableRowClick?: (row: Row<TData>) => void
  /** Stable row id for selection state; if not provided, row index is used */
  getRowId?: (originalRow: TData, index: number) => string
  /** When provided, rows can have sub-rows; pass a function that returns sub-rows for each row */
  getSubRows?: (row: TData) => TData[] | undefined
  /** When provided, returns an extra className for each row */
  getRowClassName?: (row: TData) => string | undefined
  /** Passed to the inner `<table>` (e.g. `table-fixed` to prevent column reflow when rows change). */
  tableClassName?: string
  /**
   * With `getSubRows`, these parent row ids (from `getRowId`) are expanded on mount/update
   * (e.g. after a search so child rows are visible).
   */
  defaultExpandedRowIds?: string[]
  /** Initial column visibility (e.g. hide filter-only columns). */
  defaultColumnVisibility?: VisibilityState
}

function layoutClassFromMeta(meta: unknown): string | undefined {
  if (meta && typeof meta === "object" && "layoutClassName" in meta) {
    const v = (meta as { layoutClassName?: unknown }).layoutClassName
    return typeof v === "string" ? v : undefined
  }
  return undefined
}

/**
 * DataTable Block
 * 
 * A comprehensive data table component with search, filters, pagination,
 * column visibility, and row selection capabilities.
 * 
 * @example
 * ```tsx
 * <DataTable
 *   data={customers}
 *   columns={columns}
 *   searchPlaceholder="Search customers..."
 *   searchColumn="email"
 *   filters={[
 *     {
 *       key: "status",
 *       label: "Status",
 *       options: [
 *         { value: "all", label: "All Status" },
 *         { value: "active", label: "Active" },
 *         { value: "inactive", label: "Inactive" }
 *       ]
 *     }
 *   ]}
 *   actions={<Button>Add Customer</Button>}
 * />
 * ```
 */
export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchColumn,
  matchesSearch,
  searchQuery: searchQueryProp,
  onSearchQueryChange,
  showSearch = true,
  filters = [],
  filterValues: controlledFilterValues,
  onFiltersChange,
  filterActions,
  actions,
  enableSelection = true,
  enableColumnVisibility = true,
  enablePagination = true,
  pageSizeOptions = [10, 20, 30, 40, 50],
  emptyMessage = "No results.",
  isLoading = false,
  onRowSelectionChange,
  getRowId,
  getSubRows,
  rowSelection: rowSelectionProp,
  onRowSelectionRecordChange,
  onRowClick,
  onTableRowClick,
  getRowClassName,
  tableClassName,
  defaultExpandedRowIds,
  defaultColumnVisibility,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    () => defaultColumnVisibility ?? {},
  )
  const [internalRowSelection, setInternalRowSelection] = React.useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = React.useState<Record<string, boolean> | true>({})
  const [internalFilterValues, setInternalFilterValues] = React.useState<Record<string, string[]>>({})
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("")
  const isControlled = controlledFilterValues !== undefined && onFiltersChange !== undefined
  const isSelectionControlled = rowSelectionProp !== undefined
  const rowSelection = isSelectionControlled ? rowSelectionProp : internalRowSelection
  const setRowSelection = React.useCallback(
    (updater: React.SetStateAction<Record<string, boolean>>) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater
      if (!isSelectionControlled) setInternalRowSelection(next)
      onRowSelectionRecordChange?.(next)
    },
    [isSelectionControlled, rowSelection, onRowSelectionRecordChange]
  )
  const filterValues = isControlled ? controlledFilterValues : internalFilterValues
  const setFilterValues = isControlled ? onFiltersChange : setInternalFilterValues

  const selectColumn: ColumnDef<TData> = React.useMemo(
    () => ({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    }),
    []
  )

  const fullColumns = React.useMemo<ColumnDef<TData>[]>(
    () => (enableSelection ? [selectColumn, ...columns] : columns),
    [enableSelection, selectColumn, columns]
  )

  const globalFilterValue = matchesSearch
    ? searchQueryProp !== undefined
      ? searchQueryProp
      : internalGlobalFilter
    : ""

  const globalFilterFn = React.useMemo(() => {
    if (!matchesSearch) return undefined
    return (row: Row<TData>, _columnId: string, filterValue: unknown) => {
      const q = String(filterValue ?? "").trim()
      if (!q) return true
      return matchesSearch(row.original, q)
    }
  }, [matchesSearch])

  const expandIdsKey = defaultExpandedRowIds?.join("\0") ?? ""

  React.useEffect(() => {
    if (!getSubRows || !defaultExpandedRowIds?.length) return
    setExpanded((prev) => {
      const base = typeof prev === "object" && prev !== null && !Array.isArray(prev) ? { ...prev } : {}
      for (const id of defaultExpandedRowIds) {
        base[id] = true
      }
      return base
    })
  }, [expandIdsKey, getSubRows, data, defaultExpandedRowIds])

  const table = useReactTable({
    data,
    columns: fullColumns,
    getRowId,
    getSubRows,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: (updater) => {
      setExpanded((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        return typeof next === "object" && next !== null ? next : {}
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
    globalFilterFn: globalFilterFn ?? undefined,
    onGlobalFilterChange: matchesSearch
      ? (updater) => {
          const prev =
            searchQueryProp !== undefined ? searchQueryProp : internalGlobalFilter
          const next = typeof updater === "function" ? updater(prev) : updater
          const str = String(next ?? "")
          if (searchQueryProp !== undefined) {
            onSearchQueryChange?.(str)
          } else {
            setInternalGlobalFilter(str)
          }
        }
      : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      ...(matchesSearch ? { globalFilter: globalFilterValue } : {}),
    },
  })

  // Determine search column - use provided or first text column
  const searchColumnKey = React.useMemo(() => {
    if (searchColumn) return searchColumn
    // Find first column that's likely a text/searchable column
    const firstColumn = columns.find((col) => {
      const id = typeof col.id === "string" ? col.id : undefined
      return id && !id.includes("select") && !id.includes("actions")
    })
    return typeof firstColumn?.id === "string" ? firstColumn.id : undefined
  }, [searchColumn, columns])

  // Handle filter changes
  React.useEffect(() => {
    filters.forEach((filter) => {
      const column = table.getColumn(filter.key)
      if (column) {
        const filterValue = filterValues[filter.key]
        if (filterValue && filterValue.length > 0 && filterValue[0] !== "all") {
          column.setFilterValue(filterValue)
        } else {
          column.setFilterValue(undefined)
        }
      }
    })
  }, [filterValues, filters, table])

  // Notify parent of row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, table, onRowSelectionChange])

  const handleFilterChange = (filterKey: string, value: string) => {
    const next = {
      ...filterValues,
      [filterKey]: value === "all" ? [] : [value],
    }
    setFilterValues(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {showSearch && matchesSearch && (
            <div className="relative" style={{ width: "240px" }}>
              <Search
                strokeWidth={ICON_STROKE_WIDTH}
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                placeholder={searchPlaceholder}
                value={
                  searchQueryProp !== undefined
                    ? searchQueryProp
                    : String(table.getState().globalFilter ?? "")
                }
                onChange={(event) => {
                  const v = event.target.value
                  if (searchQueryProp !== undefined) {
                    onSearchQueryChange?.(v)
                  } else {
                    table.setGlobalFilter(v)
                  }
                }}
                className="pl-9 w-full"
              />
            </div>
          )}
          {showSearch && !matchesSearch && searchColumnKey && (
            <div className="relative" style={{ width: "240px" }}>
              <Search
                strokeWidth={ICON_STROKE_WIDTH}
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchColumnKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchColumnKey)?.setFilterValue(event.target.value)
                }
                className="pl-9 w-full"
              />
            </div>
          )}
          {filters.map((filter) => {
            const currentValue =
              filterValues[filter.key]?.length > 0 ? filterValues[filter.key][0] : "all"
            return (
              <Select
                key={filter.key}
                value={currentValue}
                onValueChange={(value) => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger className="w-[140px]">
                  {filter.key === filters[0]?.key && (
                    <Filter className="size-4" data-icon="inline-start" />
                  )}
                  <SelectValue placeholder={filter.placeholder || filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{filter.allOptionLabel ?? `All ${filter.label}`}</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )
          })}
          {filterActions}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="min-w-0 overflow-hidden rounded-md border">
        <Table className={cn(tableClassName)}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={layoutClassFromMeta(header.column.columnDef.meta)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={fullColumns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
                  if (!onRowClick && !onTableRowClick) return
                  const target = e.target as HTMLElement
                  if (target.closest("button, a, [data-slot='checkbox']")) return
                  onTableRowClick?.(row)
                  onRowClick?.(row.original)
                }
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      row.depth > 0 && "bg-muted/30",
                      (onRowClick || onTableRowClick) && "cursor-pointer",
                      getRowClassName?.(row.original)
                    )}
                    onClick={handleRowClick}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <TableCell
                        key={cell.id}
                        className={layoutClassFromMeta(cell.column.columnDef.meta)}
                        style={
                          row.depth > 0 && cellIndex === 0
                            ? { paddingLeft: `${20 + row.depth * 24}px` }
                            : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={fullColumns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination and Selection Info */}
      {enablePagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {enableSelection && (
            <div className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span>Rows per page</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {pageSizeOptions.map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

