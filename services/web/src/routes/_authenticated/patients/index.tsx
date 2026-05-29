import { createFileRoute } from '@tanstack/react-router';
import { OpdPatientsPage } from '@/features/opd-patients/components/opd-patients-page';

export const Route = createFileRoute('/_authenticated/patients/')({
  component: OpdPatientsPage,
});
