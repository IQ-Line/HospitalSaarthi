import { createFileRoute } from '@tanstack/react-router';
import { InventoryPlaceholderPage } from '@/features/inventory/components/inventory-placeholder-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/suppliers')({
  beforeLoad: requireInventoryRouteAccess('/inventory/suppliers'),
  component: () => <InventoryPlaceholderPage title="Suppliers" />,
});
