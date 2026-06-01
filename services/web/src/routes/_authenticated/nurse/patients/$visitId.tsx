import { createFileRoute } from '@tanstack/react-router';
import { NurseVisitPage } from '@/features/nurse/components/nurse-visit-page';

export const Route = createFileRoute('/_authenticated/nurse/patients/$visitId')({
  component: NurseVisitRoute,
});

function NurseVisitRoute() {
  const { visitId } = Route.useParams();
  return <NurseVisitPage visitId={visitId} />;
};
