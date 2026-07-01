import { createFileRoute } from '@tanstack/react-router';
import { InventoryIndentFormPage } from '@/features/inventory/components/inventory-indent-form-page';

export const Route = createFileRoute('/_authenticated/inventory/indents/new')({
  component: InventoryIndentFormPage,
});
