import { useMemo } from 'react';
import { useDepartments, usePicklistValues } from '@/features/master-data/api';
import { useProviderList } from '@/features/user-management/api/queries';
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
  const selectedDepartmentName = useMemo(
    () =>
      (departments.data?.data ?? []).find((d) => d.id === departmentId)?.name ?? null,
    [departmentId, departments.data?.data],
  );

  /**
   * `GET /api/user-management/providers` — `auth.read`, not `user.read`, so receptionist /
   * clinical roles can populate the doctor field without User Management list access.
   */
  const providers = useProviderList(iqTenantId, {
    enabled:
      enabled && requiresProvider && Boolean(departmentId) && Boolean(selectedDepartmentName),
    department: selectedDepartmentName ?? undefined,
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

  const doctorOptions = useMemo(() => {
    if (!departmentId) return [];
    const deptKey = selectedDepartmentName?.trim().toLowerCase();
    const active = providers.data ?? [];
    const matched =
      deptKey && deptKey.length > 0
        ? active.filter((p) => (p.department?.trim().toLowerCase() ?? '') === deptKey)
        : active;
    return (matched.length > 0 ? matched : active).map((p) => ({
      value: p.id,
      label: p.full_name,
    }));
  }, [departmentId, selectedDepartmentName, providers.data]);

  return {
    tariffTypeOptions,
    departmentOptions,
    doctorOptions,
    isLoadingPicklists: picklists.isPending,
    isLoadingDepartments: departments.isPending,
    isLoadingDoctors: providers.isPending,
    departmentsError: departments.isError,
    doctorsError: providers.isError,
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
