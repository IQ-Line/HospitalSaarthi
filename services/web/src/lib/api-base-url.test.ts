import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveBrowserApiBaseUrl } from './api-base-url';

describe('resolveBrowserApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the page origin in the browser (Vite proxies /api to BFF)', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000');
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:5173' },
    } as Window);

    expect(resolveBrowserApiBaseUrl()).toBe('http://localhost:5173');
  });

  it('uses VITE_API_BASE_URL when window is unavailable', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000');
    expect(resolveBrowserApiBaseUrl()).toBe('http://localhost:3000');
  });
});
