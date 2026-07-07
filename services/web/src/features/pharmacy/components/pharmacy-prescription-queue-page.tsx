import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Badge } from '@pulse/ui/badge';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import { fetchPrescriptionQueueMock } from '../api/pharmacy-ui-mock';
import { pharmacyQueryKeys } from '../api/query-keys';
import { DEMO_DOCTORS } from '../data/pharmacy-demo-data';
import type {
  PharmacyPrescriptionQueueRow,
  PharmacyQueueDisplayStatus,
  PharmacyVisitWorkflowStatus,
} from '../types/queue-ui.types';
import { PharmacyPageShell } from './pharmacy-page-shell';

const PAGE_SIZE = 25;

const VISIT_STATUS_OPTIONS: { value: PharmacyVisitWorkflowStatus; label: string }[] = [
  { value: 'registered', label: 'Registered' },
  { value: 'pre_consulted', label: 'Pre consulted' },
  { value: 'consulted', label: 'Consulted' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No show' },
];

const PHARMACY_STATUS_OPTIONS: { value: PharmacyQueueDisplayStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'no_queued', label: 'No queued' },
  { value: 'partial', label: 'Partial' },
  { value: 'dispensed', label: 'Dispensed' },
];

function defaultDateRange(): { from: string; to: string } {
  const today = new Date().toISOString().slice(0, 10);
  return { from: today, to: today };
}

function visitStatusLabel(status: PharmacyVisitWorkflowStatus): string {
  return VISIT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function pharmacyStatusLabel(status: PharmacyQueueDisplayStatus): string {
  return PHARMACY_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function pharmacyStatusBadgeClass(status: PharmacyQueueDisplayStatus): string {
  const map: Record<PharmacyQueueDisplayStatus, string> = {
    pending: 'border-amber-500/60 text-amber-800',
    no_queued: 'border-slate-400/60 text-slate-700',
    partial: 'border-sky-500/60 text-sky-800',
    dispensed: 'border-green-500/60 text-green-700',
  };
  return map[status];
}

function formatQueuedAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatVisitDateTime(date: string, time: string): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  const ddMmYyyy = d && m && y ? `${d}/${m}/${y}` : date;
  return time ? `${ddMmYyyy}, ${time}` : ddMmYyyy;
}

export function PharmacyPrescriptionQueuePage() {
  const initialRange = useMemo(() => defaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [doctorId, setDoctorId] = useState('__all__');
  const [visitStatus, setVisitStatus] = useState<PharmacyVisitWorkflowStatus | '__all__'>(
    '__all__',
  );
  const [pharmacyStatus, setPharmacyStatus] = useState<PharmacyQueueDisplayStatus | '__all__'>(
    '__all__',
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const listParams = useMemo(
    () => ({
      date_from: dateFrom,
      date_to: dateTo,
      doctor_id: doctorId === '__all__' ? undefined : doctorId,
      visit_status: visitStatus === '__all__' ? undefined : visitStatus,
      pharmacy_status: pharmacyStatus === '__all__' ? undefined : pharmacyStatus,
      q: search.trim() || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [dateFrom, dateTo, doctorId, visitStatus, pharmacyStatus, search, page],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: pharmacyQueryKeys.prescriptionQueue(listParams),
    queryFn: () => fetchPrescriptionQueueMock(listParams),
    placeholderData: (prev) => prev,
  });

  const columns = useMemo<ColumnDef<PharmacyPrescriptionQueueRow>[]>(
    () => [
      {
        id: 'visit_id',
        header: 'Visit ID',
        accessorKey: 'formatted_visit_id',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.formatted_visit_id}
          </span>
        ),
      },
      {
        id: 'patient',
        header: 'Patient',
        accessorKey: 'patient_name',
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <p className="font-medium">{row.original.patient_name}</p>
            <p className="text-xs text-muted-foreground">{row.original.uhid}</p>
          </div>
        ),
      },
      {
        id: 'rx_number',
        header: 'Rx #',
        accessorKey: 'rx_number',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.rx_number}</span>
        ),
      },
      {
        id: 'pharmacy_status',
        header: 'Pharmacy',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={pharmacyStatusBadgeClass(row.original.pharmacy_status)}
          >
            {pharmacyStatusLabel(row.original.pharmacy_status)}
          </Badge>
        ),
      },
      {
        id: 'visit_status',
        header: 'Visit',
        cell: ({ row }) => (
          <Badge variant="secondary">{visitStatusLabel(row.original.visit_status)}</Badge>
        ),
      },
      {
        id: 'visit_datetime',
        header: 'Date & time',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {formatVisitDateTime(row.original.visit_date, row.original.visit_time)}
          </span>
        ),
      },
      {
        id: 'doctor',
        header: 'Doctor',
        accessorKey: 'doctor_name',
      },
      {
        id: 'queued_at',
        header: 'Queued',
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatQueuedAt(row.original.queued_at)}
          </span>
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        cell: ({ row }) => {
          if (row.original.priority === 'stat') {
            return <Badge variant="destructive">STAT</Badge>;
          }
          if (row.original.priority === 'routine') {
            return <span className="text-xs text-muted-foreground">Routine</span>;
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
    ],
    [],
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
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All doctors</SelectItem>
                {DEMO_DOCTORS.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={visitStatus}
              onValueChange={(v) => {
                setVisitStatus(v as PharmacyVisitWorkflowStatus | '__all__');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="All Visit status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Visit status</SelectItem>
                {VISIT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={pharmacyStatus}
              onValueChange={(v) => {
                setPharmacyStatus(v as PharmacyQueueDisplayStatus | '__all__');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="All Pharmacy status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Pharmacy status</SelectItem>
                {PHARMACY_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full lg:max-w-[260px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search or scan Rx code…"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Unable to load prescription queue.'}
          </div>
        ) : null}

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          emptyTitle="No visits match your filters for this date range."
          manualPagination={{
            pageIndex: page - 1,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onPageChange: (pageIndex) => setPage(pageIndex + 1),
            onPageSizeChange: () => {
              /* fixed page size for demo queue */
            },
          }}
        />
      </div>
    </PharmacyPageShell>
  );
}
