import { createFileRoute } from '@tanstack/react-router';
import { InventoryPlaceholderPage } from '@/features/inventory/components/inventory-placeholder-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

export const Route = createFileRoute('/_authenticated/inventory/consume')({
  beforeLoad: requireInventoryRouteAccess('/inventory/consume'),
  component: () => <InventoryPlaceholderPage title="Consume" />,
});
