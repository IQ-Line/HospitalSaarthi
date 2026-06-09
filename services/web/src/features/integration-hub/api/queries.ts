import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Integration,
  IntegrationApiKey,
  IntegrationTypeCatalogResponse,
} from '../types';
import { integrationHubKeys } from './keys';

const BASE = '/api/integration-hub/v1';

export const IH_LIST_STALE_MS = 60_000;

function tenantCtx(tenantId: string) {
  return { tenantIdOverride: tenantId.trim() };
}

export function integrationTypeCatalogOptions() {
  return queryOptions({
    queryKey: integrationHubKeys.integrationTypes(),
    queryFn: () =>
      apiClient<IntegrationTypeCatalogResponse>(
        `${BASE}/integration-types`,
        { method: 'GET' },
        { tenantIdOverride: null },
      ),
    staleTime: IH_LIST_STALE_MS,
  });
}

export function integrationListOptions(tenantId: string) {
  return queryOptions({
    queryKey: integrationHubKeys.integrations(tenantId),
    queryFn: () =>
      apiClient<{ items: Integration[] }>(
        `${BASE}/integrations`,
        { method: 'GET' },
        tenantCtx(tenantId),
      ),
    staleTime: IH_LIST_STALE_MS,
  });
}

export function integrationDetailOptions(tenantId: string, integrationId: string) {
  return queryOptions({
    queryKey: integrationHubKeys.integrationDetail(tenantId, integrationId),
    queryFn: () =>
      apiClient<Integration>(
        `${BASE}/integrations/${integrationId}`,
        { method: 'GET' },
        tenantCtx(tenantId),
      ),
    staleTime: IH_LIST_STALE_MS,
  });
}

export function integrationApiKeysOptions(tenantId: string, integrationId: string) {
  return queryOptions({
    queryKey: integrationHubKeys.apiKeys(tenantId, integrationId),
    queryFn: () =>
      apiClient<{ items: IntegrationApiKey[] }>(
        `${BASE}/integrations/${integrationId}/api-keys`,
        { method: 'GET' },
        tenantCtx(tenantId),
      ),
    staleTime: 30_000,
  });
}

export function useIntegrationListSuspense(tenantId: string) {
  return useSuspenseQuery(integrationListOptions(tenantId));
}

export function useIntegrationDetailSuspense(tenantId: string, integrationId: string) {
  return useSuspenseQuery(integrationDetailOptions(tenantId, integrationId));
}

export function useIntegrationApiKeysSuspense(tenantId: string, integrationId: string) {
  return useSuspenseQuery(integrationApiKeysOptions(tenantId, integrationId));
}
