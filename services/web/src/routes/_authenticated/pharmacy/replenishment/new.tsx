import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentDetailPage } from '@/features/inventory/components/inventory-indent-detail-page';

const newIndentSearchSchema = z.object({
  itemIds: z.string().optional(),
  storeId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/pharmacy/replenishment/new')({
  validateSearch: newIndentSearchSchema,
  component: PharmacyNewIndentRoute,
});

function PharmacyNewIndentRoute() {
  const { storeId } = Route.useSearch();
  return (
    <InventoryIndentDetailPage
      indentId="new"
      variant="pharmacy"
      forcedIndentType="pharmacy_refill"
      activeStoreId={storeId}
    />
  );
}
