import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy path — canonical tariff master listing is under billing-and-finance. */
export const Route = createFileRoute('/_authenticated/billing/services')({
  beforeLoad: () => {
    throw redirect({ to: '/billing-and-finance/tariff-master' });
  },
});
