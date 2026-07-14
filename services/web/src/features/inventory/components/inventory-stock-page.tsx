import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Checkbox } from '@pulse/ui/checkbox';
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
import {
  INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS,
  type InventoryStockDashboardView,
} from '../lib/inventory-dashboard-navigation';
import type { InventoryOperationalVariant } from '../lib/inventory-operational-variant';
import { useInventoryAdjustStock, useInventoryUpdateItemReorder } from '../api/stock-mutations';
import { useInventoryExpiringLots, useInventoryStock } from '../api/queries';
import { useOperationalStoreOptions } from '../lib/use-operational-store-options';
import type { InventoryExpiringLot, InventoryStockRow, InventoryStockStatus } from '../types';
import { InventoryPageShell } from './inventory-page-shell';
import {
  InventoryStockDetailSheet,
  InventoryStockDisplayPopoverContent,
  InventoryStockGrid,
} from './inventory-stock-detail-sheet';
import {
  InventoryStockIndentDrawer,
  InventoryStockIndentLink,
} from './inventory-stock-indent-drawer';
import {
  StockAdjustRowFields,
  type StockAdjustDraft,
} from './inventory-stock-adjust-fields';
import { InventoryStockStatusLabel } from './inventory-stock-status';

type StockViewMode = 'list' | 'grid';

const ROW_STATUS_CLASS: Record<InventoryStockStatus, string> = {
  critical: 'bg-destructive/5 hover:bg-destructive/10',
  low: 'bg-amber-500/5 hover:bg-amber-500/10',
  normal: '',
};

function statusFiltersForView(
  view?: InventoryStockDashboardView,
  status?: 'all' | InventoryStockStatus,
): Set<InventoryStockStatus> {
  if (view === 'low_stock') return new Set(['critical', 'low']);
  if (view === 'expiring') return new Set(['critical', 'low', 'normal']);
  if (status && status !== 'all') return new Set([status]);
  return new Set(['critical', 'low', 'normal']);
}

function stockPageTitle(view?: InventoryStockDashboardView): string {
  if (view === 'low_stock') return 'Low stock';
  if (view === 'expiring') return 'Expiring soon';
  return 'Stock';
}

function stockPageDescription(view?: InventoryStockDashboardView): string | undefined {
  if (view === 'low_stock') return 'Items at or below their reorder point.';
  if (view === 'expiring') {
    return `Lots expiring within the next ${INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS} days.`;
  }
  return undefined;
}

interface InventoryStockPageProps {
  initialStatus?: 'all' | InventoryStockStatus;
  initialView?: InventoryStockDashboardView;
  initialStoreId?: string;
  variant?: InventoryOperationalVariant;
}

export function InventoryStockPage({
  initialStatus = 'all',
  initialView,
  initialStoreId,
  variant = 'inventory',
}: InventoryStockPageProps) {
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState<string>(initialStoreId ?? '');
  const [dashboardView, setDashboardView] = useState<InventoryStockDashboardView | undefined>(
    initialView,
  );
  const [viewMode, setViewMode] = useState<StockViewMode>('list');
  const [showReorderColumn, setShowReorderColumn] = useState(true);
  const [showUomColumn, setShowUomColumn] = useState(true);
  const [minReorderMode, setMinReorderMode] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<InventoryStockStatus>>(() =>
    statusFiltersForView(initialView, initialStatus),
  );
  const [selectedRow, setSelectedRow] = useState<InventoryStockRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [indentDrawerOpen, setIndentDrawerOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
  const [adjustDrafts, setAdjustDrafts] = useState<Record<string, StockAdjustDraft>>({});
  const [minReorderDrafts, setMinReorderDrafts] = useState<Record<string, string>>({});

  const adjustStock = useInventoryAdjustStock();
  const updateReorder = useInventoryUpdateItemReorder();

  const { stores, primaryStoreId } = useOperationalStoreOptions(variant);

  useEffect(() => {
    if (initialStoreId) {
      setStoreId(initialStoreId);
      return;
    }
    if (storeId) return;
    const preferred =
      primaryStoreId && stores.some((store) => store.id === primaryStoreId)
        ? primaryStoreId
        : stores[0]?.id;
    if (preferred) {
      setStoreId(preferred);
    }
  }, [initialStoreId, primaryStoreId, storeId, stores]);

  useEffect(() => {
    if (!initialView) return;
    setDashboardView(initialView);
    setStatusFilters(statusFiltersForView(initialView, initialStatus));
  }, [initialStatus, initialView]);

  const isExpiringView = dashboardView === 'expiring';

  const { data, isLoading } = useInventoryStock({
    search: search || undefined,
    store_id: isExpiringView ? '' : storeId,
    status: 'all',
  });
  const { data: expiringLots = [], isLoading: expiringLoading } = useInventoryExpiringLots(
    isExpiringView ? storeId || undefined : undefined,
  );

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

  const stagedItems = useMemo(
    () => filteredRows.filter((row) => selectedItemIds.has(row.id)),
    [filteredRows, selectedItemIds],
  );

  const toggleItemSelection = useCallback((itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const handleApplyAdjustments = async () => {
    const entries = Object.entries(adjustDrafts).filter(([, draft]) => {
      const delta = Number(draft.delta);
      return draft.stockId && Number.isFinite(delta) && delta !== 0 && draft.reason.trim();
    });

    if (entries.length === 0) {
      toast.error('Enter a non-zero adjustment and reason for at least one row.');
      return;
    }

    try {
      for (const [, draft] of entries) {
        await adjustStock.mutateAsync({
          stock_id: draft.stockId,
          delta: Number(draft.delta),
          reason: draft.reason.trim(),
        });
      }
      toast.success(`Applied ${entries.length} stock adjustment(s).`);
      setAdjustDrafts({});
      setAdjustMode(false);
    } catch {
      toast.error('One or more adjustments failed.');
    }
  };

  const handleSaveMinReorder = async () => {
    const entries = Object.entries(minReorderDrafts);
    if (entries.length === 0) {
      toast.info('No reorder changes to save.');
      return;
    }

    try {
      for (const [itemId, rawValue] of entries) {
        const reorderPoint = Number(rawValue);
        if (!Number.isFinite(reorderPoint) || reorderPoint < 0) {
          toast.error('Min reorder must be a non-negative number.');
          return;
        }
        await updateReorder.mutateAsync({ item_id: itemId, reorder_point: reorderPoint });
      }
      toast.success('Minimum reorder values saved.');
      setMinReorderDrafts({});
      setMinReorderMode(false);
    } catch {
      toast.error('Failed to save reorder values.');
    }
  };

  const expiringColumns = useMemo<ColumnDef<InventoryExpiringLot, unknown>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        meta: { label: '#', headerClassName: 'w-12' },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>
        ),
      },
      { accessorKey: 'item_name', header: 'Item', meta: { label: 'Item' } },
      { accessorKey: 'lot_number', header: 'Lot', meta: { label: 'Lot' } },
      {
        accessorKey: 'expiry_date',
        header: 'Expiry',
        meta: { label: 'Expiry' },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        meta: { label: 'Qty' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span>,
      },
      { accessorKey: 'uom', header: 'UoM', meta: { label: 'UoM' } },
    ],
    [],
  );

  const filteredExpiringLots = useMemo(() => {
    if (!search.trim()) return expiringLots;
    const q = search.trim().toLowerCase();
    return expiringLots.filter(
      (lot) =>
        lot.item_name.toLowerCase().includes(q) || lot.lot_number.toLowerCase().includes(q),
    );
  }, [expiringLots, search]);

  const columns = useMemo<ColumnDef<InventoryStockRow, unknown>[]>(() => {
    const defs: ColumnDef<InventoryStockRow, unknown>[] = [
      {
        id: 'select',
        header: () => null,
        meta: { label: '', headerClassName: 'w-10' },
        cell: ({ row }) => (
          <Checkbox
            checked={selectedItemIds.has(row.original.id)}
            onCheckedChange={(checked) => toggleItemSelection(row.original.id, checked === true)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${row.original.item_name}`}
          />
        ),
      },
      {
        id: 'index',
        header: '#',
        meta: { label: '#', headerClassName: 'w-12' },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: 'item_name',
        header: 'Item',
        meta: { label: 'Item' },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.item_name}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.item_code}</p>
          </div>
        ),
      },
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
            onChange={(event) =>
              setMinReorderDrafts((prev) => ({
                ...prev,
                [row.original.id]: event.target.value,
              }))
            }
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

    if (adjustMode) {
      defs.push(
        {
          id: 'batch',
          header: 'Batch',
          meta: { label: 'Batch' },
          cell: ({ row }) => (
            <StockAdjustRowFields
              row={row.original}
              storeId={storeId}
              draft={adjustDrafts[row.original.id]}
              onChange={(next) =>
                setAdjustDrafts((prev) => ({ ...prev, [row.original.id]: next }))
              }
            />
          ),
        },
      );
    }

    if (!minReorderMode && !adjustMode) {
      defs.push({
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryStockStatusLabel status={getValue()} />,
      });
    }

    return defs;
  }, [
    adjustDrafts,
    adjustMode,
    minReorderMode,
    selectedItemIds,
    showReorderColumn,
    showUomColumn,
    storeId,
    toggleItemSelection,
  ]);

  return (
    <InventoryPageShell
      title={stockPageTitle(dashboardView)}
      description={stockPageDescription(dashboardView)}
      breadcrumbLabel={stockPageTitle(dashboardView)}
      variant={variant}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {adjustMode ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={adjustStock.isPending}
                onClick={() => void handleApplyAdjustments()}
              >
                Apply adjustments
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjustMode(false);
                  setAdjustDrafts({});
                }}
              >
                Cancel
              </Button>
            </>
          ) : minReorderMode ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={updateReorder.isPending}
                onClick={() => void handleSaveMinReorder()}
              >
                Save reorder levels
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMinReorderMode(false);
                  setMinReorderDrafts({});
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjustMode(true);
                  setMinReorderMode(false);
                  setViewMode('list');
                }}
              >
                Adjust stock
              </Button>
              <InventoryStockIndentLink
                variant={variant}
                onClick={() => {
                  if (selectedItemIds.size === 0) {
                    toast.info('Select at least one item to stage an indent.');
                    return;
                  }
                  setIndentDrawerOpen(true);
                }}
              />
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
                      if (!minReorderMode) {
                        setViewMode('list');
                        setAdjustMode(false);
                      }
                    }}
                  >
                    Minimum order value
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
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

          {!isExpiringView ? (
            <>
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
            </>
          ) : null}

          <EntityTableToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search or scan item…"
            debounceMs={0}
          />
        </div>

        <div className="p-3 pt-0">
          {isExpiringView ? (
            <DataTable
              columns={expiringColumns}
              data={filteredExpiringLots}
              isLoading={expiringLoading}
              emptyTitle="No expiring lots"
              emptyDescription={`No lots expiring within ${INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS} days at this store.`}
            />
          ) : viewMode === 'grid' ? (
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
          {isExpiringView ? (
            <p className="text-muted-foreground">{filteredExpiringLots.length} lots</p>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <InventoryStockDetailSheet
        row={selectedRow}
        storeId={storeId}
        storeName={storeName}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />

      <InventoryStockIndentDrawer
        open={indentDrawerOpen}
        onOpenChange={setIndentDrawerOpen}
        stagedItems={stagedItems}
        onRemoveItem={(itemId) => toggleItemSelection(itemId, false)}
        variant={variant}
      />
    </InventoryPageShell>
  );
}
