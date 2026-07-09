import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryTransfersPage } from '@/features/inventory/components/inventory-transfers-page';
import { requireInventoryRouteAccess } from '@/lib/inventory-route-access';

const transfersSearchSchema = z.object({
  tab: z.enum(['outgoing', 'incoming']).optional(),
  storeId: z.string().uuid().optional(),
  indentId: z.string().uuid().optional(),
  transferId: z.string().uuid().optional(),
  fromStoreId: z.string().uuid().optional(),
  toStoreId: z.string().uuid().optional(),
});

export const Route = createFileRoute('/_authenticated/inventory/transfers')({
  beforeLoad: requireInventoryRouteAccess('/inventory/transfers'),
  validateSearch: transfersSearchSchema,
  component: TransfersRoute,
});

function TransfersRoute() {
  const search = Route.useSearch();
  return (
    <InventoryTransfersPage
      direction={search.tab}
      storeId={search.storeId}
      routePrefill={{
        indentId: search.indentId,
        transferId: search.transferId,
        fromStoreId: search.fromStoreId,
        toStoreId: search.toStoreId,
      }}
    />
  );
}
