import { useMemo } from 'react';
import { useTariffServices } from '@/features/billing/api';
import {
  pickConsultationTariff,
  pickRegistrationTariff,
  tariffToBillingFeeLine,
} from '@/features/frontdesk/lib/resolve-registration-tariff';

const TARIFF_LIST_LIMIT = 200;

export function useVisitRegistrationTariffs(
  departmentName: string | null,
  providerId: string | null,
) {
  const catalogQuery = useTariffServices(
    { is_active: true, limit: TARIFF_LIST_LIMIT },
    { enabled: true },
  );

  const catalog = catalogQuery.data?.data ?? [];

  const registrationTariff = useMemo(
    () => pickRegistrationTariff(catalog),
    [catalog],
  );

  const consultationTariff = useMemo(
    () => pickConsultationTariff(catalog, providerId, departmentName),
    [catalog, providerId, departmentName],
  );

  const registrationFeeLine = useMemo(
    () => (registrationTariff ? tariffToBillingFeeLine(registrationTariff) : null),
    [registrationTariff],
  );

  const consultationFeeLine = useMemo(
    () => (consultationTariff ? tariffToBillingFeeLine(consultationTariff) : null),
    [consultationTariff],
  );

  return {
    catalogQuery,
    registrationTariff,
    consultationTariff,
    registrationFeeLine,
    consultationFeeLine,
    isLoading: catalogQuery.isPending,
    isError: catalogQuery.isError,
  };
}
