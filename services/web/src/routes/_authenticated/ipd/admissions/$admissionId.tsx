import { createFileRoute } from '@tanstack/react-router';
import { AdmissionDetailPage } from '@/features/ipd/components/admission-detail-page';

export const Route = createFileRoute('/_authenticated/ipd/admissions/$admissionId')({
  component: AdmissionDetailRoute,
});

function AdmissionDetailRoute() {
  const { admissionId } = Route.useParams();
  return <AdmissionDetailPage admissionId={admissionId} />;
}
