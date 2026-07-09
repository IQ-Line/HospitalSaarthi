import { createFileRoute } from '@tanstack/react-router';
import { PharmacyDashboardPage } from '@/features/pharmacy/components/pharmacy-dashboard-page';

export const Route = createFileRoute('/_authenticated/pharmacy/dashboard')({
  component: PharmacyDashboardPage,
});
