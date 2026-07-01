import { createFileRoute } from '@tanstack/react-router';
import { InventoryIndentsPage } from '@/features/inventory/components/inventory-indents-page';

export const Route = createFileRoute('/_authenticated/inventory/indents/')({
  component: InventoryIndentsPage,
});
