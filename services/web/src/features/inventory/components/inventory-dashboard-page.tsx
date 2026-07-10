import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
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
  useInventoryDashboardStats,
  useInventoryLowStockItems,
  useInventoryStores,
} from '../api/queries';

export function InventoryDashboardPage() {
  const lowStockPanelRef = useRef<HTMLDivElement>(null);
  const [storeId, setStoreId] = useState('');
  const [lowStockExpanded, setLowStockExpanded] = useState(false);

  const { data: stores = [], isLoading: storesLoading } = useInventoryStores();
  const { data: stats, isLoading: statsLoading } = useInventoryDashboardStats(storeId || undefined);
  const {
    data: lowStockItems = [],
    isLoading: lowStockLoading,
  } = useInventoryLowStockItems(storeId || undefined, lowStockExpanded);

  const kpisLoading = statsLoading || (storesLoading && !storeId);

  useEffect(() => {
    if (storeId || stores.length === 0) return;
    const central = stores.find((store) => store.is_central_store);
    setStoreId(central?.id ?? stores[0]!.id);
  }, [storeId, stores]);

  const storeName = stores.find((store) => store.id === storeId)?.name ?? 'Store';

  const handleLowStockClick = () => {
    setLowStockExpanded(true);
    window.requestAnimationFrame(() => {
      lowStockPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <InventoryPageShell title="Inventory" breadcrumbLabel="Inventory">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          KPIs and stock alerts for the selected store.
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
        />
        <InventoryKpiCard
          label="Low Stock"
          value={stats?.low_stock ?? 0}
          hint={`At or below reorder point · ${storeName}`}
          icon={AlertTriangle}
          isLoading={kpisLoading}
          onClick={handleLowStockClick}
          isActive={lowStockExpanded}
        />
        <InventoryKpiCard
          label="Expiring Soon"
          value={stats?.expiring_soon ?? 0}
          hint="Lots expiring within 30 days"
          icon={CalendarClock}
          isLoading={kpisLoading}
        />
        <InventoryKpiCard
          label="Pending Approvals"
          value={stats?.pending_approvals ?? 0}
          hint="Indents awaiting approval"
          icon={ShieldCheck}
          isLoading={kpisLoading}
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
        <div ref={lowStockPanelRef}>
          <InventoryPanel
            title="Low Stock Items"
            action={
              <Link
                to="/inventory/stock"
                search={{ status: 'low' as const }}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View all
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          >
            {!lowStockExpanded ? (
              <p className="text-sm text-muted-foreground">
                Click the <span className="font-medium text-foreground">Low Stock</span> card above to
                load items for {storeName}.
              </p>
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
                {lowStockItems.map((item) => (
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
        </div>

        <InventoryPanel title="Expiring Lots (Next 30 Days)">
          <p className="text-sm text-muted-foreground">
            Expiring-lot alerts are not wired to inventory-svc yet. Open stock levels to review batch
            expiry per item.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" asChild>
            <Link to="/inventory/stock">Open stock levels</Link>
          </Button>
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
