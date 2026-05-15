import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/configurator/')({
  beforeLoad: () => {
    throw redirect({ to: '/configurator/tenant' });
  },
});
