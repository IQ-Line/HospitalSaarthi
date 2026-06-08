import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { fetchPharmacyQueue } from '../api/pharmacy-queue';
import { pharmacyQueryKeys } from '../api/query-keys';
import type { PharmacyQueueStatusFilter, PharmacyQueueDateRange } from '../types';
import { PharmacyQueueFiltersBar } from './pharmacy-queue-filters';
import { PharmacyQueueTable } from './pharmacy-queue-table';

const PAGE_SIZE = 10;

const defaultDateRange = (): PharmacyQueueDateRange => ({
  queued_from: '',
  queued_to: '',
});

export function PharmacyQueuePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PharmacyQueueStatusFilter>('pending');
  const [dateRange, setDateRange] = useState<PharmacyQueueDateRange>(defaultDateRange);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      queued_from: dateRange.queued_from || undefined,
      queued_to: dateRange.queued_to || undefined,
      q: debouncedSearch.trim() || undefined,
      status: statusFilter,
    }),
    [page, dateRange.queued_from, dateRange.queued_to, debouncedSearch, statusFilter],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: pharmacyQueryKeys.queue(listParams),
    queryFn: () => fetchPharmacyQueue(listParams),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: PharmacyQueueStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDateRangeChange = (value: PharmacyQueueDateRange) => {
    setDateRange(value);
    setPage(1);
  };

  return (
    <div className="min-h-full bg-[#F5F5F5] px-2 pb-6 pt-4 md:px-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Prescription Queue</h1>
        <Button type="button" className="w-full sm:w-auto" asChild>
          <Link to="/pharmacy/dispense/new">Dispense</Link>
        </Button>
      </div>

      <div className="mb-6">
        <PharmacyQueueFiltersBar
          search={search}
          status={statusFilter}
          dateRange={dateRange}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Unable to load pharmacy queue.'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <PharmacyQueueTable
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
