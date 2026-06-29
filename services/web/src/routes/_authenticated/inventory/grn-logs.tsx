import { createFileRoute } from '@tanstack/react-router';
import { InventoryPlaceholderPage } from '@/features/inventory/components/inventory-placeholder-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/grn-logs')({
  beforeLoad: requireInventoryRouteAccess('/inventory/grn-logs'),
  component: () => <InventoryPlaceholderPage title="GRN logs" />,
});
