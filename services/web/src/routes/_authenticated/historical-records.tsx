import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/historical-records')({
  beforeLoad: requireCatalogRouteAccess('/historical-records', {
    catalogProductSlugs: ['frontdesk'],
    catalogModuleSlug: 'opd',
    routePrefix: '/historical-records',
  }),
  component: () => <Outlet />,
});
