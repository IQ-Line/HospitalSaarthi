import { createFileRoute } from '@tanstack/react-router';
import { HistoricalRecordsPage } from '@/features/historical-records/components/historical-records-page';

export const Route = createFileRoute('/_authenticated/historical-records/')({
  component: HistoricalRecordsPage,
});
