import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentDetailPage } from '@/features/inventory/components/inventory-indent-detail-page';

const newIndentSearchSchema = z.object({
  view: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/inventory/indents/new')({
  validateSearch: newIndentSearchSchema,
  component: NewIndentRoute,
});

function NewIndentRoute() {
  const { view, storeId } = Route.useSearch();
  return <InventoryIndentDetailPage indentId="new" view={view ?? 'outgoing'} activeStoreId={storeId} />;
}
