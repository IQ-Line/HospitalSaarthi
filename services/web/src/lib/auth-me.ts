import { apiClient } from '@/lib/api-client';
import type { UmUser } from '@/features/user-management/types';

const AUTH_ME_PATH = '/api/user-management/auth/me';

export async function fetchAuthMe(): Promise<UmUser> {
  return apiClient<UmUser>(AUTH_ME_PATH, { method: 'GET' });
}

export async function completePasswordChange(): Promise<UmUser> {
  return apiClient<UmUser>('/api/user-management/auth/change-password-complete', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
