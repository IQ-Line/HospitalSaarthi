import { createFileRoute } from '@tanstack/react-router';
import { PharmacyReturnDetailPage } from '@/features/pharmacy/components/returns/pharmacy-return-detail-page';

export const Route = createFileRoute('/_authenticated/pharmacy/returns/$returnId')({
  component: ReturnDetailRoute,
});

function ReturnDetailRoute() {
  const { returnId } = Route.useParams();
  return <PharmacyReturnDetailPage returnId={returnId} />;
}
