import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  CreateIntegrationBody,
  Integration,
  IssuedIntegrationApiKey,
} from '../types';
import { integrationHubKeys } from './keys';

const BASE = '/api/integration-hub/v1';

function invalidateIntegration(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: integrationHubKeys.integrations() }).catch(() => {});
  qc.invalidateQueries({ queryKey: integrationHubKeys.integrationDetail(id) }).catch(() => {});
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateIntegrationBody) =>
      apiClient<Integration>(`${BASE}/integrations`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationHubKeys.integrations() }).catch(() => {});
    },
  });
}

export function useActivateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<Integration>(`${BASE}/integrations/${integrationId}/activate`, {
        method: 'POST',
      }),
    onSuccess: (_data, id) => invalidateIntegration(qc, id),
  });
}

export function useDisableIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<Integration>(`${BASE}/integrations/${integrationId}/disable`, {
        method: 'POST',
      }),
    onSuccess: (_data, id) => invalidateIntegration(qc, id),
  });
}

export function useReactivateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<Integration>(`${BASE}/integrations/${integrationId}/reactivate`, {
        method: 'POST',
      }),
    onSuccess: (_data, id) => invalidateIntegration(qc, id),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<void>(`${BASE}/integrations/${integrationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationHubKeys.integrations() }).catch(() => {});
    },
  });
}

export function useIssueApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<IssuedIntegrationApiKey>(`${BASE}/integrations/${integrationId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (_data, integrationId) => {
      qc.invalidateQueries({ queryKey: integrationHubKeys.apiKeys(integrationId) }).catch(
        () => {},
      );
    },
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { integrationId: string; apiKeyId: string }) =>
      apiClient(`${BASE}/integrations/${input.integrationId}/api-keys/${input.apiKeyId}/revoke`, {
        method: 'POST',
      }),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: integrationHubKeys.apiKeys(input.integrationId) }).catch(
        () => {},
      );
    },
  });
}
