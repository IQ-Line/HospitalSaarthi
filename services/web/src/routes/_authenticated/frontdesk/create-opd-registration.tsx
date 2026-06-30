import { createFileRoute } from '@tanstack/react-router';
import { OpdRegistrationCreatePage } from '@/features/frontdesk/components/visit-registration-page';

export const Route = createFileRoute('/_authenticated/frontdesk/create-opd-registration')({
  component: CreateOpdRegistrationRoute,
});

function CreateOpdRegistrationRoute() {
  return <OpdRegistrationCreatePage />;
}
