import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { InventoryKpiCard, InventoryPanel } from './inventory-kpi-card';
import { InventoryPageShell } from './inventory-page-shell';
import { useInventoryDashboard } from '../api/queries';

export function InventoryDashboardPage() {
  const { data, isLoading } = useInventoryDashboard();
  const stats = data?.stats;
  const lowStock = data?.low_stock_items ?? [];
  const expiringLots = data?.expiring_lots ?? [];

  return (
    <InventoryPageShell title="Inventory" breadcrumbLabel="Inventory">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryKpiCard
          label="Active Items"
          value={stats?.active_items ?? 0}
          hint="Items in catalog"
          icon={Box}
          isLoading={isLoading}
        />
        <InventoryKpiCard
          label="Low Stock"
          value={stats?.low_stock ?? 0}
          hint="At or below reorder point"
          icon={AlertTriangle}
          isLoading={isLoading}
        />
        <InventoryKpiCard
          label="Expiring Soon"
          value={stats?.expiring_soon ?? 0}
          hint="Lots expiring within 30 days"
          icon={CalendarClock}
          isLoading={isLoading}
        />
        <InventoryKpiCard
          label="Pending Approvals"
          value={stats?.pending_approvals ?? 0}
          hint="Adjustments awaiting approval"
          icon={ShieldCheck}
          isLoading={isLoading}
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
            <Link
              to="/inventory/stock"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        >
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">No low stock items.</p>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((item) => (
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

        <InventoryPanel title="Expiring Lots (Next 30 Days)">
          {expiringLots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lots expiring in the next 30 days.</p>
          ) : (
            <ul className="space-y-3">
              {expiringLots.map((lot) => (
                <li key={lot.id} className="text-sm">
                  <p className="font-medium">{lot.item_name}</p>
                  <p className="text-muted-foreground">
                    Lot {lot.lot_number} · expires {lot.expiry_date}
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
