import { useEffect } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';

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
  const currentRegDiscount = watch('billing.registration_fee.discount') ?? 0;
  const currentRegDiscountPct = watch('billing.registration_fee.discount_percent') ?? 0;
  const currentConsultDiscount = watch('billing.consultation_fee.discount') ?? 0;
  const currentConsultDiscountPct = watch('billing.consultation_fee.discount_percent') ?? 0;

  useEffect(() => {
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
  }, [registrationFeeLine, currentRegDiscount, currentRegDiscountPct, setValue]);

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
        discount: currentConsultDiscount,
        discount_percent: currentConsultDiscountPct,
      },
      { shouldDirty: true },
    );
  }, [consultationFeeLine, hasProvider, waiveConsultationFee, currentConsultDiscount, currentConsultDiscountPct, setValue]);
}
