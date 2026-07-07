import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/indents')({
  beforeLoad: requireInventoryRouteAccess('/inventory/indents'),
  component: () => <Outlet />,
});
