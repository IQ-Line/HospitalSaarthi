import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Integration,
  IntegrationApiKey,
  IntegrationTypeCatalogEntry,
} from '../types';
import { integrationHubKeys } from './keys';

const BASE = '/api/integration-hub/v1';

export const IH_LIST_STALE_MS = 60_000;

export function integrationTypeCatalogOptions() {
  return queryOptions({
    queryKey: integrationHubKeys.integrationTypes(),
    queryFn: () =>
      apiClient<{ items: IntegrationTypeCatalogEntry[] }>(`${BASE}/integration-types`),
    staleTime: IH_LIST_STALE_MS,
  });
}

export function integrationListOptions() {
  return queryOptions({
    queryKey: integrationHubKeys.integrations(),
    queryFn: () => apiClient<{ items: Integration[] }>(`${BASE}/integrations`),
    staleTime: IH_LIST_STALE_MS,
  });
}

export function integrationDetailOptions(integrationId: string) {
  return queryOptions({
    queryKey: integrationHubKeys.integrationDetail(integrationId),
    queryFn: () => apiClient<Integration>(`${BASE}/integrations/${integrationId}`),
    staleTime: IH_LIST_STALE_MS,
  });
}

export function integrationApiKeysOptions(integrationId: string) {
  return queryOptions({
    queryKey: integrationHubKeys.apiKeys(integrationId),
    queryFn: () =>
      apiClient<{ items: IntegrationApiKey[] }>(
        `${BASE}/integrations/${integrationId}/api-keys`,
      ),
    staleTime: 30_000,
  });
}

export function useIntegrationListSuspense() {
  return useSuspenseQuery(integrationListOptions());
}

export function useIntegrationDetailSuspense(integrationId: string) {
  return useSuspenseQuery(integrationDetailOptions(integrationId));
}

export function useIntegrationApiKeysSuspense(integrationId: string) {
  return useSuspenseQuery(integrationApiKeysOptions(integrationId));
}
