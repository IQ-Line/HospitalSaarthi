import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { refreshAccessToken } from '@/lib/auth-session';
import { configuratorKeys } from './query-keys';

const ENDPOINT = '/api/configurator/v1/tenant-onboarding';

export interface TenantOnboardingInput {
  organization: {
    name: string;
    slug: string;
    type: string;
    metadata?: Record<string, unknown> | null;
  };
  plan: {
    slug: string;
    trial_end_date?: string | null;
    max_users_override?: number | null;
    max_branches_override?: number | null;
  };
  modules: Array<{ module_id: string; is_active: boolean }>;
  admin: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string | null;
    username?: string | null;
  };
}

export interface TenantOnboardingResult {
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  tenant: {
    iq_tenant_id: string;
    org_id: string;
    name: string;
    slug: string;
    provisioning_status: string;
  };
  tenant_modules: Array<{
    iq_tenant_id: string;
    module_id: string;
    is_active: boolean;
  }>;
  admin_role: {
    id: string;
    code: string;
    display_name: string;
    is_system: boolean;
  };
  admin_user: {
    id: string;
    email: string;
    full_name: string;
  };
  provisioning_status: 'completed';
  correlation_id: string;
}

export function useProvisionTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TenantOnboardingInput) => {
      await refreshAccessToken();
      return apiClient<TenantOnboardingResult>(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}
