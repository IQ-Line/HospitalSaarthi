import { createFileRoute } from '@tanstack/react-router';
import { PharmacyDispensingHubPage } from '@/features/pharmacy/components/pharmacy-dispense-hub-page';

export const Route = createFileRoute('/_authenticated/pharmacy/dispensing')({
  component: PharmacyDispensingHubPage,
});
