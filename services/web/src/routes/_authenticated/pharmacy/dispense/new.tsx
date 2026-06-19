import { createFileRoute } from '@tanstack/react-router';
import { PharmacyWalkInDispensePage } from '@/features/pharmacy/components/pharmacy-walk-in-dispense-page';

export const Route = createFileRoute('/_authenticated/pharmacy/dispense/new')({
  component: PharmacyWalkInDispensePage,
});
