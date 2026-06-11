import { createFileRoute } from '@tanstack/react-router';
import { PharmacyQueuePage } from '@/features/pharmacy/components/pharmacy-queue-page';

export const Route = createFileRoute('/_authenticated/pharmacy/queue')({
  component: PharmacyQueuePage,
});
