import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/master-data')({
  beforeLoad: requireCatalogRouteAccess('/master-data', {
    catalogProductSlugs: ['master-data'],
    routePrefix: '/master-data',
  }),
  component: () => <Outlet />,
});
