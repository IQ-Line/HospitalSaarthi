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
import { refreshAuthorizationContext } from '@/lib/authorization-context';
import { DEVELOPMENT_SIGN_IN_SHORTCUTS } from '@/lib/development-seed-users';
import { queryClient } from '@/lib/query-client';
import { applyTenantSessionFromAuth } from '@/lib/tenant-session';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
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
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function completeSignIn(
    sessionToken: string,
    user: { id: string; name: string; iq_tenant_id?: string },
  ) {
    const jwt = await fetchJwt();
    const authUser = user as { iq_tenant_id?: string };

    setSession({ accessToken: jwt, sessionToken, userId: user.id, displayName: user.name });

    await applyTenantSessionFromAuth({
      accessToken: jwt,
      authUserIqTenantId: authUser.iq_tenant_id ?? null,
    });

    await refreshAuthorizationContext(queryClient);
    navigate({ to: '/dashboard' });
  }

  async function handleSignIn(values: SignInValues) {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: values.email.trim().toLowerCase(),
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

      await completeSignIn(sessionToken, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedUserSignIn(email: string, password: string) {
    setError(null);
    setLoading(true);
    clearTenant();
    try {
      await handleSignIn({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  const showDevShortcuts = import.meta.env.DEV;

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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="e.g. platform@hospitalsaarthi.dev"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
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

          {showDevShortcuts ? (
            <div className="mt-6 space-y-2 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Development users (run <code className="text-[0.7rem]">make seed</code> or{' '}
                <code className="text-[0.7rem]">pnpm seed</code> first)
              </p>
              <div className="space-y-2">
                {DEVELOPMENT_SIGN_IN_SHORTCUTS.map((shortcut) => (
                  <Button
                    key={shortcut.email}
                    type="button"
                    variant="outline"
                    className="h-auto w-full flex-col items-start gap-0.5 py-2 text-left"
                    disabled={loading}
                    onClick={() => void handleSeedUserSignIn(shortcut.email, shortcut.password)}
                  >
                    <span className="font-medium">{shortcut.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {shortcut.description}
                    </span>
                  </Button>
                ))}
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Capabilities load from <code className="text-[0.7rem]">GET /auth/principal</code>{' '}
                after sign-in. Cerbos PDP remains authoritative on APIs.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
