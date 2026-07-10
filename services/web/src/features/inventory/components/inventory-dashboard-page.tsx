import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import { Skeleton } from '@pulse/ui/skeleton';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { InventoryKpiCard, InventoryPanel } from './inventory-kpi-card';
import { InventoryPageShell } from './inventory-page-shell';
import {
  INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS,
  type InventoryStockDashboardView,
} from '../lib/inventory-dashboard-navigation';
import {
  useInventoryDashboardStats,
  useInventoryExpiringLots,
  useInventoryLowStockItems,
  useInventoryStores,
} from '../api/queries';

export function InventoryDashboardPage() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState('');

  const { data: stores = [], isLoading: storesLoading } = useInventoryStores();
  const { data: stats, isLoading: statsLoading } = useInventoryDashboardStats(storeId || undefined);
  const { data: lowStockItems = [], isLoading: lowStockLoading } = useInventoryLowStockItems(
    storeId || undefined,
    Boolean(storeId),
  );
  const { data: expiringLots = [], isLoading: expiringLoading } = useInventoryExpiringLots(
    storeId || undefined,
  );

  const kpisLoading = statsLoading || (storesLoading && !storeId);

  useEffect(() => {
    if (storeId || stores.length === 0) return;
    const central = stores.find((store) => store.is_central_store);
    setStoreId(central?.id ?? stores[0]!.id);
  }, [storeId, stores]);

  const storeName = stores.find((store) => store.id === storeId)?.name ?? 'Store';

  const goStock = (view: InventoryStockDashboardView) => {
    if (!storeId) return;
    void navigate({
      to: '/inventory/stock',
      search: { store_id: storeId, view },
    });
  };

  const goPendingIndents = () => {
    void navigate({
      to: '/inventory/indents',
      search: {
        tab: 'incoming',
        status: 'submitted',
        ...(storeId ? { storeId } : {}),
      },
    });
  };

  return (
    <InventoryPageShell title="Inventory" breadcrumbLabel="Inventory">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          KPIs and stock alerts for the selected store. Click a card to open the filtered list.
        </p>
        <div className="w-full min-w-[220px] sm:w-auto">
          <Select value={storeId || undefined} onValueChange={setStoreId}>
            <SelectTrigger className="h-9 w-full sm:w-[260px]">
              <SelectValue placeholder="Select store…" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryKpiCard
          label="Active Items"
          value={stats?.active_items ?? 0}
          hint="Items in catalog"
          icon={Box}
          isLoading={kpisLoading}
          onClick={() => goStock('active')}
        />
        <InventoryKpiCard
          label="Low Stock"
          value={stats?.low_stock ?? 0}
          hint={`At or below reorder point · ${storeName}`}
          icon={AlertTriangle}
          isLoading={kpisLoading}
          onClick={() => goStock('low_stock')}
        />
        <InventoryKpiCard
          label="Expiring Soon"
          value={stats?.expiring_soon ?? 0}
          hint={`Lots expiring within ${INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS} days`}
          icon={CalendarClock}
          isLoading={kpisLoading}
          onClick={() => goStock('expiring')}
        />
        <InventoryKpiCard
          label="Pending Approvals"
          value={stats?.pending_approvals ?? 0}
          hint="Indents awaiting approval"
          icon={ShieldCheck}
          isLoading={kpisLoading}
          onClick={goPendingIndents}
        />
      </div>

      <InventoryPanel
        title="Pharmacy — Inventory Bridge"
        action={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/inventory/reconciliation">Open reconciliation</Link>
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Compare bridged pharmacy batches to warehouse stock and resolve quantity mismatches.
        </p>
      </InventoryPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <InventoryPanel
          title="Low Stock Items"
          action={
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={() => goStock('low_stock')}
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          }
        >
          {!storeId ? (
            <p className="text-sm text-muted-foreground">Select a store to preview low stock items.</p>
          ) : lowStockLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No low stock items at {storeName}. All stocked items are above their reorder points.
            </p>
          ) : (
            <ul className="space-y-3">
              {lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    {item.item_code ? (
                      <p className="text-xs text-muted-foreground">Code: {item.item_code}</p>
                    ) : null}
                    <p className="text-muted-foreground">
                      {item.quantity} {item.uom} · reorder at {item.reorder_at}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </InventoryPanel>

        <InventoryPanel
          title={`Expiring Lots (Next ${INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS} Days)`}
          action={
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={() => goStock('expiring')}
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          }
        >
          {!storeId ? (
            <p className="text-sm text-muted-foreground">Select a store to preview expiring lots.</p>
          ) : expiringLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : expiringLots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lots expiring within {INVENTORY_DASHBOARD_EXPIRY_WINDOW_DAYS} days at {storeName}.
            </p>
          ) : (
            <ul className="space-y-3">
              {expiringLots.slice(0, 5).map((lot) => (
                <li key={lot.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{lot.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Lot {lot.lot_number} · expires {lot.expiry_date}
                    </p>
                  </div>
                  <p className="tabular-nums text-muted-foreground">
                    {lot.quantity} {lot.uom}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </InventoryPanel>
      </div>

      <InventoryPanel title="Quick Actions">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Stock', to: '/inventory/stock' as const },
            { label: 'Indents', to: '/inventory/indents' as const },
            { label: 'Transfers', to: '/inventory/transfers' as const },
            { label: 'GRN logs', to: '/inventory/grn-logs' as const },
            { label: 'New GRN', to: '/inventory/grn-logs/new' as const },
          ].map((entry) => (
            <Button key={entry.label} type="button" variant="outline" size="sm" asChild>
              <Link to={entry.to}>{entry.label}</Link>
            </Button>
          ))}
        </div>
      </InventoryPanel>
    </InventoryPageShell>
  );
}
