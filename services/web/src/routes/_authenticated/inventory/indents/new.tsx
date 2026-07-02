import { createFileRoute } from '@tanstack/react-router';
import { InventoryIndentDetailPage } from '@/features/inventory/components/inventory-indent-detail-page';

export const Route = createFileRoute('/_authenticated/inventory/indents/new')({
  component: NewIndentRoute,
});

function NewIndentRoute() {
  return <InventoryIndentDetailPage indentId="new" />;
}
