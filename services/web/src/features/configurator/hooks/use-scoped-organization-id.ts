import { useEffect, useMemo } from 'react';
import { useOrganization, useTenant } from '@/features/configurator/api';
import { parseAccessJwtClaims } from '@/lib/jwt-claims';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

/**
 * Resolves the configurator organisation scope for the current session
 * (header picker → tenant store → active tenant row → JWT claim).
 */
export function useScopedOrganizationId(): {
  organizationId: string | undefined;
  organizationName: string | null;
  isResolving: boolean;
} {
  const accessToken = useAuthStore((s) => s.accessToken);
  const storeOrgId = useTenantStore((s) => s.organizationId);
  const storeOrgName = useTenantStore((s) => s.organizationName);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const setOrganizationScope = useTenantStore((s) => s.setOrganizationScope);

  const jwtOrgId = useMemo(
    () => parseAccessJwtClaims(accessToken).org_id?.trim() || undefined,
    [accessToken],
  );

  const { data: activeTenant, isLoading: tenantLoading } = useTenant(activeTenantId ?? '', {
    enabled: !!activeTenantId && !storeOrgId,
  });

  const resolvedOrgId = storeOrgId ?? activeTenant?.org_id ?? jwtOrgId;

  const { data: organization, isLoading: orgLoading } = useOrganization(resolvedOrgId ?? '', {
    enabled: !!resolvedOrgId && !storeOrgName,
  });

  useEffect(() => {
    if (!resolvedOrgId) return;
    const name = storeOrgName ?? organization?.name ?? null;
    if (storeOrgId === resolvedOrgId && storeOrgName === name) return;
    setOrganizationScope({ organizationId: resolvedOrgId, organizationName: name });
  }, [
    resolvedOrgId,
    storeOrgId,
    storeOrgName,
    organization?.name,
    setOrganizationScope,
  ]);

  return {
    organizationId: resolvedOrgId,
    organizationName: storeOrgName ?? organization?.name ?? null,
    isResolving:
      (!!activeTenantId && !storeOrgId && tenantLoading) ||
      (!!resolvedOrgId && !storeOrgName && orgLoading),
  };
}
