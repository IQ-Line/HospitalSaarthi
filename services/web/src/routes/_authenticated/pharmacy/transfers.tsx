import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryTransfersPage } from '@/features/inventory/components/inventory-transfers-page';

const transfersSearchSchema = z.object({
  storeId: z.string().uuid().optional(),
  transferId: z.string().uuid().optional(),
  indentId: z.string().uuid().optional(),
  fromStoreId: z.string().uuid().optional(),
  toStoreId: z.string().uuid().optional(),
});

export const Route = createFileRoute('/_authenticated/pharmacy/transfers')({
  validateSearch: transfersSearchSchema,
  component: PharmacyTransfersRoute,
});

function PharmacyTransfersRoute() {
  const search = Route.useSearch();
  return (
    <InventoryTransfersPage
      variant="pharmacy"
      presentation="counter"
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
