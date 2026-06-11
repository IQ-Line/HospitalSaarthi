import { apiClient } from '@/lib/api-client';
import type { UmUser } from '@/features/user-management/types';

const UM_BASE = '/api/user-management';

let doctorLookupCache: Map<string, string> | null = null;
let doctorLookupPromise: Promise<Map<string, string>> | null = null;

function formatDoctorName(user: UmUser): string {
  const name = user.full_name?.trim();
  if (!name) return '—';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}

/** Resolve doctor_id → display name from user-management (cached per session). */
export async function fetchDoctorLookupMap(): Promise<Map<string, string>> {
  if (doctorLookupCache) return doctorLookupCache;
  if (doctorLookupPromise) return doctorLookupPromise;

  doctorLookupPromise = (async () => {
    try {
      const users = await apiClient<UmUser[]>(`${UM_BASE}/users`);
      const map = new Map<string, string>();
      for (const user of users) {
        map.set(user.id, formatDoctorName(user));
      }
      doctorLookupCache = map;
      return map;
    } catch {
      return new Map<string, string>();
    } finally {
      doctorLookupPromise = null;
    }
  })();

  return doctorLookupPromise;
}

export function resolveDoctorName(
  doctorId: string | null | undefined,
  lookup: Map<string, string>,
): string {
  const id = doctorId?.trim();
  if (!id) return '—';
  return lookup.get(id) ?? '—';
}
