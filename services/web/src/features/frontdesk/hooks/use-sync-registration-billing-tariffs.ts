import { useEffect } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { CreateVisitRequestBody, VisitRegistrationBillingFeeLine } from '@/features/frontdesk/types';
import {
  emptyRegistrationBillingFeeLine,
  VISIT_TYPE_OPD_FIRST,
} from '@/features/frontdesk/utils/visit-registration-helpers';

type FeeLine = VisitRegistrationBillingFeeLine | null;

/** Hydrates billing fee rows from resolved tariff catalog rows. */
export function useSyncRegistrationBillingTariffs(
  watch: UseFormWatch<CreateVisitRequestBody>,
  setValue: UseFormSetValue<CreateVisitRequestBody>,
  registrationFeeLine: FeeLine,
  consultationFeeLine: FeeLine,
  hasProvider: boolean,
  visitTypeCode: string | undefined,
) {
  const isFirstVisit = visitTypeCode === VISIT_TYPE_OPD_FIRST;
  const currentRegDiscount = watch('billing.registration_fee.discount') ?? 0;
  const currentRegDiscountPct = watch('billing.registration_fee.discount_percent') ?? 0;
  const currentConsultDiscount = watch('billing.consultation_fee.discount') ?? 0;
  const currentConsultDiscountPct = watch('billing.consultation_fee.discount_percent') ?? 0;

  useEffect(() => {
    if (!isFirstVisit) {
      setValue('billing.registration_fee', emptyRegistrationBillingFeeLine(), {
        shouldDirty: true,
      });
      return;
    }
    if (!registrationFeeLine) return;
    setValue(
      'billing.registration_fee',
      {
        ...registrationFeeLine,
        discount: currentRegDiscount,
        discount_percent: currentRegDiscountPct,
      },
      { shouldDirty: true },
    );
  }, [
    isFirstVisit,
    registrationFeeLine,
    currentRegDiscount,
    currentRegDiscountPct,
    setValue,
  ]);

  useEffect(() => {
    if (!hasProvider) {
      setValue(
        'billing.consultation_fee',
        {
          unit_price: 0,
          tax_percent: 0,
          discount_percent: 0,
          discount: 0,
          item_code: '',
          service_name: '',
          department_id: undefined,
          consultation_type_id: undefined,
        },
        { shouldDirty: true },
      );
      return;
    }
    if (!consultationFeeLine) return;
    setValue(
      'billing.consultation_fee',
      {
        ...consultationFeeLine,
        discount: currentConsultDiscount,
        discount_percent: currentConsultDiscountPct,
      },
      { shouldDirty: true },
    );
  }, [consultationFeeLine, hasProvider, currentConsultDiscount, currentConsultDiscountPct, setValue]);
}
