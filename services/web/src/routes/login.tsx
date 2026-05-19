import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { authClient } from '@/lib/auth-client';
import { getRolesFromAccessToken, isSuperAdminRole } from '@/lib/access-token';
import { apiClient } from '@/lib/api-client';
import { buildDevPermissionMap } from '@/lib/permissions-map';
import { DEV_TENANT_IQ_CATALOG_UUID } from '@/lib/catalog-tenant';
import { masterDataKeys } from '@/features/master-data/api/query-keys';
import type { NavModuleListResponse } from '@/features/master-data/types';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

const NAV_MODULES_PATH = '/api/v1/master-data/modules/nav';

const DEV_TENANT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';

const signInSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type SignInValues = z.infer<typeof signInSchema>;

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

async function fetchJwt(): Promise<string> {
  const { data, error } = await authClient.token();
  if (error || !data?.token) {
    throw new Error(`JWT fetch failed: ${error?.message ?? 'empty response'}`);
  }
  return data.token;
}

function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setTenant = useTenantStore((s) => s.setTenant);
  const setPermissions = usePermissionsStore((s) => s.setPermissions);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: '', password: '' },
  });

  async function handleSignIn(values: SignInValues) {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: values.username,
        password: values.password,
      });
      if (authError) {
        setError(authError.message ?? 'Sign-in failed');
        return;
      }
      const sessionToken = data?.token;
      if (!sessionToken || !data?.user) {
        setError('Unexpected response from server');
        return;
      }
      const jwt = await fetchJwt();
      setSession({
        accessToken: jwt,
        sessionToken,
        userId: data.user.id,
        displayName: data.user.name,
      });
      if (isSuperAdminRole(getRolesFromAccessToken(jwt))) {
        void queryClient.prefetchQuery({
          queryKey: masterDataKeys.navModules(),
          queryFn: () => apiClient<NavModuleListResponse>(NAV_MODULES_PATH),
        });
      }
      setTenant({
        tenantId: DEV_TENANT_ID,
        tenantName: 'Dev Hospital',
        branches: [{ id: 'branch-001', name: 'Main Campus' }],
        activeBranch: 'branch-001',
      });
      navigate({ to: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  const handleDevLogin = () => {
    setSession({
      accessToken: 'dev-token',
      sessionToken: 'dev-session',
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
      sessionToken: 'dev-session-tenant',
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
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">HIMS Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <form onSubmit={form.handleSubmit(handleSignIn)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. vishal@hospitalsaarthi.dev"
                  {...form.register('username')}
                />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 space-y-2 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Dev shortcuts</p>
              <Button type="button" variant="outline" className="w-full" onClick={handleDevLogin}>
                Dev Login (platform catalog)
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleTenantDevLogin}
              >
                Tenant dev login (tenant catalog)
              </Button>
              <p className="pt-1 text-xs text-muted-foreground">
                Dev shortcuts bypass better-auth. Real-login currently has a username/email field
                mismatch and a hardcoded tenantId (tracked as a follow-up to wire username-primary
                signin + JWT tenant claim).
              </p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
