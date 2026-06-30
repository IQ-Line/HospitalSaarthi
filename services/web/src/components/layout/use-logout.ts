import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { resetHimsRendererHostAuth } from '@/lib/renderer-host-bootstrap';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

export function useLogout() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch {
      // Best-effort — clear local state even if the API call fails.
    }
    clearSession();
    clearTenant();
    await resetHimsRendererHostAuth();
    navigate({ to: '/login' });
  }

  return { logout, loggingOut };
}
