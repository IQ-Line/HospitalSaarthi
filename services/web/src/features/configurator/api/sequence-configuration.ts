import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { configuratorKeys } from './query-keys';
import type { IdentifierType, SequenceFormatSegment } from '../sequence-format';

const BASE = '/api/configurator/v1';

export interface SequenceIdentifierSummary {
  is_custom: boolean;
  format_code: string;
}

export interface SequenceConfigurationSummary {
  iq_tenant_id: string;
  tenant_name: string;
  tenant_numeric_code: string | null;
  provisioning_status: string;
  status: 'default' | 'configured';
  custom_count: number;
  identifiers: Record<IdentifierType, SequenceIdentifierSummary>;
}

export interface SequenceConfigurationListResponse {
  data: SequenceConfigurationSummary[];
  total: number;
}

export interface SequenceIdentifierConfig {
  identifier_type: IdentifierType;
  is_custom: boolean;
  format_code: string;
  segments: SequenceFormatSegment[];
}

export interface SequenceConfigurationDetail {
  iq_tenant_id: string;
  tenant_name: string;
  tenant_numeric_code: string | null;
  status: 'default' | 'configured';
  configured_at: string | null;
  identifiers: SequenceIdentifierConfig[];
}

export interface SequenceIdentifierUpsertInput {
  is_custom: boolean;
  segments?: SequenceFormatSegment[];
}

export function sequenceConfigurationsQueryOptions(filters?: {
  org_id?: string;
  provisioning_status?: string;
  status?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.org_id) params.set('org_id', filters.org_id);
  if (filters?.provisioning_status) params.set('provisioning_status', filters.provisioning_status);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.q) params.set('q', filters.q);
  const qs = params.toString();
  const path = qs ? `${BASE}/sequence-configurations?${qs}` : `${BASE}/sequence-configurations`;

  return {
    queryKey: [...configuratorKeys.all, 'sequence-configurations', filters ?? {}] as const,
    queryFn: () =>
      apiClient<SequenceConfigurationListResponse>(path, { method: 'GET' }, { tenantIdOverride: null }),
  };
}

export function sequenceConfigurationDetailQueryOptions(tenantId: string) {
  return {
    queryKey: [...configuratorKeys.all, 'sequence-configuration', tenantId] as const,
    queryFn: () =>
      apiClient<SequenceConfigurationDetail>(
        `${BASE}/tenants/${tenantId}/sequence-configuration`,
        { method: 'GET' },
        { tenantIdOverride: tenantId },
      ),
    enabled: !!tenantId,
  };
}

export function useSequenceConfigurations(
  filters?: Parameters<typeof sequenceConfigurationsQueryOptions>[0],
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...sequenceConfigurationsQueryOptions(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useSequenceConfigurationDetail(tenantId: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...sequenceConfigurationDetailQueryOptions(tenantId),
    enabled: (options?.enabled ?? true) && !!tenantId,
  });
}

export function useUpsertSequenceIdentifier(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      identifierType,
      body,
    }: {
      identifierType: IdentifierType;
      body: SequenceIdentifierUpsertInput;
    }) =>
      apiClient<SequenceIdentifierConfig>(
        `${BASE}/tenants/${tenantId}/sequence-configuration/identifiers/${identifierType}`,
        { method: 'PUT', body: JSON.stringify(body) },
        { tenantIdOverride: tenantId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}
