import { createFileRoute } from '@tanstack/react-router';
import { InventoryStockPage } from '@/features/inventory/components/inventory-stock-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';
import type { InventoryStockStatus } from '@/features/inventory/types';

function parseStockStatus(value: unknown): InventoryStockStatus | undefined {
  if (value === 'critical' || value === 'low' || value === 'normal') return value;
  return undefined;
}

export const Route = createFileRoute('/_authenticated/inventory/stock')({
  beforeLoad: requireInventoryRouteAccess('/inventory/stock'),
  validateSearch: (search: Record<string, unknown>) => ({
    status: parseStockStatus(search.status),
  }),
  component: InventoryStockRoute,
});

function InventoryStockRoute() {
  const { status } = Route.useSearch();
  return <InventoryStockPage initialStatus={status ?? 'all'} />;
}
