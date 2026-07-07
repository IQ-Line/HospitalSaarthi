import { useMemo } from 'react';
import { useTariffServices } from '@/features/billing/api';
import { TARIFF_PICKLIST_REGISTRATION_FEE } from '@/features/billing/lib/tariff-type';
import { decodeDoctorTariffDescription } from '@/features/billing/lib/doctor-tariff-meta';
import type { TariffService } from '@/features/billing/types';
import {
  pickConsultationTariff,
  pickRegistrationTariff,
  tariffToBillingFeeLine,
} from '@/features/frontdesk/lib/resolve-registration-tariff';

const TARIFF_LIST_LIMIT = 200;

function mergeTariffRows(...groups: TariffService[][]): TariffService[] {
  const byId = new Map<string, TariffService>();
  for (const row of groups.flat()) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

export function useVisitRegistrationTariffs(
  departmentId: string | null,
  providerId: string | null,
) {
  const scopedDepartmentId = departmentId?.trim() || undefined;
  const scopedProviderId = providerId?.trim() || undefined;
  const hasConsultationScope = Boolean(scopedDepartmentId) || Boolean(scopedProviderId);

  const registrationQuery = useTariffServices(
    { is_active: true, limit: 50, category: TARIFF_PICKLIST_REGISTRATION_FEE },
    { enabled: true },
  );

  const consultationQuery = useTariffServices(
    {
      is_active: true,
      limit: TARIFF_LIST_LIMIT,
      department_id: scopedDepartmentId,
      provider_id: scopedProviderId,
    },
    { enabled: hasConsultationScope },
  );

  const catalog = useMemo(
    () =>
      mergeTariffRows(
        registrationQuery.data?.data ?? [],
        hasConsultationScope ? (consultationQuery.data?.data ?? []) : [],
      ),
    [hasConsultationScope, registrationQuery.data?.data, consultationQuery.data?.data],
  );

  const registrationTariff = useMemo(
    () => pickRegistrationTariff(catalog),
    [catalog],
  );

  const consultationTariff = useMemo(
    () => pickConsultationTariff(catalog, providerId, departmentId),
    [catalog, providerId, departmentId],
  );

  const registrationFeeLine = useMemo(
    () => (registrationTariff ? tariffToBillingFeeLine(registrationTariff) : null),
    [registrationTariff],
  );

  const consultationFeeLine = useMemo(
    () => (consultationTariff ? tariffToBillingFeeLine(consultationTariff) : null),
    [consultationTariff],
  );

  const consultationRoomNumber = useMemo(() => {
    if (!consultationTariff) return '';
    return decodeDoctorTariffDescription(consultationTariff.description).room_number.trim();
  }, [consultationTariff]);

  const isLoading =
    registrationQuery.isPending || (hasConsultationScope && consultationQuery.isPending);
  const isError = registrationQuery.isError || consultationQuery.isError;

  return {
    catalogQuery: hasConsultationScope ? consultationQuery : registrationQuery,
    registrationTariff,
    consultationTariff,
    registrationFeeLine,
    consultationFeeLine,
    consultationRoomNumber,
    isLoading,
    isError,
  };
}
