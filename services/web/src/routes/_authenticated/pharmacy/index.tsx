import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/pharmacy/')({
  beforeLoad: () => {
    throw redirect({ to: '/pharmacy/dashboard' });
  },
});
