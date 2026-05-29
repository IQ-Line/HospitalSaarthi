import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/create-rx-v2')({
  beforeLoad: requireCatalogRouteAccess('/create-rx-v2', {
    catalogProductSlugs: ['frontdesk'],
    catalogModuleSlug: 'opd',
    routePrefix: '/create-rx-v2',
  }),
  component: () => <Outlet />,
});
