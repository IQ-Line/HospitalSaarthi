import { createFileRoute, redirect } from '@tanstack/react-router';
import { INVENTORY_DEFAULT_ROUTE } from '@/features/inventory/lib/inventory-access';

export const Route = createFileRoute('/_authenticated/inventory/')({
  beforeLoad: () => {
    throw redirect({ to: INVENTORY_DEFAULT_ROUTE });
  },
});
