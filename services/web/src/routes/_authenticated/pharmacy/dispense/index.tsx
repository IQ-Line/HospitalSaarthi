import { createFileRoute } from '@tanstack/react-router';
import { PharmacyDispensePage } from '@/features/pharmacy/components/pharmacy-dispense-hub-page';

type DispenseSearch = {
  patientId?: string;
};

export const Route = createFileRoute('/_authenticated/pharmacy/dispense/')({
  validateSearch: (search: Record<string, unknown>): DispenseSearch => ({
    patientId: typeof search.patientId === 'string' ? search.patientId : undefined,
  }),
  component: PharmacyDispensePage,
});
