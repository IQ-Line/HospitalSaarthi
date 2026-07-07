import { apiClient } from '@/lib/api-client';
import type { UmUser } from '@/features/user-management/types';
import { useAuthStore } from '@/stores/auth.store';

const AUTH_ME_PATH = '/api/user-management/auth/me';
const AUTH_ME_CACHE_MS = 60_000;

type AuthMeCacheEntry = {
  userId: string;
  profile: UmUser;
  fetchedAt: number;
};

let authMeCache: AuthMeCacheEntry | null = null;
let authMeInflight: Promise<UmUser> | null = null;

export function clearAuthMeCache(): void {
  authMeCache = null;
  authMeInflight = null;
}

function syncMustChangePasswordFromProfile(profile: UmUser): void {
  useAuthStore.getState().setMustChangePassword(profile.must_change_password === true);
}

export async function fetchAuthMe(options?: { force?: boolean }): Promise<UmUser> {
  const userId = useAuthStore.getState().userId?.trim();
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const now = Date.now();
  if (
    options?.force !== true &&
    authMeCache !== null &&
    authMeCache.userId === userId &&
    now - authMeCache.fetchedAt < AUTH_ME_CACHE_MS
  ) {
    return authMeCache.profile;
  }

  if (options?.force !== true && authMeInflight !== null) {
    return authMeInflight;
  }

  authMeInflight = apiClient<UmUser>(AUTH_ME_PATH, { method: 'GET' })
    .then((profile) => {
      authMeCache = { userId, profile, fetchedAt: Date.now() };
      syncMustChangePasswordFromProfile(profile);
      return profile;
    })
    .finally(() => {
      authMeInflight = null;
    });

  return authMeInflight;
}

export async function completePasswordChange(): Promise<UmUser> {
  const profile = await apiClient<UmUser>('/api/user-management/auth/change-password-complete', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  clearAuthMeCache();
  syncMustChangePasswordFromProfile(profile);
  authMeCache = {
    userId: useAuthStore.getState().userId?.trim() ?? profile.id,
    profile,
    fetchedAt: Date.now(),
  };
  return profile;
}
