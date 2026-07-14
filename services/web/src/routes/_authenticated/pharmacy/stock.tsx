import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryStockPage } from '@/features/inventory/components/inventory-stock-page';

const stockSearchSchema = z.object({
  status: z.enum(['critical', 'low', 'normal']).optional(),
  view: z.enum(['active', 'low_stock', 'expiring']).optional(),
  store_id: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/pharmacy/stock')({
  validateSearch: stockSearchSchema,
  component: PharmacyStockRoute,
});

function PharmacyStockRoute() {
  const { status, view, store_id } = Route.useSearch();
  return (
    <InventoryStockPage
      variant="pharmacy"
      initialStatus={status ?? 'all'}
      initialView={view}
      initialStoreId={store_id}
    />
  );
}
