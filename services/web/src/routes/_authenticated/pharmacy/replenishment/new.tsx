import { createFileRoute } from '@tanstack/react-router';
import { PharmacyCreateIndentPage } from '@/features/pharmacy/components/replenishment/pharmacy-create-indent-page';

export const Route = createFileRoute('/_authenticated/pharmacy/replenishment/new')({
  component: PharmacyCreateIndentPage,
});
