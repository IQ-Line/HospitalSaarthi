import { createFileRoute } from '@tanstack/react-router';
import { OpdRegistrationCreatePage } from '@/features/frontdesk/components/visit-registration-page';

export const Route = createFileRoute('/_authenticated/frontdesk/create-opd-registration')({
  component: CreateOpdRegistrationRoute,
});

/** Legacy React form — kept for rollback; not mounted while VITE_LC_NC=ON (page-builder-only). */
function CreateOpdRegistrationRoute() {
  return <OpdRegistrationCreatePage />;
}
