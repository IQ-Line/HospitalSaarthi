import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentsPage } from '@/features/inventory/components/inventory-indents-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

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

const indentsSearchSchema = z.object({
  tab: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().optional(),
  status: z.enum(indentStatusValues).optional(),
});

export const Route = createFileRoute('/_authenticated/inventory/indents/')({
  beforeLoad: requireInventoryRouteAccess('/inventory/indents'),
  validateSearch: indentsSearchSchema,
  component: IndentsIndexRoute,
});

function IndentsIndexRoute() {
  const { tab, storeId, status } = Route.useSearch();
  return (
    <InventoryIndentsPage direction={tab} storeId={storeId} initialStatus={status ?? 'all'} />
  );
}
