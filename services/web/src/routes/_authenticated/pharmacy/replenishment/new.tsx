import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentDetailPage } from '@/features/inventory/components/inventory-indent-detail-page';
import { PHARMACY_INDENT_DEFAULTS } from '@/features/inventory/lib/inventory-operational-variant';

const newIndentSearchSchema = z.object({
  view: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().optional(),
  itemIds: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/pharmacy/replenishment/new')({
  validateSearch: newIndentSearchSchema,
  component: PharmacyNewReplenishmentRoute,
});

function PharmacyNewReplenishmentRoute() {
  const { view, storeId } = Route.useSearch();
  return (
    <InventoryIndentDetailPage
      indentId="new"
      variant="pharmacy"
      forcedIndentType={PHARMACY_INDENT_DEFAULTS.indent_type}
      view={view ?? 'outgoing'}
      activeStoreId={storeId}
    />
  );
}
