import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { fetchOpdPatientsList } from '../api/opd-patients';
import { opdPatientsQueryKeys } from '../api/query-keys';
import { ClinicalReportModal } from '@/components/clinical-report-modal';
import { useOpdPatientDetailsDialog } from '../hooks/use-opd-patient-details-dialog';
import { usePatientReports } from '../hooks/use-patient-reports';
import { OpdPatientDetailsDialog } from './opd-patient-details-dialog';
import { OpdPatientsFiltersBar } from './opd-patients-filters';
import {
  OpdPatientsScopeTabs,
  type OpdPatientsScopeTab,
} from './opd-patients-scope-tabs';
import { OpdPatientsStatsCards } from './opd-patients-stats-cards';
import { OpdPatientsTable } from './opd-patients-table';
import type { OpdDoctorScope, OpdPatientsFilters } from '../types';

const PAGE_SIZE = 10;

function defaultFilters(): OpdPatientsFilters {
  return {
    search: '',
    startDate: '',
    endDate: '',
    gender: '',
    ageGroup: '',
    visitType: '',
    status: '',
    doctorId: '',
  };
}

function hasActiveFilters(filters: OpdPatientsFilters): boolean {
  const defaults = defaultFilters();
  return (
    filters.search.trim() !== '' ||
    filters.gender !== defaults.gender ||
    filters.ageGroup !== defaults.ageGroup ||
    filters.visitType !== defaults.visitType ||
    filters.status !== defaults.status ||
    filters.doctorId !== defaults.doctorId ||
    filters.startDate !== defaults.startDate ||
    filters.endDate !== defaults.endDate
  );
}

function scopeFromTab(tab: OpdPatientsScopeTab): OpdDoctorScope {
  if (tab === 'my') return 'myPatients';
  if (tab === 'other') return 'otherPatients';
  return 'all';
}

export function OpdPatientsPage() {
  const [activeTab, setActiveTab] = useState<OpdPatientsScopeTab>('opd');
  const [filters, setFilters] = useState<OpdPatientsFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const patientDetailsDialog = useOpdPatientDetailsDialog();
  const patientReports = usePatientReports();
  const debouncedSearch = useDebouncedValue(filters.search, 400);

  const doctorScope: OpdDoctorScope =
    activeTab === 'opd' ? 'all' : scopeFromTab(activeTab);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      filters: { ...filters, search: debouncedSearch },
      doctorScope,
    }),
    [page, filters, debouncedSearch, doctorScope],
  );

  const { data, isLoading } = useQuery({
    queryKey: opdPatientsQueryKeys.list(listParams),
    queryFn: () => fetchOpdPatientsList(listParams),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const loading = isLoading;
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleFilterChange = (patch: Partial<OpdPatientsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters());
    setPage(1);
  };

  const handleTabChange = (tab: OpdPatientsScopeTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="min-h-full bg-[#F5F5F5] px-2 pb-6 pt-4 md:px-4">
      <OpdPatientsScopeTabs activeTab={activeTab} onChange={handleTabChange} />

      <div className="mb-6 mt-6">
        <OpdPatientsStatsCards stats={data?.stats} isLoading={loading} />
      </div>

      <div className="mb-6">
        <OpdPatientsFiltersBar
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          showClear={hasActiveFilters(filters)}
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <OpdPatientsTable
          rows={rows}
          isLoading={loading}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onPatientRowClick={patientDetailsDialog.onRowClick}
          onOpenReport={(row, reportType) =>
            patientReports.openReport(row.id, reportType, {
              doctor_name: row.doctorName !== '—' ? row.doctorName : undefined,
            })
          }
        />
      </div>

      <ClinicalReportModal
        open={patientReports.open}
        onOpenChange={(open) => {
          if (!open) patientReports.closeReport();
        }}
        visitId={patientReports.selection?.visitId ?? null}
        reportType={patientReports.selection?.reportType ?? null}
        reportContext={patientReports.selection?.reportContext}
      />

      <OpdPatientDetailsDialog
        open={patientDetailsDialog.open}
        details={patientDetailsDialog.details}
        isLoading={patientDetailsDialog.isLoading}
        onClose={patientDetailsDialog.onClose}
      />
    </div>
  );
}
