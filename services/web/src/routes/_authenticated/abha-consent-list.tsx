import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/abha-consent-list')({
  beforeLoad: requireCatalogRouteAccess('/abha-consent-list', {
    catalogProductSlugs: ['frontdesk'],
    catalogModuleSlug: 'opd',
    routePrefix: '/abha-consent-list',
  }),
  component: () => <Outlet />,
});
