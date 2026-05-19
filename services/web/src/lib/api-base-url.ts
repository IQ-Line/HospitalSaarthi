/**
 * Browser API base URL. The SPA must call `/api` on the same origin as the page
 * (Vite dev server proxies to the BFF). `VITE_API_BASE_URL` is only for SSR/tests.
 */
export function resolveBrowserApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const configured = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
  return configured || 'http://localhost:3000';
}
