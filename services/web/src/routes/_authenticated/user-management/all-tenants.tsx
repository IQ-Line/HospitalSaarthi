import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy route — platform users list lives on the main Users tab. */
export const Route = createFileRoute('/_authenticated/user-management/all-tenants')({
  beforeLoad: () => {
    throw redirect({ to: '/user-management', search: { q: '' } });
  },
});
