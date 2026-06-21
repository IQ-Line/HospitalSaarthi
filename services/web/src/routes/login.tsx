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
import { queryClient } from '@/lib/query-client';
import { applyTenantSessionFromAuth } from '@/lib/tenant-session';
import { useAuthStore } from '@/stores/auth.store';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: '', password: '' },
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
      const { data, error: authError } = await authClient.signIn.username({
        username: values.username.trim().toLowerCase(),
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
                placeholder="your.username"
                {...form.register('username')}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
