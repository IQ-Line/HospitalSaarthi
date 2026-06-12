import { useEffect } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';
import { roundBillingAmount } from '@/features/frontdesk/utils/visit-registration-helpers';

type FeeLine = {
  unit_price: number;
  tax_percent: number;
  discount_percent: number;
  discount: number;
  item_code: string;
  service_name: string;
} | null;

/** Hydrates billing fee rows from resolved tariff catalog rows. */
export function useSyncRegistrationBillingTariffs(
  watch: UseFormWatch<CreateVisitRequestBody>,
  setValue: UseFormSetValue<CreateVisitRequestBody>,
  registrationFeeLine: FeeLine,
  consultationFeeLine: FeeLine,
  hasProvider: boolean,
  waiveConsultationFee = false,
) {
  const currentRegDiscountPct = watch('billing.registration_fee.discount_percent') ?? 0;
  const currentConsultDiscountPct = watch('billing.consultation_fee.discount_percent') ?? 0;

  useEffect(() => {
    if (!registrationFeeLine) return;
    setValue(
      'billing.registration_fee',
      {
        ...registrationFeeLine,
        discount_percent: currentRegDiscountPct,
        discount:
          currentRegDiscountPct > 0
            ? roundBillingAmount(registrationFeeLine.unit_price * currentRegDiscountPct / 100)
            : 0,
      },
      { shouldDirty: true },
    );
  }, [registrationFeeLine, currentRegDiscountPct, setValue]);

  useEffect(() => {
    if (!hasProvider || waiveConsultationFee) {
      setValue(
        'billing.consultation_fee',
        {
          unit_price: 0,
          tax_percent: 0,
          discount_percent: 0,
          discount: 0,
          item_code: '',
          service_name: '',
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
        discount_percent: currentConsultDiscountPct,
        discount:
          currentConsultDiscountPct > 0
            ? roundBillingAmount(consultationFeeLine.unit_price * currentConsultDiscountPct / 100)
            : 0,
      },
      { shouldDirty: true },
    );
  }, [consultationFeeLine, hasProvider, waiveConsultationFee, currentConsultDiscountPct, setValue]);
}
