import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/frontdesk/visit-registration')({
  beforeLoad: () => {
    throw redirect({ to: '/frontdesk/opd-registration' });
  },
});
