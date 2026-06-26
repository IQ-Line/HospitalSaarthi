import { createFileRoute } from '@tanstack/react-router';
import { InventoryDashboardPage } from '@/features/inventory/components/inventory-dashboard-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/dashboard')({
  beforeLoad: requireInventoryRouteAccess('/inventory/dashboard'),
  component: InventoryDashboardPage,
});
