import { useMemo } from 'react';
import { useDepartments, usePicklistValues } from '@/features/master-data/api';
import { useDoctorsForDepartment } from './use-doctors-for-department';
import { TARIFF_TYPE_PICKLIST_SLUG, tariffTypeRequiresProvider } from '../lib/tariff-type';

/** Same department API as visit registration (`GET /api/v1/master-data/departments`). */
export function useTariffCreateLookups(
  enabled: boolean,
  tariffType: string,
  departmentId: string | null,
  iqTenantId?: string,
) {
  const picklists = usePicklistValues(TARIFF_TYPE_PICKLIST_SLUG, enabled);
  const requiresProvider = tariffTypeRequiresProvider(tariffType);
  const departments = useDepartments(undefined, {
    formCatalog: true,
    enabled: enabled && requiresProvider,
    iqTenantId,
  });

  const doctors = useDoctorsForDepartment(departmentId, {
    enabled: enabled && requiresProvider && Boolean(departmentId),
    iqTenantId,
    includeAllWhenEmpty: true,
  });

  const tariffTypeOptions = useMemo(
    () =>
      (picklists.data ?? []).map((row) => ({
        value: row.value,
        label: row.label,
      })),
    [picklists.data],
  );

  const departmentOptions = useMemo(
    () => (departments.data?.data ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departments.data?.data],
  );

  return {
    tariffTypeOptions,
    departmentOptions,
    doctorOptions: doctors.doctorOptions,
    isLoadingPicklists: picklists.isPending,
    isLoadingDepartments: departments.isPending,
    isLoadingDoctors: doctors.isLoading,
    departmentsError: departments.isError,
    doctorsError: doctors.isError,
  };
}

/** Tariff type filter options for list pages (picklist value + label). */
export function useTariffTypeFilterOptions(enabled = true) {
  const picklists = usePicklistValues(TARIFF_TYPE_PICKLIST_SLUG, enabled);
  const options = useMemo(
    () =>
      (picklists.data ?? []).map((row) => ({
        value: row.value,
        label: row.label,
      })),
    [picklists.data],
  );
  return { options, isLoading: picklists.isPending };
}
