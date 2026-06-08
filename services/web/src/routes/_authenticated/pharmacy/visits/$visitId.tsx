import { createFileRoute } from '@tanstack/react-router';
import { PharmacyDispensePage } from '@/features/pharmacy/components/pharmacy-dispense-page';

export const Route = createFileRoute('/_authenticated/pharmacy/visits/$visitId')({
  component: PharmacyDispenseRoute,
});

function PharmacyDispenseRoute() {
  const { visitId } = Route.useParams();
  return <PharmacyDispensePage visitId={visitId} />;
}
