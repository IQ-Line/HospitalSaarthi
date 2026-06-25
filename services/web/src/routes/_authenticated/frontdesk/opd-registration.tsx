import { createFileRoute } from '@tanstack/react-router';
import { VisitRegistrationPage } from '@/features/frontdesk/components/visit-registration-page';

export const Route = createFileRoute('/_authenticated/frontdesk/opd-registration')({
  component: OpdRegistrationRoute,
});

function OpdRegistrationRoute() {
  return <VisitRegistrationPage pageTitle="OPD Registration" />;
}
