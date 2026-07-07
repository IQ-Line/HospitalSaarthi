import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pulse/ui/dialog';
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
  const [forgotOpen, setForgotOpen] = useState(false);

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

    // better-auth cookie sessions issue no refresh token; '' disables the silent-refresh
    // path (all consumers guard with refreshToken?.trim()). FE cutover to POST /auth/login
    // is a later wave.
    setSession({
      accessToken: jwt,
      refreshToken: '',
      sessionToken,
      userId: user.id,
      displayName: user.name,
    });

    await applyTenantSessionFromAuth({
      accessToken: jwt,
      authUserIqTenantId: authUser.iq_tenant_id ?? null,
    });

    await refreshAuthorizationContext(queryClient);
    // must_change_password is enforced by the _authenticated layout guard.
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Password reset</DialogTitle>
                      <DialogDescription>
                        Contact your hospital administrator to reset your password. Recovery is
                        handled by your admin — not via email.
                      </DialogDescription>
                    </DialogHeader>
                    <Button type="button" className="w-full" onClick={() => setForgotOpen(false)}>
                      Back to login
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
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
