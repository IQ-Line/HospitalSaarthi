import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClientWithIqTenant } from '@/lib/api-client';
import { platformCatalogClient } from './platform-catalog-client';
import { masterDataKeys } from './query-keys';
import type {
  SystemRoleCreateInput,
  SystemRoleListResponse,
  SystemRoleSingleResponse,
  SystemRoleUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/system-roles';

function requireTenantIqId(iqTenantId: string | undefined): string {
  const tid = iqTenantId?.trim().toLowerCase() ?? '';
  if (!tid) {
    throw new Error(
      'iq_tenant_id is required for tenant_master system roles. Global catalog calls must use the platform system-roles page without a tenant scope.',
    );
  }
  return tid;
}

function systemRoleClient<T>(
  iqTenantId: string | undefined,
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (iqTenantId?.trim()) {
    return apiClientWithIqTenant<T>(requireTenantIqId(iqTenantId), path, options);
  }
  return platformCatalogClient<T>(path, options);
}

/** Tenant-scoped system role API — always targets ``tenant_master`` via ``iq_tenant_id``. */
function tenantSystemRoleClient<T>(
  iqTenantId: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiClientWithIqTenant<T>(requireTenantIqId(iqTenantId), path, options);
}

export function useSystemRoles(
  isTemplate?: boolean,
  options?: { enabled?: boolean; iqTenantId?: string },
) {
  const params = isTemplate === undefined ? '' : `?is_template=${isTemplate}`;
  const iqTenantId = options?.iqTenantId;
  return useQuery({
    queryKey: masterDataKeys.systemRoles(isTemplate, iqTenantId),
    queryFn: () =>
      systemRoleClient<SystemRoleListResponse>(iqTenantId, `${BASE}${params}`),
    enabled: options?.enabled ?? true,
  });
}

export function useSystemRole(id: string, iqTenantId?: string) {
  return useQuery({
    queryKey: masterDataKeys.systemRoleDetail(id),
    queryFn: () => systemRoleClient<SystemRoleSingleResponse>(iqTenantId, `${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateSystemRole(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SystemRoleCreateInput) =>
      systemRoleClient<SystemRoleSingleResponse>(iqTenantId, BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
    },
  });
}

/** PATCH — `{ id, input }` from dialogs and row toggles. */
export function useUpdateSystemRole(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SystemRoleUpdateInput }) =>
      systemRoleClient<SystemRoleSingleResponse>(iqTenantId, `${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result, { id }) => {
      qc.setQueryData(masterDataKeys.systemRoleDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
    },
  });
}

export function useDeleteSystemRole(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      systemRoleClient<SystemRoleSingleResponse>(iqTenantId, `${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
      qc.removeQueries({ queryKey: masterDataKeys.systemRoleDetail(id) });
    },
  });
}

export function useTenantSystemRoles(isTemplate: boolean | undefined, iqTenantId: string) {
  const params = isTemplate === undefined ? '' : `?is_template=${isTemplate}`;
  return useQuery({
    queryKey: masterDataKeys.systemRoles(isTemplate, iqTenantId),
    queryFn: () =>
      tenantSystemRoleClient<SystemRoleListResponse>(iqTenantId, `${BASE}${params}`),
    enabled: iqTenantId.trim().length > 0,
  });
}

export function useCreateTenantSystemRole(iqTenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SystemRoleCreateInput) =>
      tenantSystemRoleClient<SystemRoleSingleResponse>(iqTenantId, BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
    },
  });
}

export function useUpdateTenantSystemRole(iqTenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SystemRoleUpdateInput }) =>
      tenantSystemRoleClient<SystemRoleSingleResponse>(iqTenantId, `${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result, { id }) => {
      qc.setQueryData(masterDataKeys.systemRoleDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
    },
  });
}

export function useDeleteTenantSystemRole(iqTenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      tenantSystemRoleClient<SystemRoleSingleResponse>(iqTenantId, `${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
      qc.removeQueries({ queryKey: masterDataKeys.systemRoleDetail(id) });
    },
  });
}
