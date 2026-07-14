import { createFileRoute } from '@tanstack/react-router';
import { PharmacyReturnsPage } from '@/features/pharmacy/components/returns/pharmacy-returns-page';

export const Route = createFileRoute('/_authenticated/pharmacy/returns/')({
  component: PharmacyReturnsPage,
});
