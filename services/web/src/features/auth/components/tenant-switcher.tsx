import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useConfiguratorOrgTenantCatalog } from '@/features/configurator/api/catalog';
import { OrgTenantPicker } from '@/features/configurator/components/org-tenant-picker';
import { refreshAuthorizationContext } from '@/lib/authorization-context';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

export function TenantSwitcher() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const homeTenantId = useTenantStore((s) => s.homeTenantId);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const switchActiveTenant = useTenantStore((s) => s.switchActiveTenant);
  const qc = useQueryClient();

  const isSuperAdmin = isPlatformSuperAdminFromAccessToken(accessToken);
  const catalogQuery = useConfiguratorOrgTenantCatalog(undefined, { enabled: isSuperAdmin });

  const tenants = catalogQuery.data?.tenants ?? [];
  const initialOrgId = useMemo(() => {
    if (!activeTenantId) {
      return '';
    }
    return tenants.find((t) => t.iq_tenant_id === activeTenantId)?.org_id ?? '';
  }, [activeTenantId, tenants]);

  const [organizationId, setOrganizationId] = useState(initialOrgId);

  useEffect(() => {
    if (initialOrgId && initialOrgId !== organizationId) {
      setOrganizationId(initialOrgId);
    }
  }, [initialOrgId, organizationId]);

  if (!isSuperAdmin || !homeTenantId || !activeTenantId) {
    return null;
  }

  const handleTenantChange = (tenantId: string, tenantName: string) => {
    switchActiveTenant({ tenantId, tenantName });
    void refreshAuthorizationContext(qc);
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Building2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 max-w-[min(100%,520px)] [&_label]:sr-only [&_.grid]:gap-1.5 [&_button]:h-8 [&_button]:text-xs">
        <OrgTenantPicker
          organizationId={organizationId || initialOrgId}
          tenantId={activeTenantId}
          onOrganizationChange={setOrganizationId}
          onTenantChange={handleTenantChange}
          organizationLabel="Organization"
          tenantLabel="Tenant"
          disabled={catalogQuery.isPending}
        />
      </div>
    </div>
  );
}
