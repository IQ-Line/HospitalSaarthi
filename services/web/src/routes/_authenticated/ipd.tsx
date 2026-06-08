import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/ipd')({
  beforeLoad: requireCatalogRouteAccess('/ipd/admissions', {
    catalogProductSlugs: ['frontdesk'],
    routePrefix: '/ipd',
  }),
  component: () => <Outlet />,
});
