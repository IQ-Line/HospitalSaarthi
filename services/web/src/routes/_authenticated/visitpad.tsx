import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/visitpad')({
  beforeLoad: requireCatalogRouteAccess('/visitpad', {
    catalogProductSlugs: ['master-data', 'visitpad-master'],
    routePrefix: '/visitpad',
  }),
  component: () => <Outlet />,
});
