import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ClinicalReportModal } from '@/components/clinical-report-modal';
import { OpdPatientsFiltersBar } from '@/features/opd-patients/components/opd-patients-filters';
import { usePatientReports } from '@/features/opd-patients/hooks/use-patient-reports';
import type { OpdPatientsFilters } from '@/features/opd-patients/types';
import { fetchNursePatientsList } from '../api/nurse-patients';
import { nursePatientsQueryKeys } from '../api/query-keys';
import { NursePatientsTable } from './nurse-patients-table';
import { NurseStatsCards } from './nurse-stats-cards';

const PAGE_SIZE = 10;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultFilters(): OpdPatientsFilters {
  const today = todayIsoDate();
  return {
    search: '',
    startDate: today,
    endDate: today,
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

export function NursePatientsPage() {
  const [filters, setFilters] = useState<OpdPatientsFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const patientReports = usePatientReports();
  const debouncedSearch = useDebouncedValue(filters.search, 400);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      filters: { ...filters, search: debouncedSearch },
      doctorScope: 'all' as const,
    }),
    [page, filters, debouncedSearch],
  );

  const { data, isLoading } = useQuery({
    queryKey: nursePatientsQueryKeys.list(listParams),
    queryFn: () => fetchNursePatientsList(listParams),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const handleFilterChange = (patch: Partial<OpdPatientsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters());
    setPage(1);
  };

  return (
    <div className="min-h-full bg-[#F5F5F5] px-2 pb-6 pt-4 md:px-4">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">OPD Patients</h1>

      <div className="mb-6">
        <NurseStatsCards stats={data?.stats} isLoading={isLoading} />
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
        <NursePatientsTable
          rows={data?.items ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
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
    </div>
  );
}
