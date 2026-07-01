import { createFileRoute } from '@tanstack/react-router';
import { InventoryGrnFormPage } from '@/features/inventory/components/inventory-grn-form-page';

export const Route = createFileRoute('/_authenticated/inventory/grn-logs/new')({
  component: InventoryGrnFormPage,
});
