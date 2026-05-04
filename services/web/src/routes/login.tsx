import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

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
      tenantId: 'tenant-001',
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
    });
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-surface-dim">
      <div className="w-full max-w-sm rounded-lg bg-surface p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-semibold text-center">HIMS Platform</h1>
        <button
          type="button"
          onClick={handleDevLogin}
          className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark transition-colors"
        >
          Dev Login
        </button>
        <p className="mt-4 text-center text-xs text-gray-400">
          better-auth integration replaces this in production
        </p>
      </div>
    </div>
  );
}
