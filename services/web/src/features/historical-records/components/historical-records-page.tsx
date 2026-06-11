import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { HISTORICAL_RECORDS_STALE_MS } from '../api/constants';
import { fetchHistoricalRecordsList } from '../api/historical-records';
import { historicalRecordsQueryKeys } from '../api/query-keys';
import { defaultDateRange } from '../lib/formatters';
import { HistoricalRecordsFiltersBar } from './historical-records-filters';
import { HistoricalRecordsTable } from './historical-records-table';
import type { HistoricalRecordsFilters } from '../types';

const PAGE_SIZE = 10;

function defaultFilters(): HistoricalRecordsFilters {
  const { startDate, endDate } = defaultDateRange();
  return {
    search: '',
    searchField: 'patient_name',
    startDate,
    endDate,
  };
}

export function HistoricalRecordsPage() {
  const [filters, setFilters] = useState<HistoricalRecordsFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 400);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      filters: { ...filters, search: debouncedSearch },
    }),
    [page, filters, debouncedSearch],
  );

  const { data, isLoading } = useQuery({
    queryKey: historicalRecordsQueryKeys.list(listParams),
    queryFn: () => fetchHistoricalRecordsList(listParams),
    placeholderData: (prev) => prev,
    staleTime: HISTORICAL_RECORDS_STALE_MS,
  });

  const handleFilterChange = (patch: Partial<HistoricalRecordsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <div className="min-h-full bg-[#F5F5F5] px-2 pb-6 pt-4 md:px-4">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Historical Records</h1>

      <div className="mb-6">
        <HistoricalRecordsFiltersBar filters={filters} onChange={handleFilterChange} />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <HistoricalRecordsTable
          rows={data?.items ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
