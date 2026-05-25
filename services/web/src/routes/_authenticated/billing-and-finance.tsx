import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/billing-and-finance')({
  beforeLoad: requireCatalogRouteAccess('/billing-and-finance', {
    catalogProductSlugs: ['billing-and-finance'],
    routePrefix: '/billing-and-finance',
  }),
  component: () => <Outlet />,
});
