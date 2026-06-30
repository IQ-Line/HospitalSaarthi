import { useMemo } from 'react';
import { useTariffServices } from '@/features/billing/api';
import { isConsultationCategory } from '@/features/frontdesk/lib/resolve-registration-tariff';
import { useDepartments } from '@/features/master-data/api';
import { useProviderList } from '@/features/user-management/api/queries';

type DoctorOption = { value: string; label: string };

/**
 * Doctors for a department: billing consultation tariffs (department_id) first,
 * plus legacy UM users whose single `department` name matches.
 */
export function useDoctorsForDepartment(
  departmentId: string | null,
  options?: { enabled?: boolean; iqTenantId?: string; /** Tariff Master create: show all doctors when none linked yet. */ includeAllWhenEmpty?: boolean },
) {
  const enabled = (options?.enabled ?? true) && Boolean(departmentId);

  const departments = useDepartments(undefined, {
    formCatalog: true,
    enabled,
    iqTenantId: options?.iqTenantId,
  });

  const selectedDepartmentName = useMemo(
    () => (departments.data?.data ?? []).find((d) => d.id === departmentId)?.name ?? null,
    [departmentId, departments.data?.data],
  );

  const tariffs = useTariffServices(
    { department_id: departmentId ?? undefined, is_active: true, limit: 200 },
    { enabled, iqTenantId: options?.iqTenantId },
  );

  const providers = useProviderList(options?.iqTenantId, {
    enabled,
    department_id: departmentId ?? undefined,
  });

  const doctorOptions = useMemo((): DoctorOption[] => {
    if (!departmentId) return [];

    const namesById = new Map(
      (providers.data ?? []).map((p) => [p.id, p.full_name] as const),
    );
    const ids = new Set<string>();
    const deptKey = selectedDepartmentName?.trim().toLowerCase() ?? '';

    for (const row of tariffs.data?.data ?? []) {
      if (row.department_id !== departmentId || !row.provider_id) continue;
      if (!isConsultationCategory(row.category)) continue;
      ids.add(row.provider_id);
    }

    for (const p of providers.data ?? []) {
      if (deptKey && (p.department?.trim().toLowerCase() ?? '') === deptKey) {
        ids.add(p.id);
      }
    }

    if (ids.size === 0 && options?.includeAllWhenEmpty) {
      for (const p of providers.data ?? []) ids.add(p.id);
    }

    return [...ids]
      .map((id) => ({ value: id, label: namesById.get(id) ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [departmentId, providers.data, selectedDepartmentName, tariffs.data?.data]);

  return {
    doctorOptions,
    selectedDepartmentName,
    isLoading: departments.isPending || tariffs.isPending || providers.isPending,
    isError: departments.isError || tariffs.isError || providers.isError,
  };
}
