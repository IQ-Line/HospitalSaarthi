import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/create-rx')({
  beforeLoad: requireCatalogRouteAccess('/create-rx', {
    catalogProductSlugs: ['frontdesk'],
    catalogModuleSlug: 'opd',
    routePrefix: '/create-rx',
  }),
  component: () => <Outlet />,
});
