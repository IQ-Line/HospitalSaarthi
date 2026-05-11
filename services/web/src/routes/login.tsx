import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@pulse/ui/button';
import { Card } from '@pulse/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setTenant = useTenantStore((s) => s.setTenant);

  const handleDevLogin = () => {
    // Dev-only mock login — tokens/ids should match what identity + Cerbos expect when user-management-svc is running.
    setSession({
      accessToken: 'dev-token',
      userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
      displayName: 'Dev User',
    });
    setTenant({
      tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      tenantName: 'Dev Hospital',
      branches: [{ id: 'branch-001', name: 'Main Campus' }],
      activeBranch: 'branch-001',
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
