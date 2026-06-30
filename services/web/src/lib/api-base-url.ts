/**
 * Browser API base URL. The SPA must call `/api` on the same origin as the page
 * (Vite dev server proxies to the BFF). `VITE_API_BASE_URL` is only for SSR/tests.
 */
export function resolveBrowserApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // eslint-disable-next-line sonarjs/slow-regex -- linear regex on bounded/trusted input; the flagged quantifiers cannot catastrophically backtrack (#50 verified)
  const configured = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
  return configured || 'http://localhost:3000';
}
