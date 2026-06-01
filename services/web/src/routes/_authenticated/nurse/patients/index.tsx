import { createFileRoute } from '@tanstack/react-router';
import { NursePatientsPage } from '@/features/nurse/components/nurse-patients-page';

export const Route = createFileRoute('/_authenticated/nurse/patients/')({
  component: NursePatientsPage,
});
