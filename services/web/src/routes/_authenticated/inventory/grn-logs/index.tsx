import { createFileRoute } from '@tanstack/react-router';
import { InventoryGrnLogsPage } from '@/features/inventory/components/inventory-grn-logs-page';

export const Route = createFileRoute('/_authenticated/inventory/grn-logs/')({
  component: InventoryGrnLogsPage,
});
