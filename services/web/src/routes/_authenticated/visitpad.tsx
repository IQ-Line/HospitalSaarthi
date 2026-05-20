import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/visitpad')({
  beforeLoad: requireCatalogRouteAccess('/visitpad', {
    catalogProductSlugs: ['visitpad-templates'],
    routePrefix: '/visitpad',
  }),
  component: () => <Outlet />,
});
