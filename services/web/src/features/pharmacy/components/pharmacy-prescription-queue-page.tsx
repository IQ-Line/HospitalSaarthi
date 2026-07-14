import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { fetchPharmacyQueue } from '../api/pharmacy-queue';
import { pharmacyQueryKeys } from '../api/query-keys';
import type { PharmacyQueueItem, PharmacyQueueStatusFilter } from '../types';
import { PharmacyPageShell } from './pharmacy-page-shell';
import { PharmacyQueueTable } from './pharmacy-queue-table';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const PRESCRIPTION_STATUS_OPTIONS: { value: PharmacyQueueStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial_issue', label: 'Partial' },
  { value: 'issued', label: 'Dispensed' },
];

function defaultDateRange(): { from: string; to: string } {
  const today = new Date().toISOString().slice(0, 10);
  return { from: today, to: today };
}

function uniqueDoctorsFromItems(items: PharmacyQueueItem[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const item of items) {
    const id = item.doctor_id?.trim();
    if (!id) continue;
    const name = item.doctor_name?.trim() || id.slice(0, 8);
    byId.set(id, name);
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function PharmacyPrescriptionQueuePage() {
  const initialRange = useMemo(() => defaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [doctorId, setDoctorId] = useState('__all__');
  const [prescriptionStatus, setPrescriptionStatus] = useState<PharmacyQueueStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listParams = useMemo(
    () => ({
      kind: 'opd' as const,
      page,
      limit: pageSize,
      queued_from: dateFrom || undefined,
      queued_to: dateTo || undefined,
      doctor_id: doctorId === '__all__' ? undefined : doctorId,
      status: prescriptionStatus,
      q: debouncedSearch.trim() || undefined,
    }),
    [dateFrom, dateTo, doctorId, prescriptionStatus, debouncedSearch, page, pageSize],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: pharmacyQueryKeys.queue(listParams),
    queryFn: () => fetchPharmacyQueue(listParams),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const doctorOptionsParams = useMemo(
    () => ({
      kind: 'opd' as const,
      page: 1,
      limit: 100,
      queued_from: dateFrom || undefined,
      queued_to: dateTo || undefined,
      status: prescriptionStatus,
    }),
    [dateFrom, dateTo, prescriptionStatus],
  );

  const { data: doctorSourceData } = useQuery({
    queryKey: pharmacyQueryKeys.queue({ ...doctorOptionsParams, scope: 'doctors' }),
    queryFn: () => fetchPharmacyQueue(doctorOptionsParams),
    staleTime: 60_000,
  });

  const doctorOptions = useMemo(
    () => uniqueDoctorsFromItems(doctorSourceData?.items ?? []),
    [doctorSourceData?.items],
  );

  const datePickers = (
    <div className="flex flex-wrap items-center gap-1.5">
      <Label htmlFor="pharmacy-queue-from" className="sr-only">
        From date
      </Label>
      <Input
        id="pharmacy-queue-from"
        type="date"
        className="h-9 w-[132px]"
        value={dateFrom}
        max={dateTo}
        onChange={(e) => {
          setDateFrom(e.target.value);
          setPage(1);
        }}
      />
      <span className="text-muted-foreground" aria-hidden>
        –
      </span>
      <Label htmlFor="pharmacy-queue-to" className="sr-only">
        To date
      </Label>
      <Input
        id="pharmacy-queue-to"
        type="date"
        className="h-9 w-[132px]"
        value={dateTo}
        min={dateFrom}
        onChange={(e) => {
          setDateTo(e.target.value);
          setPage(1);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9"
        onClick={() => {
          const t = defaultDateRange();
          setDateFrom(t.from);
          setDateTo(t.to);
          setPage(1);
        }}
      >
        Today
      </Button>
    </div>
  );

  return (
    <PharmacyPageShell
      title="Prescription Queue"
      breadcrumbLabel="Queue"
      actions={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {datePickers}
          <Button type="button" variant="outline" size="sm" className="h-9" asChild>
            <Link to="/pharmacy/dispensing">Dispense Medicine</Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={doctorId}
              onValueChange={(v) => {
                setDoctorId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All doctors</SelectItem>
                {doctorOptions.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={prescriptionStatus}
              onValueChange={(v) => {
                setPrescriptionStatus(v as PharmacyQueueStatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="Prescription status" />
              </SelectTrigger>
              <SelectContent>
                {PRESCRIPTION_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full lg:max-w-[320px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rx #, visit ID, UHID, patient name…"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Unable to load prescription queue.'}
          </div>
        ) : null}

        <PharmacyQueueTable
          rows={data?.items ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
          emptyTitle="No prescriptions in queue"
          emptyDescription="Completed OPD visits with final prescriptions appear here."
        />
      </div>
    </PharmacyPageShell>
  );
}
