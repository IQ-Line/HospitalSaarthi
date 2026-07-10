import type { UseFormReturn } from 'react-hook-form';
import type { RegistrationAbhaContext } from '@/features/frontdesk/components/registration-patient-section';
import type { CreateVisitRequestBody, RegistrationListItemResponse } from '@/features/frontdesk/types';
import { FOLLOW_UP_VISIT_TYPE_CODE } from '@/features/frontdesk/utils/visit-registration-helpers';

export type OpdRegistrationFollowUpState = {
  followUpFrom: RegistrationListItemResponse;
};

// Register the follow-up payload on router history state so `navigate({ state })` and
// `location.state` are typed. HistoryState originates in @tanstack/history (router-core
// augments it with its own optional fields); augmenting the same interface merges cleanly.
// The bare type-import anchors module resolution so the augmentation target is found.
import type {} from '@tanstack/history';

declare module '@tanstack/history' {
  interface HistoryState {
    followUpFrom?: RegistrationListItemResponse;
  }
}

export function applyFollowUpPrefill(
  row: RegistrationListItemResponse,
  form: UseFormReturn<CreateVisitRequestBody>,
  callbacks: {
    setExistingPatientId: (id: string) => void;
    setAbhaRegistration: (ctx: RegistrationAbhaContext | null) => void;
  },
): void {
  callbacks.setExistingPatientId(row.patient_id);
  const digits = (row.patient_phone_number ?? '').replace(/\D/g, '');
  const phone = digits.length >= 10 ? digits.slice(-10) : '';
  form.setValue('patient.phone', phone, { shouldValidate: true });
  form.setValue('patient.first_name', row.patient_full_name?.trim() ?? '', { shouldValidate: true });
  const genderRaw = (row.patient_gender ?? '').trim().toLowerCase();
  const gender =
    genderRaw === 'male' || genderRaw === 'm'
      ? 'male'
      : genderRaw === 'female' || genderRaw === 'f'
        ? 'female'
        : genderRaw === 'other'
          ? 'other'
          : '';
  if (gender) form.setValue('patient.gender', gender, { shouldValidate: true });
  if (row.patient_date_of_birth) {
    form.setValue('patient.date_of_birth', row.patient_date_of_birth);
  }
  const abhaNumber = row.patient_abha_number?.trim() ?? '';
  const abhaAddress = row.patient_abha_address?.trim() ?? '';
  form.setValue('patient.abha_number', abhaNumber);
  form.setValue('patient.abha_address', abhaAddress);
  form.setValue('appointment.visit_type_code', FOLLOW_UP_VISIT_TYPE_CODE);
  form.setValue('appointment.department_id', '');
  form.setValue('appointment.department_name', '');
  form.setValue('appointment.provider_id', '');
  callbacks.setAbhaRegistration(
    abhaNumber || abhaAddress ? { sessionId: '', abhaNumber, abhaAddress } : null,
  );
}
