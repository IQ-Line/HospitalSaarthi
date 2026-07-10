import { createFileRoute } from '@tanstack/react-router';
import { InventoryTransferFormPage } from '@/features/inventory/components/inventory-transfer-form-page';

export const Route = createFileRoute('/_authenticated/inventory/transfers/new')({
  component: InventoryNewTransferRoute,
});

function InventoryNewTransferRoute() {
  return <InventoryTransferFormPage variant="inventory" />;
}
