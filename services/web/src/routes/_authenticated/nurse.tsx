import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/nurse')({
  beforeLoad: requireCatalogRouteAccess('/nurse/patients', {
    catalogProductSlugs: ['frontdesk'],
    catalogModuleSlug: 'opd',
    routePrefix: '/nurse',
  }),
  component: () => <Outlet />,
});
