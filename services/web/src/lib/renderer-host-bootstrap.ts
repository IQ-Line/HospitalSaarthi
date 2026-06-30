import {
  bootstrapRendererHost,
  resetRendererHostAuth,
} from 'iq-line-form-builder-renderer';
import { resolveBrowserApiBaseUrl } from '@/lib/api-base-url';
import {
  getBusinessApiOrigin,
  getFormWorkflowBuilderOrigin,
  getLcNcClientId,
  PAGE_BUILDER_CLIENT_ID,
} from '@/lib/lc-nc-config';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

export function getRendererAuthHeaders(): Record<string, string> {
  const { accessToken, userId } = useAuthStore.getState();
  const { tenantId } = useTenantStore.getState();
  const clientId = getLcNcClientId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (clientId) headers['x-client-id'] = clientId;
  if (userId) headers['x-user-id'] = userId;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (tenantId) {
    headers['iq_tenant_id'] = tenantId;
    headers['x-tenant-id'] = tenantId;
  }

  return headers;
}

export function bootstrapHimsRendererHost(): void {
  bootstrapRendererHost({
    formWorkflowBuilderOrigin: getFormWorkflowBuilderOrigin,
    businessApiOrigin: () => getBusinessApiOrigin() || resolveBrowserApiBaseUrl(),
    getAuthHeaders: getRendererAuthHeaders,
  });
}

export async function resetHimsRendererHostAuth(): Promise<void> {
  resetRendererHostAuth();
}
