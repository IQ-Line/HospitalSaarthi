import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { fetchOrganizations, organizationsQueryOptions } from './catalog';
import { configuratorKeys } from './query-keys';
import type {
  Organization,
  OrganizationCreateInput,
  OrganizationStatus,
  OrganizationType,
  OrganizationUpdateInput,
} from '../types';

const BASE = '/api/configurator/v1/organizations';

export { fetchOrganizations };

export function useOrganizations(
  filters: {
    status?: OrganizationStatus;
    type?: OrganizationType;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...organizationsQueryOptions(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useOrganization(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: configuratorKeys.organizationDetail(id),
    queryFn: () => apiClient<Organization>(`${BASE}/${id}`),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrganizationCreateInput) =>
      apiClient<Organization>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrganizationUpdateInput }) =>
      apiClient<Organization>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: configuratorKeys.organizationDetail(id) });
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}
