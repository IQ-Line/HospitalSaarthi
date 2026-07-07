import { createFileRoute } from '@tanstack/react-router';
import { InventoryReconciliationPage } from '@/features/inventory/components/inventory-reconciliation-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/reconciliation')({
  beforeLoad: requireInventoryRouteAccess('/inventory/stock'),
  component: InventoryReconciliationPage,
});
