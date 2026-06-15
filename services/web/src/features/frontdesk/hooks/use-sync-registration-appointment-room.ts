import { useEffect } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';

/** Sets appointment room from the resolved doctor consultation tariff for the selected department. */
export function useSyncRegistrationAppointmentRoom(
  departmentId: string | null,
  providerId: string | null,
  roomNumber: string,
  setValue: UseFormSetValue<CreateVisitRequestBody>,
) {
  useEffect(() => {
    const dept = departmentId?.trim() ?? '';
    const provider = providerId?.trim() ?? '';

    if (!dept || !provider) {
      setValue('appointment.room_number', '', { shouldDirty: true });
      return;
    }

    setValue('appointment.room_number', roomNumber, { shouldDirty: true });
  }, [departmentId, providerId, roomNumber, setValue]);
}
