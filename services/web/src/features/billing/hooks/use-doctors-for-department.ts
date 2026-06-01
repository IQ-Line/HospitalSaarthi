import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProviderConsultationTariffs } from '@/features/billing/api/provider-consultation-tariffs';
import { billingKeys } from '@/features/billing/api/query-keys';
import { useProviderList } from '@/features/user-management/api/queries';

export type DoctorOption = { value: string; label: string };

/**
 * Doctors who consult in a department — billing consultation tariffs first,
 * then legacy UM `user.department` name match.
 */
export function useDoctorsForDepartment(
  departmentId: string | null | undefined,
  options?: {
    enabled?: boolean;
    /** Legacy UM filter by department display name when no billing rows exist. */
    departmentName?: string | null;
    iqTenantId?: string;
  },
) {
  const enabled = (options?.enabled ?? true) && Boolean(departmentId?.trim());
  const departmentName = options?.departmentName?.trim() ?? null;

  const consultationTariffs = useQuery({
    queryKey: billingKeys.providerConsultationTariffs({
      department_id: departmentId ?? undefined,
      tenant: options?.iqTenantId ?? 'session',
    }),
    queryFn: () =>
      listProviderConsultationTariffs(
        { department_id: departmentId! },
        options?.iqTenantId,
      ),
    enabled,
    staleTime: 30_000,
  });

  const providers = useProviderList(options?.iqTenantId ?? null, {
    enabled,
  });

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const provider of providers.data ?? []) {
      map.set(provider.id, provider.full_name);
    }
    return map;
  }, [providers.data]);

  const doctorOptions: DoctorOption[] = useMemo(() => {
    if (!departmentId?.trim()) return [];

    const fromBilling = new Map<string, string>();
    for (const row of consultationTariffs.data?.data ?? []) {
      if (!row.provider_id) continue;
      fromBilling.set(
        row.provider_id,
        providerNameById.get(row.provider_id) ?? row.service_name,
      );
    }
    if (fromBilling.size > 0) {
      return [...fromBilling.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label }));
    }

    const deptKey = departmentName?.toLowerCase();
    const active = providers.data ?? [];
    const matched =
      deptKey && deptKey.length > 0
        ? active.filter((p) => (p.department?.trim().toLowerCase() ?? '') === deptKey)
        : active;
    return matched.map((p) => ({ value: p.id, label: p.full_name }));
  }, [
    departmentId,
    consultationTariffs.data?.data,
    providerNameById,
    departmentName,
    providers.data,
  ]);

  return {
    doctorOptions,
    isLoading: providers.isPending || consultationTariffs.isPending,
    isError: providers.isError || consultationTariffs.isError,
  };
}
