import { createFileRoute } from '@tanstack/react-router';
import { PharmacyReplenishmentPage } from '@/features/pharmacy/components/replenishment/pharmacy-replenishment-page';
import type { ReplenishmentTab } from '@/features/pharmacy/types/replenishment-ui.types';

type ReplenishmentSearch = {
  tab?: ReplenishmentTab;
};

export const Route = createFileRoute('/_authenticated/pharmacy/replenishment')({
  validateSearch: (search: Record<string, unknown>): ReplenishmentSearch => ({
    tab: search.tab === 'indents' ? 'indents' : undefined,
  }),
  component: ReplenishmentRoute,
});

function ReplenishmentRoute() {
  const { tab } = Route.useSearch();
  const activeTab: ReplenishmentTab = tab === 'indents' ? 'indents' : 'low-stock';
  return <PharmacyReplenishmentPage activeTab={activeTab} />;
}
