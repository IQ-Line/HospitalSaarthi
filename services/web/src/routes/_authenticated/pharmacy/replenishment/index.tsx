import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentsPage } from '@/features/inventory/components/inventory-indents-page';
import { PHARMACY_INDENT_DEFAULTS } from '@/features/inventory/lib/inventory-operational-variant';

const indentStatusValues = [
  'all',
  'draft',
  'submitted',
  'approved',
  'partially_approved',
  'rejected',
  'in_fulfillment',
  'fulfilled',
] as const;

const replenishmentSearchSchema = z.object({
  tab: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().optional(),
  status: z.enum(indentStatusValues).optional(),
});

export const Route = createFileRoute('/_authenticated/pharmacy/replenishment/')({
  validateSearch: replenishmentSearchSchema,
  component: PharmacyReplenishmentIndexRoute,
});

function PharmacyReplenishmentIndexRoute() {
  const { tab, storeId, status } = Route.useSearch();
  return (
    <InventoryIndentsPage
      variant="pharmacy"
      indentTypeFilter={PHARMACY_INDENT_DEFAULTS.indent_type}
      direction={tab}
      storeId={storeId}
      initialStatus={status ?? 'all'}
    />
  );
}
