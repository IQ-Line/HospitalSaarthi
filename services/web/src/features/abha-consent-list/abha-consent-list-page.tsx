import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Eye, Search } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@pulse/ui/tooltip';
import { DataTable } from '@/components/data-table';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { ConsentListArtifact, ConsentListFilters, ConsentListSession } from './api';
import { useConsentListQuery } from './api';
import { ConsentDetailsPanel, ViewDocumentsDialog } from './components';
import {
  defaultDateRange,
  formatConsentDate,
  formatConsentDateTime,
  hiTypesDisplayList,
  statusBadgeClass,
  statusLabel,
} from './formatters';

const PAGE_SIZE = 10;
const HI_TYPE_OPTIONS = [
  { value: 'all', label: 'All HI Types' },
  { value: 'Prescription', label: 'Prescription Record' },
  { value: 'DiagnosticReport', label: 'Diagnostic Record' },
  { value: 'DischargeSummary', label: 'Discharge Summary' },
  { value: 'OPConsultation', label: 'OP Consultation Note' },
  { value: 'ImmunizationRecord', label: 'Immunization Record' },
  { value: 'HealthDocumentRecord', label: 'Health Document' },
  { value: 'WellnessRecord', label: 'Wellness Record' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'granted', label: 'Granted' },
  { value: 'denied', label: 'Denied' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
] as const;

function HealthInfoTypesCell({ types }: { types: string[] }) {
  if (!types.length) return <span className="text-sm text-gray-700">—</span>;

  const labels = hiTypesDisplayList(types);
  const first = labels[0];

  if (labels.length === 1) {
    return <span className="text-sm whitespace-normal text-gray-700">{first}</span>;
  }

  return (
    <div className="flex min-w-[10rem] flex-wrap items-center gap-1">
      <span className="text-sm whitespace-normal text-gray-700">{first}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="cursor-pointer border-blue-200 bg-blue-50 px-1.5 text-xs text-blue-700 hover:bg-blue-100"
            onClick={(e) => e.stopPropagation()}
          >
            +{labels.length - 1}
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-sm border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-md"
        >
          {labels.join(', ')}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function defaultFilters(): ConsentListFilters {
  const { startDate, endDate } = defaultDateRange();
  return {
    search: '',
    drName: '',
    hiTypes: 'all',
    consentStatus: 'all',
    startDate,
    endDate,
  };
}

export function AbhaConsentListPage() {
  const [filters, setFilters] = useState<ConsentListFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);
  const [viewArtifactId, setViewArtifactId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const debouncedDrName = useDebouncedValue(filters.drName, 400);

  const listParams = useMemo(
    () => ({ page, limit: PAGE_SIZE, filters }),
    [page, filters],
  );

  const { data, isLoading } = useConsentListQuery(listParams, debouncedSearch, debouncedDrName);
  const sessions = data?.sessions ?? [];
  const viewSession = useMemo(
    () => sessions.find((s) => s.sessionId === viewSessionId) ?? null,
    [sessions, viewSessionId],
  );
  const viewArtifact = useMemo(() => {
    if (!viewSession || !viewArtifactId) return null;
    return viewSession.consentArtifacts.find((a) => a.consentId === viewArtifactId) ?? null;
  }, [viewSession, viewArtifactId]);

  const openViewDocuments = (session: ConsentListSession, artifact?: ConsentListArtifact) => {
    setViewSessionId(session.sessionId);
    setViewArtifactId(artifact?.consentId ?? null);
    setViewOpen(true);
  };

  const columns = useMemo<ColumnDef<ConsentListSession, unknown>[]>(
    () => [
      {
        id: 'serial',
        header: () => <span className="text-xs font-medium text-muted-foreground">Sl.No</span>,
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-gray-700">
            {(page - 1) * PAGE_SIZE + row.index + 1}
          </span>
        ),
      },
      {
        id: 'drName',
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Healthcare Provider</span>
        ),
        meta: { cellClassName: 'min-w-[8rem] whitespace-normal' },
        cell: ({ row }) => <span className="text-sm text-gray-700">{row.original.drName || '—'}</span>,
      },
      {
        id: 'patientName',
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Patient Name</span>
        ),
        meta: { cellClassName: 'min-w-[7rem] whitespace-normal' },
        cell: ({ row }) => (
          <span className="text-sm font-medium text-[#2563EB]">
            {row.original.identifiers.name || '—'}
          </span>
        ),
      },
      {
        id: 'abhaAddress',
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">ABHA Address</span>
        ),
        meta: { cellClassName: 'min-w-[9rem] whitespace-normal break-all' },
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">{row.original.identifiers.abha_address}</span>
        ),
      },
      {
        id: 'hiTypes',
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Health Information Types</span>
        ),
        meta: { cellClassName: 'min-w-[11rem] max-w-[14rem] whitespace-normal' },
        cell: ({ row }) => <HealthInfoTypesCell types={row.original.hiTypes} />,
      },
      {
        id: 'dateRange',
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Date Range</span>
        ),
        meta: { cellClassName: 'min-w-[9rem] whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">
            {formatConsentDate(row.original.fromDate)} to {formatConsentDate(row.original.toDate)}
          </span>
        ),
      },
      {
        id: 'expiry',
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Consent Expiry</span>
        ),
        meta: { cellClassName: 'min-w-[9rem] whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">
            {formatConsentDateTime(row.original.dataEraseAt)}
          </span>
        ),
      },
      {
        id: 'status',
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Consent Status</span>
        ),
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
            {statusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: 'view',
        header: () => <span className="text-xs font-medium text-muted-foreground">Data</span>,
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.status === 'GRANTED' ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-[#2563EB] px-3 text-white hover:bg-[#1d4ed8]"
              onClick={(e) => {
                e.stopPropagation();
                openViewDocuments(row.original);
              }}
            >
              <Eye className="size-3.5" />
              View
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: 'expand',
        header: () => null,
        cell: ({ row }) => {
          const expanded = expandedId === row.original.sessionId;
          return expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          );
        },
      },
    ],
    [expandedId, page],
  );

  const patchFilters = (patch: Partial<ConsentListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
    setExpandedId(null);
  };

  return (
    <div className="min-h-full bg-[#F5F5F5] px-2 pb-6 pt-4 md:px-4">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">ABHA Consent List</h1>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => patchFilters({ startDate: e.target.value })}
              className="h-10 w-[130px] bg-white"
              aria-label="From date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => patchFilters({ endDate: e.target.value })}
              className="h-10 w-[130px] bg-white"
              aria-label="To date"
            />
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => patchFilters({ search: e.target.value })}
              placeholder="Patient name or ABHA address"
              className="h-10 bg-white pl-9"
            />
          </div>

          <Input
            value={filters.drName}
            onChange={(e) => patchFilters({ drName: e.target.value })}
            placeholder="Healthcare provider"
            className="h-10 min-w-[180px] bg-white"
          />

          <Select value={filters.hiTypes} onValueChange={(v) => patchFilters({ hiTypes: v })}>
            <SelectTrigger className="h-10 w-[200px] bg-white">
              <SelectValue placeholder="HI type" />
            </SelectTrigger>
            <SelectContent>
              {HI_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.consentStatus}
            onValueChange={(v) => patchFilters({ consentStatus: v })}
          >
            <SelectTrigger className="h-10 w-[160px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <DataTable
          columns={columns}
          data={sessions}
          isLoading={isLoading}
          tableClassName="min-w-[1120px]"
          emptyTitle="No consent requests"
          emptyDescription="Consent requests initiated from Create RX will appear here."
          getRowId={(row) => row.sessionId}
          expandedRowId={expandedId}
          renderSubRow={(row) =>
            expandedId === row.sessionId ? (
              <ConsentDetailsPanel
                session={row}
                onViewDocuments={(artifact) => openViewDocuments(row, artifact)}
              />
            ) : null
          }
          onRowClick={(row) =>
            setExpandedId((prev) => (prev === row.sessionId ? null : row.sessionId))
          }
          manualPagination={{
            pageIndex: page - 1,
            pageSize: PAGE_SIZE,
            total: data?.totalCount ?? 0,
            onPageChange: (pageIndex) => {
              setPage(pageIndex + 1);
              setExpandedId(null);
            },
            onPageSizeChange: () => {},
          }}
        />
      </div>

      <ViewDocumentsDialog
        session={viewSession}
        artifact={viewArtifact}
        open={viewOpen}
        onOpenChange={(next) => {
          setViewOpen(next);
          if (!next) {
            setViewSessionId(null);
            setViewArtifactId(null);
          }
        }}
      />
    </div>
  );
}
