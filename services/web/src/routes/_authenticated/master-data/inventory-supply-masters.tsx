import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export const Route = createFileRoute('/_authenticated/master-data/inventory-supply-masters')({
  beforeLoad: requireCatalogRouteAccess('/master-data/inventory-supply-masters', {
    catalogProductSlugs: ['master-data', 'inventory-master'],
    routePrefix: '/master-data/inventory-supply-masters',
    catalogModuleSlug: 'inventory-master',
  }),
  component: () => <Outlet />,
});
