import { createFileRoute } from '@tanstack/react-router';
import { SmartParchaConsultationPage, useSmartParchaFullContext } from '@/features/smart-parcha';

export const Route = createFileRoute('/_authenticated/opd/consultation/$visitId')({
  component: ConsultationRoute,
});

function ConsultationRoute() {
  const { visitId } = Route.useParams();
  const { data, access, isLoading, isError, error } = useSmartParchaFullContext(visitId, true);

  return (
    <SmartParchaConsultationPage
      visitId={visitId}
      context={data}
      access={access}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error instanceof Error ? error.message : undefined}
    />
  );
}
