import { createFileRoute } from '@tanstack/react-router';
import { PharmacyNewReturnPage } from '@/features/pharmacy/components/returns/pharmacy-new-return-page';

export const Route = createFileRoute('/_authenticated/pharmacy/returns/new')({
  component: PharmacyNewReturnPage,
});
