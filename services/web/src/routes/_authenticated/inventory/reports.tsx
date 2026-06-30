import { createFileRoute } from '@tanstack/react-router';
import { InventoryPlaceholderPage } from '@/features/inventory/components/inventory-placeholder-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/reports')({
  beforeLoad: requireInventoryRouteAccess('/inventory/reports'),
  component: () => <InventoryPlaceholderPage title="Reports" />,
});
