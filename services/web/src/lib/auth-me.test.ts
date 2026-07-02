import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthMeCache, fetchAuthMe } from '@/lib/auth-me';
import { useAuthStore } from '@/stores/auth.store';

const mockApiClient = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
}));

describe('fetchAuthMe', () => {
  afterEach(() => {
    clearAuthMeCache();
    useAuthStore.getState().clearSession();
    mockApiClient.mockReset();
  });

  it('deduplicates concurrent requests and caches the profile briefly', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      sessionToken: 'session',
      userId: 'user-1',
      displayName: 'Test User',
      mustChangePassword: null,
    });

    mockApiClient.mockResolvedValue({
      id: 'user-1',
      full_name: 'Test User',
      must_change_password: false,
    });

    const [first, second] = await Promise.all([fetchAuthMe(), fetchAuthMe()]);
    const third = await fetchAuthMe();

    expect(first).toEqual(second);
    expect(third).toEqual(first);
    expect(mockApiClient).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });
});
