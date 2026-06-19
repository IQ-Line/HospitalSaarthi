import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { configuratorKeys } from './query-keys';

const tenantsBase = '/api/configurator/v1/tenants';

export type TenantApiKeyStatus = 'active' | 'disabled' | 'revoked';
export type TenantApiKeyEnvironment = 'live' | 'test';
export type TenantApiKeyPurpose = 'opd_slip';

export interface TenantApiKey {
  api_key_id: string;
  iq_tenant_id: string;
  key_prefix: string;
  label: string | null;
  purpose: TenantApiKeyPurpose;
  environment: TenantApiKeyEnvironment;
  status: TenantApiKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface TenantApiKeyListResponse {
  data: TenantApiKey[];
  total: number;
}

export interface TenantApiKeyCreateResult extends TenantApiKey {
  secret: string;
}

export interface CreateTenantApiKeyInput {
  label?: string | null;
  environment: TenantApiKeyEnvironment;
}

export interface UpdateTenantApiKeyStatusInput {
  tenantId: string;
  apiKeyId: string;
  status: TenantApiKeyStatus;
}

export function useTenantApiKeys(tenantId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: configuratorKeys.tenantApiKeys(tenantId),
    queryFn: () =>
      apiClient<TenantApiKeyListResponse>(
        `${tenantsBase}/${tenantId}/api-keys`,
        { method: 'GET' },
        { tenantIdOverride: tenantId },
      ),
    enabled: (options?.enabled ?? true) && !!tenantId,
  });
}

export function useCreateTenantApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: CreateTenantApiKeyInput;
    }) =>
      apiClient<TenantApiKeyCreateResult>(
        `${tenantsBase}/${tenantId}/api-keys`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        { tenantIdOverride: tenantId },
      ),
    onSuccess: (_row, { tenantId }) => {
      void qc.invalidateQueries({ queryKey: configuratorKeys.tenantApiKeys(tenantId) });
    },
  });
}

export function useUpdateTenantApiKeyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, apiKeyId, status }: UpdateTenantApiKeyStatusInput) =>
      apiClient<TenantApiKey>(
        `${tenantsBase}/${tenantId}/api-keys/${apiKeyId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
        { tenantIdOverride: tenantId },
      ),
    onSuccess: (row, { tenantId }) => {
      qc.setQueryData<TenantApiKeyListResponse>(
        configuratorKeys.tenantApiKeys(tenantId),
        (prev) => {
          if (!prev) {
            return { data: [row], total: 1 };
          }
          const data = prev.data.map((entry) =>
            entry.api_key_id === row.api_key_id ? row : entry,
          );
          return { ...prev, data };
        },
      );
    },
  });
}
