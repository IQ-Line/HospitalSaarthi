import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/visitpad/')({
  beforeLoad: () => {
    throw redirect({ to: '/visitpad/units' });
  },
});
