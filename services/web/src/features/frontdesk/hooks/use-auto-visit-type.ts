import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchEmpiPatientByDeskPhone } from '@/features/frontdesk/api/empi-patients';
import {
  isValidVisitRegistrationPhone,
  resolveOpdVisitTypeCode,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export function useAutoVisitType(phone: string | undefined) {
  const trimmed = (phone ?? '').trim();
  const phoneValid = isValidVisitRegistrationPhone(trimmed);
  const debouncedPhone = useDebouncedValue(trimmed, 400);

  const lookup = useQuery({
    queryKey: ['empi', 'patients', 'desk-phone', debouncedPhone],
    queryFn: () => searchEmpiPatientByDeskPhone(debouncedPhone),
    enabled: isValidVisitRegistrationPhone(debouncedPhone),
    staleTime: 60_000,
  });

  const isExistingPatient = (lookup.data?.total ?? 0) > 0;

  const visitTypeCode = useMemo(() => {
    if (!phoneValid) return null;
    if (lookup.isPending) return null;
    if (lookup.isError) return resolveOpdVisitTypeCode(false);
    return resolveOpdVisitTypeCode(isExistingPatient);
  }, [phoneValid, lookup.isPending, lookup.isError, isExistingPatient]);

  return {
    visitTypeCode,
    isLoading: phoneValid && lookup.isPending,
    isExistingPatient: lookup.isSuccess ? isExistingPatient : null,
  };
}
