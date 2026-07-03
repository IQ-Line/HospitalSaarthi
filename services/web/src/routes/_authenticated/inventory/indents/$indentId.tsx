import { createFileRoute } from '@tanstack/react-router';
import { InventoryIndentDetailPage } from '@/features/inventory/components/inventory-indent-detail-page';

export const Route = createFileRoute('/_authenticated/inventory/indents/$indentId')({
  component: IndentDetailRoute,
});

function IndentDetailRoute() {
  const { indentId } = Route.useParams();
  return <InventoryIndentDetailPage indentId={indentId} />;
}
