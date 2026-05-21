import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/configurator')({
  beforeLoad: requireCatalogRouteAccess('/configurator', {
    catalogProductSlugs: ['configurator'],
    routePrefix: '/configurator',
  }),
  component: () => <Outlet />,
});
