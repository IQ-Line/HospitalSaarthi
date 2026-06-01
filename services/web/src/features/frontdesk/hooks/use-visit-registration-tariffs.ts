import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTariffServices } from '@/features/billing/api';
import { billingKeys } from '@/features/billing/api/query-keys';
import { listProviderConsultationTariffs } from '@/features/billing/api/provider-consultation-tariffs';
import { fetchActiveRegistrationTariff } from '@/features/frontdesk/api/registration-tariff';
import {
  pickConsultationTariff,
  tariffToBillingFeeLine,
} from '@/features/frontdesk/lib/resolve-registration-tariff';

const TARIFF_LIST_LIMIT = 200;

function providerConsultationToFeeLine(row: {
  base_price: string;
  tax_percentage: string;
  service_code: string;
  service_name: string;
  department_id: string | null;
  consultation_type_id: string | null;
}) {
  return {
    unit_price: Number(row.base_price) || 0,
    tax_percent: Number(row.tax_percentage) || 0,
    discount_percent: 0,
    discount: 0,
    item_code: row.service_code,
    service_name: row.service_name,
    department_id: row.department_id ?? undefined,
    consultation_type_id: row.consultation_type_id ?? undefined,
  };
}

export function useVisitRegistrationTariffs(
  departmentId: string | null,
  departmentName: string | null,
  providerId: string | null,
) {
  const catalogQuery = useTariffServices(
    { is_active: true, limit: TARIFF_LIST_LIMIT },
    { enabled: true },
  );

  const registrationQuery = useQuery({
    queryKey: [...billingKeys.servicesRoot(), 'registration-rack', 'session'],
    queryFn: () => fetchActiveRegistrationTariff(),
    staleTime: 30_000,
  });

  const catalog = catalogQuery.data?.data ?? [];

  const providerConsultationQuery = useQuery({
    queryKey: billingKeys.providerConsultationTariffs({
      provider_id: providerId ?? undefined,
      department_id: departmentId ?? undefined,
    }),
    queryFn: () =>
      listProviderConsultationTariffs({
        provider_id: providerId!,
        department_id: departmentId!,
      }),
    enabled: Boolean(providerId?.trim() && departmentId?.trim()),
    staleTime: 30_000,
  });

  const registrationTariff = registrationQuery.data ?? null;

  const consultationTariff = useMemo(
    () => pickConsultationTariff(catalog, providerId, departmentName),
    [catalog, providerId, departmentName],
  );

  const providerConsultationRow = providerConsultationQuery.data?.data[0] ?? null;

  const registrationFeeLine = useMemo(
    () => (registrationTariff ? tariffToBillingFeeLine(registrationTariff) : null),
    [registrationTariff],
  );

  const consultationFeeLine = useMemo(() => {
    if (providerConsultationRow) {
      return providerConsultationToFeeLine(providerConsultationRow);
    }
    return consultationTariff ? tariffToBillingFeeLine(consultationTariff) : null;
  }, [providerConsultationRow, consultationTariff]);

  return {
    catalogQuery,
    registrationTariff,
    consultationTariff,
    registrationFeeLine,
    consultationFeeLine,
    isLoading:
      catalogQuery.isPending || registrationQuery.isPending || providerConsultationQuery.isPending,
    isError:
      catalogQuery.isError || registrationQuery.isError || providerConsultationQuery.isError,
  };
}
