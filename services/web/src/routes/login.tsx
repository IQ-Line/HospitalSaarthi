import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@pulse/ui/button';
import { Card } from '@pulse/ui/card';
import { buildDevPermissionMap } from '@/lib/permissions-map';
import { DEV_TENANT_IQ_CATALOG_UUID } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

/** Dev tenant must be a real UUID — EMPI/Citus store `iq_tenant_id` as `uuid`; a slug breaks SQL params. */
const DEV_TENANT_IQ_ID = '550e8400-e29b-41d4-a716-446655440000';

function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setTenant = useTenantStore((s) => s.setTenant);
  const setPermissions = usePermissionsStore((s) => s.setPermissions);

  const handleDevLogin = () => {
    // Dev-only mock login — replaced by better-auth integration.
    // `tenantId` null ⇒ `iq_tenant_id` omitted ⇒ Visitpad reads/writes the **global** catalog.
    setSession({
      accessToken: 'dev-token',
      userId: 'dev-user-001',
      displayName: 'Dev User',
    });
    setTenant({
      tenantId: null,
      tenantName: 'Dev Hospital (platform catalog)',
      branches: [{ id: 'branch-001', name: 'Main Campus' }],
      activeBranch: 'branch-001',
    });
    setPermissions(buildDevPermissionMap('superadmin'));
    navigate({ to: '/dashboard' });
  };

  const handleTenantDevLogin = () => {
    setSession({
      accessToken: 'dev-token-tenant',
      userId: 'dev-tenant-admin-001',
      displayName: 'Tenant Admin',
    });
    setTenant({
      tenantId: DEV_TENANT_IQ_CATALOG_UUID,
      tenantName: 'Demo Tenant (catalog)',
      branches: [{ id: 'branch-001', name: 'Main Campus' }],
      activeBranch: 'branch-001',
    });
    setPermissions(buildDevPermissionMap('tenant-catalog-readonly'));
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <div className="space-y-3 px-6 pt-4 pb-2">
          <h1 className="mb-2 text-2xl font-semibold text-center">HIMS Platform</h1>
          <Button className="w-full" onClick={handleDevLogin}>
            Dev Login
          </Button>
          <Button className="w-full" variant="secondary" onClick={handleTenantDevLogin}>
            Tenant dev login
          </Button>
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Tenant login uses a static UUID so `iq_tenant_id` is sent — Visitpad lists tenant scope.
            Mock Visitpad catalog: read + import-from-library in the UI; Add / row edits / toggles hidden
            without write. Other modules stay full dev access. Replaced by better-auth in production.
          </p>
        </div>
      </Card>
    </div>
  );
}
