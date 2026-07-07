import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentsPage } from '@/features/inventory/components/inventory-indents-page';

const indentsSearchSchema = z.object({
  tab: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/inventory/indents/')({
  validateSearch: indentsSearchSchema,
  component: IndentsIndexRoute,
});

function IndentsIndexRoute() {
  const { tab, storeId } = Route.useSearch();
  return <InventoryIndentsPage direction={tab} storeId={storeId} />;
}
