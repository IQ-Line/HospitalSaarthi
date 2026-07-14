import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentDetailPage } from '@/features/inventory/components/inventory-indent-detail-page';
import { PHARMACY_INDENT_DEFAULTS } from '@/features/inventory/lib/inventory-operational-variant';

const indentDetailSearchSchema = z.object({
  view: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/pharmacy/replenishment/$indentId')({
  validateSearch: indentDetailSearchSchema,
  component: PharmacyReplenishmentDetailRoute,
});

function PharmacyReplenishmentDetailRoute() {
  const { indentId } = Route.useParams();
  const { view, storeId } = Route.useSearch();
  return (
    <InventoryIndentDetailPage
      indentId={indentId}
      variant="pharmacy"
      forcedIndentType={PHARMACY_INDENT_DEFAULTS.indent_type}
      view={view}
      activeStoreId={storeId}
    />
  );
}
