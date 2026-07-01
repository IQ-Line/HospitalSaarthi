import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  Download,
  LayoutGrid,
  List,
  MoreVertical,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { Input } from '@pulse/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@pulse/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { useInventoryStock, useInventoryStores } from '../api/queries';
import type { InventoryStockRow, InventoryStockStatus } from '../types';
import { InventoryPageShell } from './inventory-page-shell';
import {
  InventoryStockDetailSheet,
  InventoryStockDisplayPopoverContent,
  InventoryStockGrid,
  InventoryStockIndentLink,
} from './inventory-stock-detail-sheet';
import { InventoryStockStatusLabel } from './inventory-stock-status';

type StockViewMode = 'list' | 'grid';

const ROW_STATUS_CLASS: Record<InventoryStockStatus, string> = {
  critical: 'bg-destructive/5 hover:bg-destructive/10',
  low: 'bg-amber-500/5 hover:bg-amber-500/10',
  normal: '',
};

interface InventoryStockPageProps {
  initialStatus?: 'all' | InventoryStockStatus;
}

export function InventoryStockPage({ initialStatus = 'all' }: InventoryStockPageProps) {
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState<string>('store-cms');
  const [viewMode, setViewMode] = useState<StockViewMode>('list');
  const [showReorderColumn, setShowReorderColumn] = useState(true);
  const [showUomColumn, setShowUomColumn] = useState(true);
  const [minReorderMode, setMinReorderMode] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<InventoryStockStatus>>(
    () =>
      new Set(
        initialStatus === 'all' ? (['critical', 'low', 'normal'] as const) : [initialStatus],
      ),
  );
  const [selectedRow, setSelectedRow] = useState<InventoryStockRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: stores = [] } = useInventoryStores();
  const { data, isLoading } = useInventoryStock({
    search: search || undefined,
    store_id: storeId,
    status: 'all',
  });

  const storeName = stores.find((store) => store.id === storeId)?.name ?? 'Store';
  const allRows = data?.data ?? [];
  const filteredRows = allRows.filter((row) => statusFilters.has(row.status));
  const summary = {
    critical: filteredRows.filter((row) => row.status === 'critical').length,
    low: filteredRows.filter((row) => row.status === 'low').length,
    normal: filteredRows.filter((row) => row.status === 'normal').length,
  };

  const openRowDetail = (row: InventoryStockRow) => {
    setSelectedRow(row);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      window.setTimeout(() => setSelectedRow(null), 200);
    }
  };

  const toggleStatusFilter = (status: InventoryStockStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const columns = useMemo<ColumnDef<InventoryStockRow, unknown>[]>(() => {
    const defs: ColumnDef<InventoryStockRow, unknown>[] = [
      {
        id: 'index',
        header: '#',
        meta: { label: '#', headerClassName: 'w-12' },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>
        ),
      },
      { accessorKey: 'item_name', header: 'Item', meta: { label: 'Item' } },
      {
        accessorKey: 'item_code',
        header: 'Code',
        meta: { label: 'Code' },
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        meta: { label: 'Qty' },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            {row.original.status !== 'normal' ? (
              <AlertTriangle
                className={
                  row.original.status === 'critical'
                    ? 'size-4 text-destructive'
                    : 'size-4 text-amber-600'
                }
                aria-hidden
              />
            ) : null}
            {row.original.quantity}
          </span>
        ),
      },
    ];

    if (showUomColumn) {
      defs.push({ accessorKey: 'uom', header: 'UoM', meta: { label: 'UoM' } });
    }

    if (minReorderMode) {
      defs.push({
        accessorKey: 'min_reorder',
        header: 'Min reorder',
        meta: { label: 'Min reorder' },
        cell: ({ row }) => (
          <Input
            type="number"
            min={0}
            className="h-8 w-24"
            defaultValue={row.original.min_reorder}
            onClick={(event) => event.stopPropagation()}
          />
        ),
      });
    } else if (showReorderColumn) {
      defs.push({
        accessorKey: 'reorder_at',
        header: 'Reorder',
        meta: { label: 'Reorder' },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      });
    }

    if (!minReorderMode) {
      defs.push({
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryStockStatusLabel status={getValue()} />,
      });
    }

    return defs;
  }, [minReorderMode, showReorderColumn, showUomColumn]);

  return (
    <InventoryPageShell
      title="Stock"
      breadcrumbLabel="Stock"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.info('Adjust stock will connect to inventory APIs later.')}
          >
            Adjust stock
          </Button>
          <InventoryStockIndentLink />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info('Export will connect to inventory APIs later.')}
          >
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="More actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setMinReorderMode((value) => !value);
                  if (!minReorderMode) setViewMode('list');
                }}
              >
                Minimum order value
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="h-9 w-[240px]">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="size-4" aria-hidden />
                Display
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <InventoryStockDisplayPopoverContent
                showReorder={showReorderColumn}
                showUom={showUomColumn}
                onShowReorderChange={setShowReorderColumn}
                onShowUomChange={setShowUomColumn}
                statusFilters={statusFilters}
                onStatusFilterToggle={toggleStatusFilter}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              type="button"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="List view"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="Grid view"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>

          <EntityTableToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search or scan item…"
            debounceMs={0}
          />
        </div>

        <div className="p-3 pt-0">
          {viewMode === 'grid' ? (
            <InventoryStockGrid rows={filteredRows} onSelect={openRowDetail} />
          ) : (
            <DataTable
              columns={columns}
              data={filteredRows}
              isLoading={isLoading}
              onRowClick={openRowDetail}
              getRowClassName={(row) => ROW_STATUS_CLASS[row.status]}
              emptyTitle="No stock rows"
              emptyDescription="No items match the current filters."
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <p className="text-muted-foreground">{filteredRows.length} items</p>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span>
              Critical <strong className="text-destructive">{summary.critical}</strong>
            </span>
            <span>
              Low <strong className="text-amber-600">{summary.low}</strong>
            </span>
            <span>
              Normal <strong className="text-emerald-600">{summary.normal}</strong>
            </span>
          </div>
        </div>
      </div>

      <InventoryStockDetailSheet
        row={selectedRow}
        storeName={storeName}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </InventoryPageShell>
  );
}
