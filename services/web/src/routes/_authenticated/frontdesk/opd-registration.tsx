import { createFileRoute } from '@tanstack/react-router';
import { OpdRegistrationListPage } from '@/features/frontdesk/components/opd-registration-list-page';

export const Route = createFileRoute('/_authenticated/frontdesk/opd-registration')({
  component: OpdRegistrationRoute,
});

function OpdRegistrationRoute() {
  return <OpdRegistrationListPage />;
}
