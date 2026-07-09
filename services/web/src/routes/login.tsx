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
import { completeInteractiveLogin, loginWithCredentials } from '@/lib/auth-session';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

const signInSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or username is required')
    .superRefine((value, ctx) => {
      if (value.includes('@') && !z.string().email().safeParse(value).success) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid email' });
      }
    }),
  password: z.string().min(1, 'Password is required'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

function resolveLoginErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const body = JSON.parse(raw) as { message?: string; code?: string };
    if (body.code === 'AUTH_INVALID_CREDENTIALS') {
      return 'Invalid email/username or password';
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    /* not JSON */
  }
  return raw || 'Sign-in failed';
}

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: '', password: '' },
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

    // Fresh entitlement after sign-in (avoids stale UM TTL cache when master-data just recovered).
    await refreshAuthorizationContext(queryClient, { bypassEntitlementCache: true });

    const profile = await fetchAuthMe();
    if (profile.must_change_password === true) {
      navigate({ to: '/change-password' });
      return;
    }

    navigate({ to: '/dashboard' });
  }

  async function handleSignIn(values: SignInValues) {
    setError(null);
    setLoading(true);
    try {
      const login = await loginWithCredentials({
        identifier: values.identifier,
        password: values.password,
      });
      await completeInteractiveLogin(queryClient, login);
      navigate({
        to: login.user.must_change_password === true ? '/change-password' : '/dashboard',
      });
    } catch (err) {
      setError(resolveLoginErrorMessage(err));
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
              <Label htmlFor="identifier">Email or username</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="platform or you@hospital.org"
                {...form.register('identifier')}
              />
              {form.formState.errors.identifier && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.identifier.message}
                </p>
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
