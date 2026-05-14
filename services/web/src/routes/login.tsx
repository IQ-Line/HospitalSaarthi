import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@pulse/ui/button';
import { Card } from '@pulse/ui/card';
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
    // Dev-only mock login — replaced by better-auth integration
    setSession({
      accessToken: 'dev-token',
      userId: 'dev-user-001',
      displayName: 'Dev User',
    });
    setTenant({
      tenantId: DEV_TENANT_IQ_ID,
      tenantName: 'Dev Hospital',
      branches: [{ id: 'branch-001', name: 'Main Campus' }],
      activeBranch: 'branch-001',
    });
    setPermissions({
      'user-management': {
        users: { read: true, write: true },
        roles: { read: true, write: true },
      },
      configurator: {
        tenants: { read: true, write: true },
        modules: { read: true, write: true },
      },
      empi: {
        registration: { read: true, write: true },
        search: { read: true, write: false },
      },
      'master-data': {
        reference: { read: true, write: true },
        overrides: { read: true, write: true },
      },
      frontdesk: {
        visits: { read: true, write: true },
      },
    });
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <div className="px-6 pt-4 pb-2">
          <h1 className="mb-6 text-2xl font-semibold text-center">HIMS Platform</h1>
          <Button className="w-full" onClick={handleDevLogin}>
            Dev Login
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            better-auth integration replaces this in production
          </p>
        </div>
      </Card>
    </div>
  );
}
