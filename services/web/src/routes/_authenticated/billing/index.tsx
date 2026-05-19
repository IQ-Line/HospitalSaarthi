import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/billing/')({
  beforeLoad: () => {
    throw redirect({ to: '/billing/services' });
  },
});
