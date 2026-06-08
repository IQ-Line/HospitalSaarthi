import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  CreateIntegrationBody,
  Integration,
  IssuedIntegrationApiKey,
} from '../types';
import { integrationHubKeys } from './keys';

const BASE = '/api/integration-hub/v1';

function tenantCtx(tenantId: string) {
  return { tenantIdOverride: tenantId.trim() };
}

function invalidateIntegration(
  qc: ReturnType<typeof useQueryClient>,
  tenantId: string,
  id: string,
) {
  qc.invalidateQueries({ queryKey: integrationHubKeys.integrations(tenantId) }).catch(() => {});
  qc.invalidateQueries({ queryKey: integrationHubKeys.integrationDetail(tenantId, id) }).catch(
    () => {},
  );
}

export function useCreateIntegration(tenantId: string) {
  const qc = useQueryClient();
  const ctx = tenantCtx(tenantId);
  return useMutation({
    mutationFn: (body: CreateIntegrationBody) =>
      apiClient<Integration>(
        `${BASE}/integrations`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        ctx,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationHubKeys.integrations(tenantId) }).catch(
        () => {},
      );
    },
  });
}

export function useActivateIntegration(tenantId: string) {
  const qc = useQueryClient();
  const ctx = tenantCtx(tenantId);
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<Integration>(
        `${BASE}/integrations/${integrationId}/activate`,
        { method: 'POST' },
        ctx,
      ),
    onSuccess: (_data, id) => invalidateIntegration(qc, tenantId, id),
  });
}

export function useDisableIntegration(tenantId: string) {
  const qc = useQueryClient();
  const ctx = tenantCtx(tenantId);
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<Integration>(
        `${BASE}/integrations/${integrationId}/disable`,
        { method: 'POST' },
        ctx,
      ),
    onSuccess: (_data, id) => invalidateIntegration(qc, tenantId, id),
  });
}

export function useReactivateIntegration(tenantId: string) {
  const qc = useQueryClient();
  const ctx = tenantCtx(tenantId);
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<Integration>(
        `${BASE}/integrations/${integrationId}/reactivate`,
        { method: 'POST' },
        ctx,
      ),
    onSuccess: (_data, id) => invalidateIntegration(qc, tenantId, id),
  });
}

export function useDeleteIntegration(tenantId: string) {
  const qc = useQueryClient();
  const ctx = tenantCtx(tenantId);
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<void>(
        `${BASE}/integrations/${integrationId}`,
        { method: 'DELETE' },
        ctx,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationHubKeys.integrations(tenantId) }).catch(
        () => {},
      );
    },
  });
}

export function useIssueApiKey(tenantId: string) {
  const qc = useQueryClient();
  const ctx = tenantCtx(tenantId);
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiClient<IssuedIntegrationApiKey>(
        `${BASE}/integrations/${integrationId}/api-keys`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        ctx,
      ),
    onSuccess: (_data, integrationId) => {
      qc.invalidateQueries({
        queryKey: integrationHubKeys.apiKeys(tenantId, integrationId),
      }).catch(() => {});
    },
  });
}

export function useRevokeApiKey(tenantId: string) {
  const qc = useQueryClient();
  const ctx = tenantCtx(tenantId);
  return useMutation({
    mutationFn: (input: { integrationId: string; apiKeyId: string }) =>
      apiClient(
        `${BASE}/integrations/${input.integrationId}/api-keys/${input.apiKeyId}/revoke`,
        { method: 'POST' },
        ctx,
      ),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: integrationHubKeys.apiKeys(tenantId, input.integrationId),
      }).catch(() => {});
    },
  });
}
