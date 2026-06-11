import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Search } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { HISTORICAL_RECORDS_STALE_MS } from '../api/constants';
import { fetchHistoricalPatientReports, REPORT_HI_TYPES } from '../api/historical-records';
import { historicalRecordsQueryKeys } from '../api/query-keys';
import { defaultDateRange, formatHistoricalShortDate } from '../lib/formatters';
import type { HistoricalReportItem } from '../types';

interface HistoricalReportsTabProps {
  patientId: string;
}

function ReportCard({ report, patientId }: { report: HistoricalReportItem; patientId: string }) {
  const content = (
    <article className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md">
      <div className="mb-2 flex items-start gap-2">
        <FileText className="size-5 shrink-0 text-gray-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800">{report.title}</p>
          <p className="mt-1 text-xs font-medium text-[#0D9488]">{report.hiType}</p>
        </div>
      </div>
      <p className="text-sm text-gray-700">{report.doctorName}</p>
      <p className="mt-1 text-xs text-gray-500">Visit ID: {report.visitNumber}</p>
      <p className="mt-1 text-xs text-gray-500">
        Report time: {formatHistoricalShortDate(report.reportTime)},{' '}
        {new Date(report.reportTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </p>
    </article>
  );

  if (report.source === 'prescription' && report.visitId) {
    return (
      <Link
        to="/create-rx/$visitId"
        params={{ visitId: report.visitId }}
        search={{ mode: 'view', loadPrescription: true, patientId }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function HistoricalReportsTab({ patientId }: HistoricalReportsTabProps) {
  const { startDate, endDate } = defaultDateRange();
  const [filters, setFilters] = useState({
    startDate,
    endDate,
    search: '',
    hiType: 'all',
    reportCategory: 'all',
  });
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const { data: reports = [], isLoading } = useQuery({
    queryKey: historicalRecordsQueryKeys.patientReports(patientId, queryFilters),
    queryFn: () => fetchHistoricalPatientReports(patientId, queryFilters),
    enabled: Boolean(patientId),
    staleTime: HISTORICAL_RECORDS_STALE_MS,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="h-10 w-[130px]"
          aria-label="From date"
        />
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="h-10 w-[130px]"
          aria-label="To date"
        />
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search by report title..."
            className="h-10 pl-9"
          />
        </div>
        <Select
          value={filters.hiType}
          onValueChange={(value) => setFilters((f) => ({ ...f, hiType: value }))}
        >
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue placeholder="HI Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All HI Types</SelectItem>
            {REPORT_HI_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.reportCategory}
          onValueChange={(value) => setFilters((f) => ({ ...f, reportCategory: value }))}
        >
          <SelectTrigger className="h-10 w-[160px]">
            <SelectValue placeholder="Reports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            {REPORT_HI_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg bg-[#F5F5F5] py-16 text-center text-sm text-muted-foreground">
          No reports found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} patientId={patientId} />
          ))}
        </div>
      )}
    </div>
  );
}
