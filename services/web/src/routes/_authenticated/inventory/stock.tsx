import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryStockPage } from '@/features/inventory/components/inventory-stock-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

const stockSearchSchema = z.object({
  status: z.enum(['critical', 'low', 'normal']).optional(),
  view: z.enum(['active', 'low_stock', 'expiring']).optional(),
  store_id: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/inventory/stock')({
  beforeLoad: requireInventoryRouteAccess('/inventory/stock'),
  validateSearch: stockSearchSchema,
  component: InventoryStockRoute,
});

function InventoryStockRoute() {
  const { status, view, store_id } = Route.useSearch();
  return (
    <InventoryStockPage initialStatus={status ?? 'all'} initialView={view} initialStoreId={store_id} />
  );
}
