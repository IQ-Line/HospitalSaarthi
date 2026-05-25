import type { ApiClientContext } from '@/lib/api-client-context';
import { apiClient } from '@/lib/api-client';

/** Omit tenant headers so Master Data serves `global_master` (platform catalog). */
export const PLATFORM_CATALOG_CONTEXT: ApiClientContext = { tenantIdOverride: null };

export function platformCatalogClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClient<T>(path, options, PLATFORM_CATALOG_CONTEXT);
}
