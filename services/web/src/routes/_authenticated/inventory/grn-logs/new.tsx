import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InventoryGrnFormPage } from '@/features/inventory/components/inventory-grn-form-page';

const grnFormSearchSchema = z.object({
  grnId: z.string().uuid().optional(),
});

export const Route = createFileRoute('/_authenticated/inventory/grn-logs/new')({
  validateSearch: grnFormSearchSchema,
  component: InventoryGrnFormPage,
});
