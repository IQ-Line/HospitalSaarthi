import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * System role templates are not a Master Data catalog module (no L2 slug / permissions).
 * Configurator and User Management consume `/api/v1/master-data/system-roles` directly.
 */
export const Route = createFileRoute('/_authenticated/master-data/system-roles')({
  beforeLoad: () => {
    throw redirect({ to: '/master-data/modules' });
  },
});
