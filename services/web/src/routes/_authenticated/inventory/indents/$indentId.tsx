import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryIndentDetailPage } from '@/features/inventory/components/inventory-indent-detail-page';

const indentDetailSearchSchema = z.object({
  view: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/inventory/indents/$indentId')({
  validateSearch: indentDetailSearchSchema,
  component: IndentDetailRoute,
});

function IndentDetailRoute() {
  const { indentId } = Route.useParams();
  const { view, storeId } = Route.useSearch();
  return <InventoryIndentDetailPage indentId={indentId} view={view} activeStoreId={storeId} />;
}
