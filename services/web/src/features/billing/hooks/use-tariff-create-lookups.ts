import { useMemo } from 'react';
import { useDepartments, usePicklistValues } from '@/features/master-data/api';
import { useUserList } from '@/features/user-management/api/queries';
import {
  picklistValueToTariffType,
  TARIFF_TYPE_PICKLIST_SLUG,
  type TariffFormType,
} from '../lib/tariff-type';

/** Same department API as visit registration (`GET /api/v1/master-data/departments`). */
export function useTariffCreateLookups(
  enabled: boolean,
  tariffType: TariffFormType,
  departmentId: string | null,
  iqTenantId?: string,
) {
  const picklists = usePicklistValues(TARIFF_TYPE_PICKLIST_SLUG, enabled);
  const departments = useDepartments(undefined, {
    enabled: enabled && tariffType === 'opd',
    iqTenantId,
  });
  /** `GET /api/user-management/users` — loaded after department is chosen. */
  const users = useUserList(iqTenantId, {
    enabled: enabled && tariffType === 'opd' && Boolean(departmentId),
  });

  const tariffTypeOptions = useMemo(() => {
    const labels: Record<TariffFormType, string> = { registration: 'Registration', opd: 'OPD' };
    return (picklists.data ?? []).map((row) => {
      const value = picklistValueToTariffType(row.value);
      return { value, label: labels[value] ?? row.label };
    });
  }, [picklists.data]);

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
