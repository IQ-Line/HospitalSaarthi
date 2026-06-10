import { createFileRoute } from '@tanstack/react-router';
import { AdmissionFormPage } from '@/features/ipd/components/admission-form-page';

export const Route = createFileRoute('/_authenticated/ipd/admissions/$admissionId/edit')({
  component: EditAdmissionRoute,
});

function EditAdmissionRoute() {
  const { admissionId } = Route.useParams();
  return <AdmissionFormPage admissionId={admissionId} />;
}
