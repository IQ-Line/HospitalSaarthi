import { createFileRoute } from '@tanstack/react-router';
import { InventoryTransfersPage } from '@/features/inventory/components/inventory-transfers-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/transfers')({
  beforeLoad: requireInventoryRouteAccess('/inventory/transfers'),
  component: InventoryTransfersPage,
});
