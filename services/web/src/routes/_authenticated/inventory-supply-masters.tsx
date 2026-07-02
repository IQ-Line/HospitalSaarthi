import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireInventorySupplyMastersLayoutAccess } from '@/lib/inventory-masters-route-access';

export const Route = createFileRoute('/_authenticated/inventory-supply-masters')({
  beforeLoad: requireInventorySupplyMastersLayoutAccess(),
  component: () => <Outlet />,
});
