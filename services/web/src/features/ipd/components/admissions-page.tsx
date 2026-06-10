import { useMemo, useState, type MouseEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { confirmAdmission, fetchAdmissionsList } from '../api/admissions';
import { ipdQueryKeys } from '../api/query-keys';
import {
  admissionStatusBadgeClass,
  admissionStatusLabel,
  admissionTypeLabel,
  formatAdmissionRequestedAt,
} from '../lib/display';
import type { AdmissionRow, AdmissionsFilters } from '../types';

const PAGE_SIZE = 10;
const NONE = '__all__';

const defaultFilters = (): AdmissionsFilters => ({ search: '', status: '', type: '' });

export function AdmissionsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const listParams = useMemo(
    () => ({ page, limit: pageSize, filters: { ...filters, search: debouncedSearch } }),
    [page, pageSize, filters, debouncedSearch],
  );

  const { data, isLoading } = useQuery({
    queryKey: ipdQueryKeys.admissionsList(listParams),
    queryFn: () => fetchAdmissionsList(listParams),
    placeholderData: (prev) => prev,
  });

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmAdmission(id),
    onMutate: (id) => setConfirmingId(id),
    onSuccess: (result) => {
      toast.success(`Admission confirmed · ${result.episodeNumber}`);
      void queryClient.invalidateQueries({ queryKey: ipdQueryKeys.admissions() });
    },
    onError: (err) => toast.error(mutationErrorMessage(err)),
    onSettled: () => setConfirmingId(null),
  });

  const columns = useMemo<ColumnDef<AdmissionRow, unknown>[]>(
    () => [
      {
        accessorKey: 'episodeNumber',
        header: 'Episode #',
        meta: { label: 'Episode #' },
        cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.episodeNumber}</span>,
      },
      {
        accessorKey: 'patientName',
        header: 'Patient Name',
        meta: { label: 'Patient Name' },
      },
      {
        accessorKey: 'uhid',
        header: 'UHID',
        meta: { label: 'UHID' },
        cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.uhid}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        meta: { label: 'Type' },
        cell: ({ row }) => admissionTypeLabel(row.original.type),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${admissionStatusBadgeClass(row.original.status)}`}
          >
            {admissionStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        accessorKey: 'specialty',
        header: 'Specialty',
        meta: { label: 'Specialty' },
        cell: ({ row }) => <span className="text-sm">{row.original.specialty}</span>,
      },
      {
        accessorKey: 'requestedAt',
        header: 'Requested',
        meta: { label: 'Requested' },
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{formatAdmissionRequestedAt(row.original.requestedAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) =>
          row.original.status === 'scheduled' ? (
            <div
              className="flex items-center gap-1.5"
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 gap-1.5"
                disabled={confirmingId === row.original.id}
                onClick={() => confirmMutation.mutate(row.original.id)}
              >
                <Check className="size-3.5" />
                {confirmingId === row.original.id ? 'Confirming…' : 'Confirm'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                asChild
              >
                <Link
                  to="/ipd/admissions/$admissionId"
                  params={{ admissionId: row.original.id }}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </Button>
            </div>
          ) : null,
      },
    ],
    [confirmingId, confirmMutation],
  );

  const patch = (p: Partial<AdmissionsFilters>) => {
    setFilters((prev) => ({ ...prev, ...p }));
    setPage(1);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Admission Queue"
        actions={
          <Button asChild className="gap-1.5">
            <Link to="/ipd/admissions/new">
              <Plus className="size-4" />
              New Admission
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name..."
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status || NONE}
          onValueChange={(v) => patch({ status: v === NONE ? '' : (v as AdmissionsFilters['status']) })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="pending_clearance">Pending clearance</SelectItem>
            <SelectItem value="admitted">Admitted</SelectItem>
            <SelectItem value="discharge_planning">Discharge planning</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.type || NONE}
          onValueChange={(v) => patch({ type: v === NONE ? '' : (v as AdmissionsFilters['type']) })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Admission" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All Admission</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          showColumnMenu
          emptyTitle="No admissions"
          emptyDescription="No admission requests match the current filters."
          manualPagination={{
            pageIndex: page - 1,
            pageSize,
            total: data?.total ?? 0,
            onPageChange: (i) => setPage(i + 1),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </div>
    </div>
  );
}
