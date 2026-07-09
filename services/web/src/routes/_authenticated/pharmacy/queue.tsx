import { createFileRoute } from '@tanstack/react-router';
import { PharmacyPrescriptionQueuePage } from '@/features/pharmacy/components/pharmacy-prescription-queue-page';

export const Route = createFileRoute('/_authenticated/pharmacy/queue')({
  component: PharmacyPrescriptionQueuePage,
});
