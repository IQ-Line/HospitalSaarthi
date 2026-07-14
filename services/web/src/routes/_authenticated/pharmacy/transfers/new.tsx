import { createFileRoute } from '@tanstack/react-router';
import { InventoryTransferFormPage } from '@/features/inventory/components/inventory-transfer-form-page';

export const Route = createFileRoute('/_authenticated/pharmacy/transfers/new')({
  component: PharmacyNewTransferRoute,
});

function PharmacyNewTransferRoute() {
  return <InventoryTransferFormPage variant="pharmacy" />;
}
