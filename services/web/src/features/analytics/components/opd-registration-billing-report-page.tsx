import { FileSpreadsheet, Loader2 } from 'lucide-react';
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
import { StatCard } from '@/features/dashboard/components/stat-card';
import { FacilitySwitcher } from '@/features/dashboard/components/facility-switcher';
import { OpdRegistrationBillingReportTable } from './opd-registration-billing-report-table';
import {
  OPD_REGISTRATION_BILLING_PAGE_SIZE,
  REGISTRATION_SOURCE_OPTIONS,
  type OpdRegistrationBillingReportFilters,
  type OpdRegistrationBillingReportPage,
} from '../types';

interface OpdRegistrationBillingReportPageViewProps {
  showFacilitySwitcher: boolean;
  facilityTenantId: string | undefined;
  homeTenantId: string | null;
  onFacilityChange: (tenantId: string) => void;
  draftFilters: OpdRegistrationBillingReportFilters;
  onDraftFiltersChange: (patch: Partial<OpdRegistrationBillingReportFilters>) => void;
  onLoadReport: () => void;
  onDownloadExcel: () => void;
  page: number;
  onPageChange: (page: number) => void;
  report: OpdRegistrationBillingReportPage | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isDownloading: boolean;
  hasLoadedReport: boolean;
  errorMessage: string | null;
}

export function OpdRegistrationBillingReportPageView({
  showFacilitySwitcher,
  facilityTenantId,
  homeTenantId,
  onFacilityChange,
  draftFilters,
  onDraftFiltersChange,
  onLoadReport,
  onDownloadExcel,
  page,
  onPageChange,
  report,
  isLoading,
  isFetching,
  isDownloading,
  hasLoadedReport,
  errorMessage,
}: OpdRegistrationBillingReportPageViewProps) {
  return (
    <div className="min-h-full bg-[#F5F5F5] px-4 pb-8 pt-4 md:px-6">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">OPD registration &amp; billing</h1>
        {showFacilitySwitcher ? (
          <div className="w-full max-w-sm md:w-auto">
            <FacilitySwitcher
              selectedTenantId={facilityTenantId}
              homeTenantId={homeTenantId}
              onChange={onFacilityChange}
              label="Facility / tenant"
            />
          </div>
        ) : null}
      </div>

      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <p className="mb-4 text-sm text-muted-foreground">
          {showFacilitySwitcher
            ? 'Choose the facility above, set from/to dates and registration source, then click Load report. Download Excel is available after a successful load.'
            : 'Set from/to dates and registration source, then click Load report for your tenant. Download Excel is available after a successful load.'}
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="from-date">From date</Label>
            <Input
              id="from-date"
              type="date"
              value={draftFilters.fromDate}
              onChange={(e) => onDraftFiltersChange({ fromDate: e.target.value })}
              className="w-[170px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-date">To date</Label>
            <Input
              id="to-date"
              type="date"
              value={draftFilters.toDate}
              onChange={(e) => onDraftFiltersChange({ toDate: e.target.value })}
              className="w-[170px]"
            />
          </div>
          <div className="min-w-[220px] space-y-2">
            <Label htmlFor="registration-source">Registration source</Label>
            <Select
              value={draftFilters.registrationSource}
              onValueChange={(value) =>
                onDraftFiltersChange({
                  registrationSource: value as OpdRegistrationBillingReportFilters['registrationSource'],
                })
              }
            >
              <SelectTrigger id="registration-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGISTRATION_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={onLoadReport} disabled={!facilityTenantId || isLoading}>
            Load report
          </Button>
          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onDownloadExcel}
              disabled={!hasLoadedReport || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <FileSpreadsheet className="mr-2 size-4" aria-hidden />
              )}
              Download Excel
            </Button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {report ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total patients registered"
              value={report.summary.total_patients_registered}
            />
            <StatCard
              label="Total manual registrations"
              value={report.summary.total_manual_registrations}
            />
            <StatCard
              label="Total ABHA registrations"
              value={report.summary.total_abha_registrations}
            />
            <StatCard label="Total fees collected" value={report.summary.total_fees_collected} />
            <StatCard
              label="Registration fees collected"
              value={report.summary.registration_fees_collected}
            />
            <StatCard
              label="Consultation fees collected"
              value={report.summary.consultation_fees_collected}
            />
          </div>

          <div className="relative overflow-hidden rounded-lg border bg-white shadow-sm">
            {isFetching && !isLoading ? (
              <div className="absolute right-4 top-4 z-10">
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : null}
            <OpdRegistrationBillingReportTable
              rows={report.data}
              isLoading={isLoading}
              total={report.total}
              page={page}
              pageSize={OPD_REGISTRATION_BILLING_PAGE_SIZE}
              onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
