import { createFileRoute } from '@tanstack/react-router';
import { HistoricalRecordDetailPage } from '@/features/historical-records/components/historical-record-detail-page';
import type { HistoricalDetailTab } from '@/features/historical-records/types';

type HistoricalRecordSearch = {
  tab?: HistoricalDetailTab;
};

export const Route = createFileRoute('/_authenticated/historical-records/$patientId')({
  validateSearch: (search: Record<string, unknown>): HistoricalRecordSearch => ({
    tab:
      search.tab === 'documents' || search.tab === 'reports' || search.tab === 'profile'
        ? search.tab
        : 'profile',
  }),
  component: HistoricalRecordDetailRoute,
});

function HistoricalRecordDetailRoute() {
  const { patientId } = Route.useParams();
  const { tab = 'profile' } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleTabChange = (nextTab: HistoricalDetailTab) => {
    void navigate({
      search: { tab: nextTab },
      replace: true,
    });
  };

  return (
    <HistoricalRecordDetailPage
      patientId={patientId}
      activeTab={tab}
      onTabChange={handleTabChange}
    />
  );
}
