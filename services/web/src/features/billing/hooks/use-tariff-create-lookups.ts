import { useMemo } from 'react';
import { useDepartments, usePicklistValues } from '@/features/master-data/api';
import { useUserList } from '@/features/user-management/api/queries';
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
    enabled: enabled && requiresProvider,
    iqTenantId,
  });
  /** `GET /api/user-management/users` — loaded after department is chosen. */
  const users = useUserList(iqTenantId, {
    enabled: enabled && requiresProvider && Boolean(departmentId),
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

  const selectedDepartmentName = useMemo(
    () => departmentOptions.find((d) => d.value === departmentId)?.label ?? null,
    [departmentId, departmentOptions],
  );

  const doctorOptions = useMemo(() => {
    if (!departmentId) return [];
    const deptKey = selectedDepartmentName?.trim().toLowerCase();
    const active = (users.data ?? []).filter((u) => u.status === 'active');
    const matched =
      deptKey && deptKey.length > 0
        ? active.filter((u) => (u.department?.trim().toLowerCase() ?? '') === deptKey)
        : active;
    return (matched.length > 0 ? matched : active).map((u) => ({
      value: u.id,
      label: u.full_name,
    }));
  }, [departmentId, selectedDepartmentName, users.data]);

  return {
    tariffTypeOptions,
    departmentOptions,
    doctorOptions,
    isLoadingPicklists: picklists.isPending,
    isLoadingDepartments: departments.isPending,
    isLoadingDoctors: users.isPending,
    departmentsError: departments.isError,
    doctorsError: users.isError,
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
