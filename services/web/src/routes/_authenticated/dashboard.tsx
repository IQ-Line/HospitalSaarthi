import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { useCapability } from '@/hooks/use-capability';
import { authClient } from '@/lib/auth-client';
import { NavigationModuleDiscovery } from '@/features/dashboard/components/navigation-module-discovery';
import { UM_USER_READ } from '@/lib/runtime-capability-keys';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const displayName = useAuthStore((s) => s.displayName);
  const capabilityCount = usePermissionsStore((s) => s.capabilityKeys.size);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const capabilitiesUnavailable = isLoaded && capabilityCount === 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="text-sm text-muted-foreground">{displayName}</span>
          )}
          <LogoutButton />
        </div>
      </div>
      <p className="text-gray-600">
        HIMS Platform is running. Module pages appear in the sidebar when your principal holds the
        required capability keys.
      </p>
      <UserListCapabilityHint capabilitiesUnavailable={capabilitiesUnavailable} />
      <NavigationModuleDiscovery />
    </div>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const clearPermissions = usePermissionsStore((s) => s.clearPermissions);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch {
      // Best-effort
    }
    clearSession();
    clearTenant();
    clearPermissions();
    navigate({ to: '/login' });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
      <LogOut className="size-3.5" />
      {loggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
}

function UserListCapabilityHint({
  capabilitiesUnavailable,
}: {
  capabilitiesUnavailable: boolean;
}) {
  const umUserRead = useCapability(UM_USER_READ);
  if (capabilitiesUnavailable) {
    return (
      <p className="mt-4 text-sm text-muted-foreground" data-testid="capabilities-unavailable">
        Principal capabilities are being retried. APIs still enforce Cerbos while the shell
        refreshes.
      </p>
    );
  }

  return (
    <p className="mt-4 text-sm text-muted-foreground" data-testid="um-user-read-result">
      Shell capability <span className="font-medium">{UM_USER_READ}</span>:{' '}
      <span className="font-medium">{umUserRead ? 'granted' : 'denied'}</span>
      {' — '}APIs remain authoritative via Cerbos PDP.
    </p>
  );
}
