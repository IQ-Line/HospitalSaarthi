import { createFileRoute } from '@tanstack/react-router';
import { InventoryStockPage } from '@/features/inventory/components/inventory-stock-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/stock')({
  beforeLoad: requireInventoryRouteAccess('/inventory/stock'),
  component: InventoryStockPage,
});
