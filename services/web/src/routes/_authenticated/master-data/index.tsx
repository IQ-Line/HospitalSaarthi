import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/master-data/')({
  beforeLoad: () => {
    throw redirect({ to: '/master-data/modules' });
  },
});
