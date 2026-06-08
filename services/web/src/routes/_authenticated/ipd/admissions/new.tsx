import { createFileRoute } from '@tanstack/react-router';
import { AdmissionFormPage } from '@/features/ipd/components/admission-form-page';

export const Route = createFileRoute('/_authenticated/ipd/admissions/new')({
  component: AdmissionFormPage,
});
