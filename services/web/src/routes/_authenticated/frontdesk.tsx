import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/frontdesk')({
  beforeLoad: requireCatalogRouteAccess('/frontdesk', {
    catalogProductSlugs: ['frontdesk'],
    routePrefix: '/frontdesk',
  }),
  component: () => <Outlet />,
});
