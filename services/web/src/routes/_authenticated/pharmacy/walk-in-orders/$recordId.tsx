import { createFileRoute } from '@tanstack/react-router';
import { PharmacyWalkInDispensePage } from '@/features/pharmacy/components/pharmacy-walk-in-dispense-page';

export const Route = createFileRoute('/_authenticated/pharmacy/walk-in-orders/$recordId')({
  component: WalkInDispenseRoute,
});

function WalkInDispenseRoute() {
  const { recordId } = Route.useParams();
  return <PharmacyWalkInDispensePage recordId={recordId} />;
}
