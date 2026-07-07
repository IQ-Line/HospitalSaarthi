import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/grn-logs')({
  beforeLoad: requireInventoryRouteAccess('/inventory/grn-logs'),
  component: () => <Outlet />,
});
