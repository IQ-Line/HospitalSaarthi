import { createFileRoute } from '@tanstack/react-router';
import { AdmissionsPage } from '@/features/ipd/components/admissions-page';

export const Route = createFileRoute('/_authenticated/ipd/admissions/')({
  component: AdmissionsPage,
});
