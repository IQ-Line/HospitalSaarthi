import { listRegistrations } from '@/features/frontdesk/api/registrations';

export interface RegistrationPatientSnapshot {
  abhaNumber: string | null;
  abhaAddress: string | null;
  uhid: string;
  fullName: string;
  phoneNumber: string;
}

/** Registration desk snapshot — ABHA may exist here before EMPI golden record is updated. */
export async function fetchRegistrationSnapshotByPatientIds(
  patientIds: string[],
): Promise<Map<string, RegistrationPatientSnapshot>> {
  const map = new Map<string, RegistrationPatientSnapshot>();
  const uniqueIds = [...new Set(patientIds.filter(Boolean))];
  if (uniqueIds.length === 0) return map;

  const results = await Promise.allSettled(
    uniqueIds.map(async (patientId) => {
      const page = await listRegistrations({ patient_id: patientId, limit: 1 });
      const row = page.data[0];
      if (!row) return null;
      return {
        patientId,
        snapshot: {
          abhaNumber: row.patient_abha_number?.trim() || null,
          abhaAddress: row.patient_abha_address?.trim() || null,
          uhid: row.patient_uhid,
          fullName: row.patient_full_name,
          phoneNumber: row.patient_phone_number,
        },
      };
    }),
  );

  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    map.set(result.value.patientId, result.value.snapshot);
  }

  return map;
}

export function resolvePatientAbhaNumber(
  empiAbha: string | null | undefined,
  snapshot?: RegistrationPatientSnapshot | null,
): string {
  const fromEmpi = empiAbha?.trim();
  if (fromEmpi) return fromEmpi;
  const fromSnapshot = snapshot?.abhaNumber?.trim();
  if (fromSnapshot) return fromSnapshot;
  return 'NA';
}
