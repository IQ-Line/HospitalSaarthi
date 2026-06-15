import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { ClinicalReportModal } from '@/components/clinical-report-modal';
import { downloadHealthDocument } from '@/features/create-rx/api/health-documents';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { HISTORICAL_RECORDS_STALE_MS } from '../api/constants';
import { fetchHistoricalPatientReports, REPORT_HI_TYPES } from '../api/historical-records';
import { historicalRecordsQueryKeys } from '../api/query-keys';
import { usePatientReports } from '@/features/opd-patients/hooks/use-patient-reports';
import { formatHistoricalShortDate, historicalPatientTabDateRange } from '../lib/formatters';
import type { HistoricalReportItem } from '../types';

interface HistoricalReportsTabProps {
  patientId: string;
}

function ReportCard({
  report,
  onOpenClinicalReport,
}: {
  report: HistoricalReportItem;
  onOpenClinicalReport: (report: HistoricalReportItem) => void;
}) {
  const handleClick = () => {
    if (report.clinicalReportType && report.visitId) {
      onOpenClinicalReport(report);
      return;
    }
    if (report.source === 'health_document' && report.downloadUrl) {
      void downloadHealthDocument(
        report.downloadUrl,
        report.fileName ?? 'document',
        report.fileType ?? 'application/octet-stream',
      ).catch((error) => {
        console.error(error);
        toast.error('Failed to download report');
      });
    }
  };

  const isInteractive =
    Boolean(report.clinicalReportType && report.visitId) ||
    Boolean(report.source === 'health_document' && report.downloadUrl);

  return (
    <button
      type="button"
      onClick={isInteractive ? handleClick : undefined}
      disabled={!isInteractive}
      className="block w-full text-left disabled:cursor-default"
    >
      <article className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md disabled:hover:border-[#E2E8F0] disabled:hover:shadow-sm">
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
        {isInteractive ? (
          <p className="mt-2 text-xs font-medium text-[#2563EB]">
            {report.clinicalReportType ? 'View report' : 'Download'}
          </p>
        ) : null}
      </article>
    </button>
  );
}

export function HistoricalReportsTab({ patientId }: HistoricalReportsTabProps) {
  const { startDate, endDate } = historicalPatientTabDateRange();
  const patientReports = usePatientReports();
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

  const { data: reports = [], isLoading, isError, error } = useQuery({
    queryKey: historicalRecordsQueryKeys.patientReports(patientId, queryFilters),
    queryFn: () => fetchHistoricalPatientReports(patientId, queryFilters),
    enabled: Boolean(patientId),
    staleTime: HISTORICAL_RECORDS_STALE_MS,
  });

  const handleOpenClinicalReport = (report: HistoricalReportItem) => {
    if (!report.visitId || !report.clinicalReportType) return;
    patientReports.openReport(report.visitId, report.clinicalReportType, {
      patientId,
      doctor_name: report.doctorName !== '—' ? report.doctorName : undefined,
    });
  };

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
      ) : isError ? (
        <div className="rounded-lg bg-[#F5F5F5] py-16 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load reports'}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg bg-[#F5F5F5] py-16 text-center text-sm text-muted-foreground">
          No reports found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpenClinicalReport={handleOpenClinicalReport}
            />
          ))}
        </div>
      )}

      <ClinicalReportModal
        open={patientReports.open}
        onOpenChange={(open) => {
          if (!open) patientReports.closeReport();
        }}
        visitId={patientReports.selection?.visitId ?? null}
        reportType={patientReports.selection?.reportType ?? null}
        reportContext={patientReports.selection?.reportContext}
      />
    </div>
  );
}
